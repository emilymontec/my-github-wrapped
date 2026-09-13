import { test, expect, request as playwrightRequest } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

/**
 * ⚠️ Tests a nivel API (`request`, sin `page`) -- no necesitan un
 * navegador en absoluto, solo el servidor de Next.js corriendo. Cubren
 * las garantías de Fase 10 (rate limiting, ownership) contra el
 * comportamiento HTTP real, no contra `enforceRateLimit` mockeado como
 * en `lib/ratelimit/__tests__/respond.test.ts`.
 */

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

async function createDisposableSession(): Promise<{ userId: string; cookieHeader: string; cleanup: () => Promise<void> }> {
  const prisma = new PrismaClient();
  const userId = `e2e-disposable-${Date.now()}`;
  const sessionToken = `e2e-disposable-token-${Date.now()}`;
  const username = `e2e-disposable-${Date.now()}`;

  await prisma.user.create({
    data: {
      id: userId,
      username,
      githubId: `disposable-${Date.now()}`,
      email: `${username}@example.com`,
      sessions: { create: { sessionToken, expires: new Date(Date.now() + 1000 * 60 * 60) } }
    }
  });

  const isSecure = BASE_URL.startsWith("https://");
  const cookieName = isSecure ? "__Secure-authjs.session-token" : "authjs.session-token";

  return {
    userId,
    cookieHeader: `${cookieName}=${sessionToken}`,
    cleanup: async () => {
      await prisma.user.deleteMany({ where: { id: userId } }).catch(() => {});
      await prisma.$disconnect();
    }
  };
}

test.describe("Seguridad — rate limiting (Fase 10)", () => {
  test("POST /sync devuelve 429 con Retry-After después del límite configurado", async () => {
    const session = await createDisposableSession();
    const api = await playwrightRequest.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { cookie: session.cookieHeader }
    });

    try {
      // lib/ratelimit/index.ts::RATE_LIMITS.sync = 5 por hora.
      let lastStatus = 0;
      for (let i = 0; i < 6; i++) {
        const res = await api.post("/sync", { data: { mode: "incremental" } });
        lastStatus = res.status();
        if (lastStatus === 429) {
          expect(res.headers()["retry-after"]).toBeTruthy();
          break;
        }
      }
      expect(lastStatus).toBe(429);
    } finally {
      await api.dispose();
      await session.cleanup();
    }
  });
});

test.describe("Seguridad — ownership (auditoría de permisos, Fase 10)", () => {
  test("no se puede leer el export de otro usuario ni con su ID exacto", async () => {
    const owner = await createDisposableSession();
    const attacker = await createDisposableSession();

    const ownerApi = await playwrightRequest.newContext({ baseURL: BASE_URL, extraHTTPHeaders: { cookie: owner.cookieHeader } });
    const attackerApi = await playwrightRequest.newContext({ baseURL: BASE_URL, extraHTTPHeaders: { cookie: attacker.cookieHeader } });

    try {
      const created = await ownerApi.post("/account/export");
      expect(created.ok()).toBe(true);
      const { id } = await created.json();

      // El dueño puede consultarlo (aunque todavía esté QUEUED, el 404
      // no debería pasar para su propio recurso).
      const ownRead = await ownerApi.get(`/account/export/${id}/download`);
      expect(ownRead.status()).not.toBe(404);

      // El atacante, con el MISMO id exacto, nunca debería poder leerlo.
      const attackerRead = await attackerApi.get(`/account/export/${id}/download`);
      expect(attackerRead.status()).toBe(404);
    } finally {
      await ownerApi.dispose();
      await attackerApi.dispose();
      await owner.cleanup();
      await attacker.cleanup();
    }
  });

  test("un DELETE /account sin confirmUsername (o con uno incorrecto) nunca borra la cuenta", async () => {
    const session = await createDisposableSession();
    const api = await playwrightRequest.newContext({ baseURL: BASE_URL, extraHTTPHeaders: { cookie: session.cookieHeader } });

    try {
      const emptyBody = await api.delete("/account", { data: {} });
      expect(emptyBody.status()).toBe(400);

      const wrongUsername = await api.delete("/account", { data: { confirmUsername: "no-soy-yo" } });
      expect(wrongUsername.status()).toBe(400);

      // La sesión sigue viva -- un endpoint autenticado cualquiera debería
      // seguir respondiendo 200, no 401.
      const stillAuthenticated = await api.get("/account/export");
      expect(stillAuthenticated.ok()).toBe(true);
    } finally {
      await api.dispose();
      await session.cleanup();
    }
  });
});

test.describe("Seguridad — borrado de cuenta real (Fase 10, usuario 100% descartable)", () => {
  test("DELETE /account con confirmUsername correcto borra la cuenta e invalida la sesión", async () => {
    const prisma = new PrismaClient();
    const userId = `e2e-delete-me-${Date.now()}`;
    const username = `e2e-delete-me-${Date.now()}`;
    const sessionToken = `e2e-delete-me-token-${Date.now()}`;

    await prisma.user.create({
      data: {
        id: userId,
        username,
        githubId: `delete-me-${Date.now()}`,
        sessions: { create: { sessionToken, expires: new Date(Date.now() + 1000 * 60 * 60) } }
      }
    });

    const isSecure = BASE_URL.startsWith("https://");
    const cookieName = isSecure ? "__Secure-authjs.session-token" : "authjs.session-token";
    const api = await playwrightRequest.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: { cookie: `${cookieName}=${sessionToken}` }
    });

    try {
      const res = await api.delete("/account", { data: { confirmUsername: username } });
      expect(res.ok()).toBe(true);

      // La Session ya cayó en la cascada (lib/account/delete.ts) -- la
      // misma cookie ahora no debería autenticar nada.
      const afterDelete = await api.get("/account/export");
      expect(afterDelete.status()).toBe(401);

      const stillInDb = await prisma.user.findUnique({ where: { id: userId } });
      expect(stillInDb).toBeNull();
    } finally {
      await api.dispose();
      await prisma.user.deleteMany({ where: { id: userId } }).catch(() => {});
      await prisma.$disconnect();
    }
  });
});
