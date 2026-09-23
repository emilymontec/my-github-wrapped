import { getBadgeInfo, type BadgeType } from "@/lib/gamification/badges";
import { getDictionary, t } from "@/lib/i18n/dictionary";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";

/**
 * ⚠️ Estas plantillas nunca calculan nada -- reciben números ya
 * calculados por el Analytics Engine / ya persistidos (mismo principio
 * que `lib/insights/templates.ts`: la IA/las plantillas redactan, nunca
 * agregan datos). Texto plano + HTML mínimo, sin dependencias de un
 * motor de templating -- el volumen de contenido es chico y fijo.
 *
 * ⚠️ Fase 9: el copy sale de `lib/i18n/dictionaries/` (namespace
 * `notificationsEmail`), no de strings hardcodeados acá -- `locale` es
 * opcional y default `"es"` a propósito, para no romper ningún caller
 * existente de la Fase 8 que todavía no pasa el parámetro.
 */

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

function wrapHtml(locale: Locale, footer: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="${locale}">
  <body style="margin:0;padding:32px 16px;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e5e5;">
    <div style="max-width:480px;margin:0 auto;background:#171717;border:1px solid #262626;border-radius:16px;padding:32px;">
      ${bodyHtml}
      <p style="margin-top:32px;font-size:12px;color:#737373;">${footer}</p>
    </div>
  </body>
</html>`;
}

// ⚠️ Corrección: los tres templates de este archivo armaban el link del
// botón/CTA como ruta relativa (`/wrapped/${year}`, `/dashboard`) -- eso
// funciona en un <a> dentro de la propia app (el navegador lo resuelve
// contra la página actual), pero en un EMAIL no hay "página actual"
// contra la cual resolverlo, así que el link quedaba roto en cualquier
// cliente de correo real. Reutiliza WEBHOOK_BASE_URL (ya documentado
// como "URL pública de esta app" en .env.example, no es exclusivo de
// webhooks) para armar una URL absoluta. Si no está configurada, cae a
// la ruta relativa de antes -- mismo espíritu best-effort que el resto
// de las integraciones opcionales de este archivo: un email con un link
// roto sigue siendo mejor que ningún email.
function absoluteUrl(path: string): string {
  const base = process.env.WEBHOOK_BASE_URL;
  return base ? `${base.replace(/\/$/, "")}${path}` : path;
}

function greeting(dict: { greetingNamed: string; greetingGeneric: string }, displayName: string | null): string {
  return displayName ? t(dict.greetingNamed, { name: displayName }) : dict.greetingGeneric;
}

export function wrappedReadyEmail(params: {
  displayName: string | null;
  year: number;
  locale?: Locale;
}): EmailContent {
  const { displayName, year, locale = DEFAULT_LOCALE } = params;
  const copy = getDictionary(locale).notificationsEmail.wrappedReady;
  const hello = greeting(copy, displayName);
  const subject = t(copy.subject, { year });
  const body = t(copy.body, { year });

  const text = [`${hello},`, "", body, `${copy.cta}: ${absoluteUrl(`/wrapped/${year}`)}`, "", "— GitHub Wrapped"].join(
    "\n"
  );

  const html = wrapHtml(
    locale,
    copy.footer,
    `
    <p style="font-size:15px;">${hello},</p>
    <p style="font-size:15px;line-height:1.6;">${body}</p>
    <p style="margin-top:24px;">
      <a href="${absoluteUrl(`/wrapped/${year}`)}" style="display:inline-block;background:#22c55e;color:#000;text-decoration:none;font-weight:600;padding:10px 20px;border-radius:999px;font-size:14px;">
        ${copy.cta}
      </a>
    </p>
  `
  );

  return { subject, html, text };
}

export function streakMilestoneEmail(params: {
  displayName: string | null;
  badgeType: BadgeType;
  streakLength: number;
  locale?: Locale;
}): EmailContent {
  const { displayName, badgeType, streakLength, locale = DEFAULT_LOCALE } = params;
  const copy = getDictionary(locale).notificationsEmail.streakMilestone;
  const badge = getBadgeInfo(badgeType, locale);
  const hello = greeting(copy, displayName);
  const subject = t(copy.subject, { badgeLabel: badge.label });
  const body = t(copy.body, { streakLength, badgeLabel: badge.label });

  const text = [
    `${hello},`,
    "",
    body,
    badge.description,
    "",
    `${copy.cta}: ${absoluteUrl("/dashboard")}`,
    "",
    "— GitHub Wrapped"
  ].join("\n");

  const html = wrapHtml(
    locale,
    copy.footer,
    `
    <p style="font-size:15px;">${hello},</p>
    <p style="font-size:15px;line-height:1.6;">${body}</p>
    <p style="font-size:14px;color:#a3a3a3;">${badge.description}</p>
    <p style="margin-top:24px;">
      <a href="${absoluteUrl("/dashboard")}" style="display:inline-block;background:#22c55e;color:#000;text-decoration:none;font-weight:600;padding:10px 20px;border-radius:999px;font-size:14px;">
        ${copy.cta}
      </a>
    </p>
  `
  );

  return { subject, html, text };
}

/**
 * Dos casos, un solo template -- la diferencia es el link del CTA:
 *
 * - `token` presente: la persona invitada TODAVÍA NO tiene cuenta
 *   (ComparisonInvite puente, ver prisma/schema.prisma). El link lleva a
 *   /compare/invite/{token}, que pide iniciar sesión con GitHub antes de
 *   poder aceptar.
 * - `token` ausente: la persona invitada YA es un usuario existente --
 *   el ComparisonLink real ya se creó en PENDING (mismo camino que
 *   invitar por username), así que el link lleva directo a /compare,
 *   donde ya va a estar esperando para aceptar/rechazar.
 */
export function comparisonInviteEmail(params: {
  displayName: string | null;
  inviterUsername: string;
  token?: string;
  locale?: Locale;
}): EmailContent {
  const { displayName, inviterUsername, token, locale = DEFAULT_LOCALE } = params;
  const copy = getDictionary(locale).notificationsEmail.comparisonInvite;
  const hello = greeting(copy, displayName);
  const subject = t(copy.subject, { username: inviterUsername });
  const body = t(copy.body, { username: inviterUsername });
  const path = token ? `/compare/invite/${token}` : "/compare";
  const url = absoluteUrl(path);

  const text = [`${hello},`, "", body, `${copy.cta}: ${url}`, "", "— GitHub Wrapped"].join("\n");

  const html = wrapHtml(
    locale,
    copy.footer,
    `
    <p style="font-size:15px;">${hello},</p>
    <p style="font-size:15px;line-height:1.6;">${body}</p>
    <p style="margin-top:24px;">
      <a href="${url}" style="display:inline-block;background:#22c55e;color:#000;text-decoration:none;font-weight:600;padding:10px 20px;border-radius:999px;font-size:14px;">
        ${copy.cta}
      </a>
    </p>
  `
  );

  return { subject, html, text };
}
