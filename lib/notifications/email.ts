import type { EmailContent } from "@/lib/notifications/templates";

/**
 * ⚠️ Mismo patrón que `lib/insights/narrate.ts::callHuggingFace`: `fetch`
 * directo a la API REST del proveedor (Mailgun), sin agregar un SDK como
 * dependencia nueva -- esto es una sola llamada HTTP, y mantenerlo como
 * `fetch` puro es lo que permite mockearlo en tests exactamente igual
 * que ya se mockea la llamada a Hugging Face, sin duplicar
 * infraestructura de testing.
 *
 * Igual que `HUGGINGFACE_API_KEY`, la config de Mailgun es opcional: sin
 * ella, el envío de emails cae a un no-op documentado (se loguea
 * localmente y se devuelve `sent: false`) en vez de tirar la
 * sincronización o el cron que lo dispara. Un email que no se pudo
 * mandar nunca debe convertir un job exitoso (Wrapped generado, badge
 * otorgado) en uno fallido -- las notificaciones son una capa de aviso
 * encima de datos que ya existen.
 *
 * Mailgun usa Basic Auth (usuario literal "api" + la API key como
 * password) y espera el body como `application/x-www-form-urlencoded`
 * (o multipart), no JSON -- a diferencia de Resend. `MAILGUN_BASE_URL`
 * es configurable porque las cuentas creadas en la región EU de Mailgun
 * deben usar `api.eu.mailgun.net` en vez de `api.mailgun.net`.
 */

export interface SendEmailResult {
  sent: boolean;
  reason?: "not_configured" | "provider_error";
}

export async function sendEmail(to: string, content: EmailContent): Promise<SendEmailResult> {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const from = process.env.MAILGUN_FROM_EMAIL;
  const baseUrl = process.env.MAILGUN_BASE_URL || "https://api.mailgun.net";

  if (!apiKey || !domain || !from) {
    console.warn(
      "[notifications] MAILGUN_API_KEY, MAILGUN_DOMAIN o MAILGUN_FROM_EMAIL no configurados -- email no enviado (no-op documentado)."
    );
    return { sent: false, reason: "not_configured" };
  }

  try {
    const body = new URLSearchParams({
      from,
      to,
      subject: content.subject,
      html: content.html,
      text: content.text
    });

    const response = await fetch(`${baseUrl}/v3/${domain}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        // Basic Auth: usuario literal "api", password = la API key de Mailgun.
        Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`
      },
      body
    });

    if (!response.ok) {
      console.error(`[notifications] Mailgun respondió ${response.status} al enviar a ${to}`);
      return { sent: false, reason: "provider_error" };
    }

    return { sent: true };
  } catch (error) {
    console.error("[notifications] Error de red enviando email:", error);
    return { sent: false, reason: "provider_error" };
  }
}
