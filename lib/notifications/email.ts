import type { EmailContent } from "@/lib/notifications/templates";

/**
 * ⚠️ Migrado de Mailgun a Mailjet (antes: `MAILGUN_API_KEY` + Basic Auth
 * con usuario literal "api" + body form-urlencoded contra
 * `/v3/{domain}/messages`). Mailjet usa Send API v3.1: Basic Auth con
 * las DOS API keys de la cuenta (pública = usuario, privada = password
 * -- a diferencia de Mailgun, acá NO hay un usuario literal fijo) y el
 * body es JSON, no form-urlencoded. El motivo del cambio es de producto,
 * no técnico: la cuenta de Mailgun usada hasta ahora estaba en modo
 * sandbox (solo manda a destinatarios autorizados a mano), y Mailjet no
 * tiene esa restricción en su plan gratuito -- no hace falta verificar
 * un dominio propio para empezar a mandar a cualquier destinatario.
 *
 * Igual que antes: config opcional, sin ella el envío cae a un no-op
 * documentado (se loguea localmente y se devuelve `sent: false`) en vez
 * de tirar la sincronización o el cron que lo dispara. Un email que no
 * se pudo mandar nunca debe convertir un job exitoso (Wrapped generado,
 * badge otorgado) en uno fallido -- las notificaciones son una capa de
 * aviso encima de datos que ya existen.
 *
 * Se mantiene como `fetch` directo a la API REST (sin el SDK oficial
 * `node-mailjet`) por el mismo motivo que ya aplicaba con Mailgun: es
 * una sola llamada HTTP, y mantenerlo como `fetch` puro es lo que
 * permite mockearlo en tests exactamente igual que ya se mockea la
 * llamada a Hugging Face / Mailgun, sin agregar una dependencia nueva
 * ni duplicar infraestructura de testing.
 */

export interface SendEmailResult {
  sent: boolean;
  reason?: "not_configured" | "provider_error";
}

interface MailjetSendResponse {
  Messages?: Array<{ Status?: string; Errors?: Array<{ ErrorMessage?: string }> }>;
}

export async function sendEmail(to: string, content: EmailContent): Promise<SendEmailResult> {
  const apiKey = process.env.MJ_APIKEY_PUBLIC;
  const apiSecret = process.env.MJ_APIKEY_PRIVATE;
  const fromEmail = process.env.MAILJET_FROM_EMAIL;
  // Opcional -- Mailjet acepta `From` sin `Name`, así que no es parte
  // del gate de "no_configured" como sí lo son las tres de arriba.
  const fromName = process.env.MAILJET_FROM_NAME || "GitHub Wrapped";

  if (!apiKey || !apiSecret || !fromEmail) {
    console.warn(
      "[notifications] MJ_APIKEY_PUBLIC, MJ_APIKEY_PRIVATE o MAILJET_FROM_EMAIL no configurados -- email no enviado (no-op documentado)."
    );
    return { sent: false, reason: "not_configured" };
  }

  try {
    const response = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Basic Auth: usuario = API key pública, password = API key
        // privada -- a diferencia de Mailgun, acá NO hay un usuario
        // literal fijo ("api"); son las dos keys propias de la cuenta.
        Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`
      },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: fromEmail, Name: fromName },
            To: [{ Email: to }],
            Subject: content.subject,
            TextPart: content.text,
            HTMLPart: content.html
          }
        ]
      })
    });

    if (!response.ok) {
      console.error(`[notifications] Mailjet respondió ${response.status} al enviar a ${to}`);
      return { sent: false, reason: "provider_error" };
    }

    // ⚠️ A diferencia de Mailgun, Mailjet puede devolver HTTP 200 con un
    // error POR MENSAJE dentro del body (ej: dirección inválida,
    // dominio del remitente no verificado) -- el status HTTP solo
    // confirma que el REQUEST fue válido, no que el envío se aceptó.
    // Hay que mirar `Messages[0].Status` para saberlo de verdad.
    const data = (await response.json().catch(() => null)) as MailjetSendResponse | null;
    const status = data?.Messages?.[0]?.Status;
    if (status && status !== "success") {
      const errorDetail = data?.Messages?.[0]?.Errors?.[0]?.ErrorMessage ?? status;
      console.error(`[notifications] Mailjet no pudo enviar a ${to}: ${errorDetail}`);
      return { sent: false, reason: "provider_error" };
    }

    return { sent: true };
  } catch (error) {
    console.error("[notifications] Error de red enviando email:", error);
    return { sent: false, reason: "provider_error" };
  }
}
