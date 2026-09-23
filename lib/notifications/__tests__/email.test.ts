import { afterEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "@/lib/notifications/email";
import type { EmailContent } from "@/lib/notifications/templates";

const content: EmailContent = {
  subject: "Asunto de prueba",
  html: "<p>hola</p>",
  text: "hola"
};

function mailjetResponse(overrides: Partial<{ ok: boolean; status: number; body: unknown }> = {}) {
  const { ok = true, status = 200, body = { Messages: [{ Status: "success" }] } } = overrides;
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body)
  };
}

describe("sendEmail", () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.MJ_APIKEY_PUBLIC;
  const originalApiSecret = process.env.MJ_APIKEY_PRIVATE;
  const originalFrom = process.env.MAILJET_FROM_EMAIL;
  const originalFromName = process.env.MAILJET_FROM_NAME;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.MJ_APIKEY_PUBLIC = originalApiKey;
    process.env.MJ_APIKEY_PRIVATE = originalApiSecret;
    process.env.MAILJET_FROM_EMAIL = originalFrom;
    process.env.MAILJET_FROM_NAME = originalFromName;
    vi.clearAllMocks();
  });

  it("no llama a fetch y devuelve not_configured si falta MJ_APIKEY_PUBLIC", async () => {
    delete process.env.MJ_APIKEY_PUBLIC;
    process.env.MJ_APIKEY_PRIVATE = "test-secret";
    process.env.MAILJET_FROM_EMAIL = "wrapped@example.com";
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await sendEmail("user@example.com", content);

    expect(result).toEqual({ sent: false, reason: "not_configured" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("no llama a fetch y devuelve not_configured si falta MJ_APIKEY_PRIVATE", async () => {
    process.env.MJ_APIKEY_PUBLIC = "test-key";
    delete process.env.MJ_APIKEY_PRIVATE;
    process.env.MAILJET_FROM_EMAIL = "wrapped@example.com";
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await sendEmail("user@example.com", content);

    expect(result).toEqual({ sent: false, reason: "not_configured" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("no llama a fetch y devuelve not_configured si falta MAILJET_FROM_EMAIL", async () => {
    process.env.MJ_APIKEY_PUBLIC = "test-key";
    process.env.MJ_APIKEY_PRIVATE = "test-secret";
    delete process.env.MAILJET_FROM_EMAIL;
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await sendEmail("user@example.com", content);

    expect(result).toEqual({ sent: false, reason: "not_configured" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("envía el email a la API de Mailjet (Basic Auth pública:privada + JSON) cuando la config está completa", async () => {
    process.env.MJ_APIKEY_PUBLIC = "test-key";
    process.env.MJ_APIKEY_PRIVATE = "test-secret";
    process.env.MAILJET_FROM_EMAIL = "wrapped@example.com";
    delete process.env.MAILJET_FROM_NAME;
    const fetchSpy = vi.fn().mockResolvedValue(mailjetResponse());
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await sendEmail("user@example.com", content);

    expect(result).toEqual({ sent: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.mailjet.com/v3.1/send");
    expect(options.headers.Authorization).toBe(
      `Basic ${Buffer.from("test-key:test-secret").toString("base64")}`
    );
    expect(options.headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(options.body as string);
    expect(body.Messages[0].From).toEqual({ Email: "wrapped@example.com", Name: "GitHub Wrapped" });
    expect(body.Messages[0].To).toEqual([{ Email: "user@example.com" }]);
    expect(body.Messages[0].Subject).toBe(content.subject);
    expect(body.Messages[0].HTMLPart).toBe(content.html);
    expect(body.Messages[0].TextPart).toBe(content.text);
  });

  it("respeta MAILJET_FROM_NAME cuando está configurado", async () => {
    process.env.MJ_APIKEY_PUBLIC = "test-key";
    process.env.MJ_APIKEY_PRIVATE = "test-secret";
    process.env.MAILJET_FROM_EMAIL = "wrapped@example.com";
    process.env.MAILJET_FROM_NAME = "Mi Wrapped";
    const fetchSpy = vi.fn().mockResolvedValue(mailjetResponse());
    global.fetch = fetchSpy as unknown as typeof fetch;

    await sendEmail("user@example.com", content);

    const [, options] = fetchSpy.mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body.Messages[0].From.Name).toBe("Mi Wrapped");
  });

  it("devuelve provider_error si Mailjet responde con un status HTTP no-ok", async () => {
    process.env.MJ_APIKEY_PUBLIC = "test-key";
    process.env.MJ_APIKEY_PRIVATE = "test-secret";
    process.env.MAILJET_FROM_EMAIL = "wrapped@example.com";
    global.fetch = vi.fn().mockResolvedValue(mailjetResponse({ ok: false, status: 401 })) as unknown as typeof fetch;

    const result = await sendEmail("user@example.com", content);

    expect(result).toEqual({ sent: false, reason: "provider_error" });
  });

  it("devuelve provider_error si Mailjet responde 200 pero el mensaje individual falló", async () => {
    process.env.MJ_APIKEY_PUBLIC = "test-key";
    process.env.MJ_APIKEY_PRIVATE = "test-secret";
    process.env.MAILJET_FROM_EMAIL = "wrapped@example.com";
    global.fetch = vi.fn().mockResolvedValue(
      mailjetResponse({
        body: { Messages: [{ Status: "error", Errors: [{ ErrorMessage: "dominio del remitente no verificado" }] }] }
      })
    ) as unknown as typeof fetch;

    const result = await sendEmail("user@example.com", content);

    expect(result).toEqual({ sent: false, reason: "provider_error" });
  });

  it("devuelve provider_error si fetch lanza (falla de red)", async () => {
    process.env.MJ_APIKEY_PUBLIC = "test-key";
    process.env.MJ_APIKEY_PRIVATE = "test-secret";
    process.env.MAILJET_FROM_EMAIL = "wrapped@example.com";
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    const result = await sendEmail("user@example.com", content);

    expect(result).toEqual({ sent: false, reason: "provider_error" });
  });
});
