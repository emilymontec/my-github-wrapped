import { afterEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "@/lib/notifications/email";
import type { EmailContent } from "@/lib/notifications/templates";

const content: EmailContent = {
  subject: "Asunto de prueba",
  html: "<p>hola</p>",
  text: "hola"
};

describe("sendEmail", () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.MAILGUN_API_KEY;
  const originalDomain = process.env.MAILGUN_DOMAIN;
  const originalFrom = process.env.MAILGUN_FROM_EMAIL;
  const originalBaseUrl = process.env.MAILGUN_BASE_URL;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.MAILGUN_API_KEY = originalApiKey;
    process.env.MAILGUN_DOMAIN = originalDomain;
    process.env.MAILGUN_FROM_EMAIL = originalFrom;
    process.env.MAILGUN_BASE_URL = originalBaseUrl;
    vi.clearAllMocks();
  });

  it("no llama a fetch y devuelve not_configured si falta MAILGUN_API_KEY", async () => {
    delete process.env.MAILGUN_API_KEY;
    process.env.MAILGUN_DOMAIN = "mg.example.com";
    process.env.MAILGUN_FROM_EMAIL = "wrapped@example.com";
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await sendEmail("user@example.com", content);

    expect(result).toEqual({ sent: false, reason: "not_configured" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("no llama a fetch y devuelve not_configured si falta MAILGUN_DOMAIN", async () => {
    process.env.MAILGUN_API_KEY = "test-key";
    delete process.env.MAILGUN_DOMAIN;
    process.env.MAILGUN_FROM_EMAIL = "wrapped@example.com";
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await sendEmail("user@example.com", content);

    expect(result).toEqual({ sent: false, reason: "not_configured" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("no llama a fetch y devuelve not_configured si falta MAILGUN_FROM_EMAIL", async () => {
    process.env.MAILGUN_API_KEY = "test-key";
    process.env.MAILGUN_DOMAIN = "mg.example.com";
    delete process.env.MAILGUN_FROM_EMAIL;
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await sendEmail("user@example.com", content);

    expect(result).toEqual({ sent: false, reason: "not_configured" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("envía el email a la API de Mailgun (Basic Auth + form-urlencoded) cuando la config está completa", async () => {
    process.env.MAILGUN_API_KEY = "test-key";
    process.env.MAILGUN_DOMAIN = "mg.example.com";
    process.env.MAILGUN_FROM_EMAIL = "wrapped@example.com";
    delete process.env.MAILGUN_BASE_URL;
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await sendEmail("user@example.com", content);

    expect(result).toEqual({ sent: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.mailgun.net/v3/mg.example.com/messages");
    expect(options.headers.Authorization).toBe(
      `Basic ${Buffer.from("api:test-key").toString("base64")}`
    );
    expect(options.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    const body = new URLSearchParams(options.body as unknown as string);
    expect(body.get("from")).toBe("wrapped@example.com");
    expect(body.get("to")).toBe("user@example.com");
    expect(body.get("subject")).toBe(content.subject);
  });

  it("respeta MAILGUN_BASE_URL para cuentas de la región EU", async () => {
    process.env.MAILGUN_API_KEY = "test-key";
    process.env.MAILGUN_DOMAIN = "mg.example.com";
    process.env.MAILGUN_FROM_EMAIL = "wrapped@example.com";
    process.env.MAILGUN_BASE_URL = "https://api.eu.mailgun.net";
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchSpy as unknown as typeof fetch;

    await sendEmail("user@example.com", content);

    const [url] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.eu.mailgun.net/v3/mg.example.com/messages");
  });

  it("devuelve provider_error si Mailgun responde con un status no-ok", async () => {
    process.env.MAILGUN_API_KEY = "test-key";
    process.env.MAILGUN_DOMAIN = "mg.example.com";
    process.env.MAILGUN_FROM_EMAIL = "wrapped@example.com";
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 422 }) as unknown as typeof fetch;

    const result = await sendEmail("user@example.com", content);

    expect(result).toEqual({ sent: false, reason: "provider_error" });
  });

  it("devuelve provider_error si fetch lanza (falla de red)", async () => {
    process.env.MAILGUN_API_KEY = "test-key";
    process.env.MAILGUN_DOMAIN = "mg.example.com";
    process.env.MAILGUN_FROM_EMAIL = "wrapped@example.com";
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    const result = await sendEmail("user@example.com", content);

    expect(result).toEqual({ sent: false, reason: "provider_error" });
  });
});
