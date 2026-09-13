import { describe, expect, it, beforeAll, afterAll, afterEach, vi } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { Octokit } from "@octokit/rest";
import { withRetry, getAuthenticatedUser, getVerifiedEmails } from "@/lib/github/client";

/**
 * ⚠️ Estos son tests de INTEGRACIÓN, no unitarios (ver "Convenciones de
 * desarrollo" en ROADMAP.md: "Tests de integración con mocking de HTTP
 * (msw) — nunca contra la API real de GitHub en CI"). La diferencia con
 * mockear `withRetry` o el cliente de Octokit directamente (`vi.fn`) es
 * que acá el 403/429 es una respuesta HTTP real que viaja por `fetch` de
 * verdad y que Octokit parsea de verdad (incluyendo sus headers) — lo
 * que se verifica es el comportamiento observable end-to-end de la capa
 * de retry contra el protocolo real, no solo que "la función que
 * decidimos llamar se haya llamado".
 *
 * Esta suite no existía desde que el proyecto declaró esta convención en
 * fases tempranas -- `msw` estaba en package.json sin usarse en ningún
 * lado. La lógica de retry en sí (`lib/github/client.ts::withRetry`) es
 * exactamente el código más importante de probar así, porque es la
 * única parte del proyecto que le habla directo a la red de un tercero.
 */

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function client() {
  return new Octokit({ auth: "fake-token-for-tests" });
}

describe("withRetry — integración vía msw", () => {
  it("reintenta tras un 403 (rate limit) y devuelve el resultado del segundo intento", async () => {
    let calls = 0;
    server.use(
      http.get("https://api.github.com/user", () => {
        calls += 1;
        if (calls === 1) {
          return HttpResponse.json({ message: "rate limited" }, { status: 403 });
        }
        return HttpResponse.json({ id: 1, login: "emilydev", avatar_url: "", name: null, email: null });
      })
    );

    const result = await getAuthenticatedUser(client());

    expect(calls).toBe(2);
    expect(result.login).toBe("emilydev");
  });

  it("reintenta tras un 429 (too many requests)", async () => {
    let calls = 0;
    server.use(
      http.get("https://api.github.com/user/emails", () => {
        calls += 1;
        if (calls === 1) {
          return HttpResponse.json({ message: "too many requests" }, { status: 429 });
        }
        return HttpResponse.json([{ email: "emily@example.com", verified: true, primary: true }]);
      })
    );

    const result = await getVerifiedEmails(client());

    expect(calls).toBe(2);
    expect(result).toEqual(["emily@example.com"]);
  });

  it("respeta el header Retry-After cuando GitHub lo manda, en vez del backoff exponencial", async () => {
    vi.useFakeTimers();
    try {
      let calls = 0;
      server.use(
        http.get("https://api.github.com/user", () => {
          calls += 1;
          if (calls === 1) {
            return HttpResponse.json(
              { message: "rate limited" },
              { status: 403, headers: { "retry-after": "3" } }
            );
          }
          return HttpResponse.json({ id: 1, login: "emilydev", avatar_url: "", name: null, email: null });
        })
      );

      const promise = getAuthenticatedUser(client());

      // Antes de los 3s indicados por Retry-After, no debería haber
      // reintentado todavía.
      await vi.advanceTimersByTimeAsync(2900);
      expect(calls).toBe(1);

      await vi.advanceTimersByTimeAsync(200);
      const result = await promise;

      expect(calls).toBe(2);
      expect(result.login).toBe("emilydev");
    } finally {
      vi.useRealTimers();
    }
  });

  it("no reintenta ante errores que no son 403/429 (ej. 404, 500)", async () => {
    let calls = 0;
    server.use(
      http.get("https://api.github.com/user", () => {
        calls += 1;
        return HttpResponse.json({ message: "server error" }, { status: 500 });
      })
    );

    await expect(getAuthenticatedUser(client())).rejects.toMatchObject({ status: 500 });
    expect(calls).toBe(1);
  });

  it("se rinde después de MAX_RETRIES intentos si el 403 nunca cede", async () => {
    vi.useFakeTimers();
    try {
      let calls = 0;
      server.use(
        http.get("https://api.github.com/user", () => {
          calls += 1;
          return HttpResponse.json({ message: "still limited" }, { status: 403 });
        })
      );

      const promise = getAuthenticatedUser(client()).catch((e) => e);
      // Backoff exponencial: 1s, 2s, 4s, 8s, 16s aprox + jitter -- avanzar
      // de sobra para agotar los 5 reintentos.
      await vi.advanceTimersByTimeAsync(60_000);
      const result = await promise;

      expect(result).toMatchObject({ status: 403 });
      expect(calls).toBe(6); // intento original + 5 reintentos
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("withRetry — función pura envuelta (sin Octokit)", () => {
  it("propaga el valor de retorno cuando no hace falta reintentar", async () => {
    const result = await withRetry(async () => "ok");
    expect(result).toBe("ok");
  });

  it("propaga errores sin status inmediatamente, sin reintentar", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    await expect(withRetry(fn)).rejects.toThrow("boom");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
