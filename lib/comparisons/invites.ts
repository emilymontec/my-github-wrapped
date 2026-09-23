import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { createComparisonRequestForTargetId } from "@/lib/comparisons/service";
import { notifyComparisonInvite } from "@/lib/notifications/service";
import { sendEmail } from "@/lib/notifications/email";
import { comparisonInviteEmail } from "@/lib/notifications/templates";
import { isSupportedLocale, DEFAULT_LOCALE } from "@/lib/i18n/locales";

/**
 * ⚠️ Puente para invitar por email a alguien que puede o no tener
 * cuenta todavía -- ver el comentario en `prisma/schema.prisma` sobre
 * `ComparisonInvite`. Dos caminos según si el email ya pertenece a un
 * User:
 *
 * - Ya existe: se salta el puente por completo y se crea el
 *   `ComparisonLink` de una (mismo camino que invitar por username, vía
 *   `createComparisonRequestForTargetId`), solo que además se dispara un
 *   email de aviso. Si ese email falla, la invitación IGUAL quedó
 *   creada y visible en /compare -- el email es una cortesía, no el
 *   mecanismo.
 * - No existe: se crea un `ComparisonInvite` con token propio y el email
 *   ES el único canal de entrega -- si falla el envío, la persona no
 *   tiene forma de enterarse (no hay nada en su /compare porque todavía
 *   no tiene cuenta ahí).
 */

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días -- ver el porqué en el comentario del modelo en schema.prisma

// Validación deliberadamente laxa (no RFC 5322 completo) -- el chequeo
// real de "¿es una dirección que existe?" lo hace Mailjet al intentar
// entregar; esto solo filtra errores de tipeo obvios antes de gastar un
// envío.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CreateEmailInviteError = "invalid_email" | "self" | "already_exists" | "inviter_incomplete";

export type CreateEmailInviteResult =
  | { kind: "existing_user"; comparisonLinkId: string }
  | { kind: "pending_invite"; token: string; emailSent: boolean }
  | { error: CreateEmailInviteError };

export async function createComparisonEmailInvite(
  inviterId: string,
  rawEmail: string
): Promise<CreateEmailInviteResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "invalid_email" };

  const inviter = await prisma.user.findUnique({
    where: { id: inviterId },
    select: { email: true, username: true, locale: true }
  });
  // No debería pasar -- username se completa en el callback de auth
  // antes de que exista sesión usable (ver comentario en el modelo
  // User) -- pero sin él no hay "quién invitó" que mostrarle a la otra
  // persona, así que se corta acá en vez de mandar un email roto.
  if (!inviter?.username) return { error: "inviter_incomplete" };
  if (inviter.email && inviter.email.toLowerCase() === email) return { error: "self" };

  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  if (existingUser) {
    const result = await createComparisonRequestForTargetId(inviterId, existingUser.id);
    if ("error" in result) {
      // "not_found" no puede pasar acá (el target viene de un id ya
      // resuelto, no de un username a buscar) -- normalizamos igual por
      // las dudas del tipo de retorno compartido con el camino de
      // username.
      return { error: result.error === "not_found" ? "already_exists" : result.error };
    }

    // Best-effort: el aviso por email nunca debe hacer fallar la
    // invitación -- el ComparisonLink ya quedó creado y visible en
    // /compare para el destinatario aunque este envío falle.
    await notifyComparisonInvite({
      userId: existingUser.id,
      comparisonLinkId: result.id,
      comparisonLinkCreatedAt: result.createdAt,
      inviterUsername: inviter.username
    }).catch(() => null);

    return { kind: "existing_user", comparisonLinkId: result.id };
  }

  // Sin cuenta todavía -- reusar una invitación pendiente y vigente en
  // vez de acumular filas / reenviar el email cada vez que alguien
  // reintenta desde el form.
  const existingInvite = await prisma.comparisonInvite.findFirst({
    where: { inviterUserId: inviterId, inviteeEmail: email, status: "PENDING" }
  });
  if (existingInvite && existingInvite.expiresAt > new Date()) {
    return { kind: "pending_invite", token: existingInvite.token, emailSent: true };
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const invite = await prisma.comparisonInvite.create({
    data: {
      token,
      inviterUserId: inviterId,
      inviteeEmail: email,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS)
    }
  });

  const locale = isSupportedLocale(inviter.locale) ? inviter.locale : DEFAULT_LOCALE;
  const content = comparisonInviteEmail({
    displayName: null,
    inviterUsername: inviter.username,
    token: invite.token,
    locale
  });
  // Acá SÍ importa si el envío falla -- a diferencia del caso de arriba,
  // este email es el ÚNICO canal por el que la persona invitada se
  // entera de que la invitación existe. No revertimos la fila creada:
  // igual sirve como link reusable (el form puede ofrecer "reenviar").
  const sendResult = await sendEmail(email, content);

  return { kind: "pending_invite", token: invite.token, emailSent: sendResult.sent };
}

export interface ComparisonInvitePreview {
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";
  inviterUsername: string;
  inviteeEmail: string;
}

/**
 * Lectura pública (sin auth) para pintar la página `/compare/invite/[token]`
 * ANTES de saber si quien la abrió ya tiene sesión -- necesita mostrar
 * "fulano te invitó" incluso a un visitante sin loguear, para que pueda
 * decidir si vale la pena iniciar sesión con GitHub.
 */
export async function getComparisonInvitePreview(token: string): Promise<ComparisonInvitePreview | null> {
  const invite = await prisma.comparisonInvite.findUnique({
    where: { token },
    include: { inviter: { select: { username: true } } }
  });
  if (!invite || !invite.inviter.username) return null;

  const status = invite.status === "PENDING" && invite.expiresAt < new Date() ? "EXPIRED" : invite.status;

  return { status, inviterUsername: invite.inviter.username, inviteeEmail: invite.inviteeEmail };
}

export type ResolveEmailInviteError = "not_found" | "expired" | "already_resolved" | "self";

/**
 * Acepta la invitación -- a diferencia de invitar por username (donde el
 * `ComparisonLink` nace en PENDING y espera una aceptación aparte), acá
 * el "accept" del token YA ES el consentimiento explícito de la persona
 * invitada: llegó por email, decidió entrar, decidió aceptar. El link
 * resultante se crea directo en ACCEPTED en vez de pedir una segunda
 * confirmación que no tendría sentido.
 */
export async function acceptComparisonEmailInvite(
  token: string,
  acceptingUserId: string
): Promise<{ comparisonLinkId: string } | { error: ResolveEmailInviteError }> {
  const invite = await prisma.comparisonInvite.findUnique({ where: { token } });
  if (!invite) return { error: "not_found" };
  if (invite.status !== "PENDING") return { error: "already_resolved" };
  if (invite.expiresAt < new Date()) {
    await prisma.comparisonInvite.update({ where: { id: invite.id }, data: { status: "EXPIRED" } });
    return { error: "expired" };
  }
  if (invite.inviterUserId === acceptingUserId) return { error: "self" };

  const result = await createComparisonRequestForTargetId(invite.inviterUserId, acceptingUserId);

  if ("error" in result) {
    if (result.error !== "already_exists") return { error: "self" };

    // Ya existía un ComparisonLink por otro camino (ej: también se
    // invitó por username mientras el token seguía sin usarse) -- igual
    // queremos resolver el invite en vez de dejarlo colgado en PENDING.
    const existingLink = await prisma.comparisonLink.findFirst({
      where: {
        OR: [
          { userAId: invite.inviterUserId, userBId: acceptingUserId },
          { userAId: acceptingUserId, userBId: invite.inviterUserId }
        ]
      }
    });
    if (!existingLink) return { error: "already_resolved" };

    await prisma.$transaction([
      prisma.comparisonLink.update({
        where: { id: existingLink.id },
        data: { status: "ACCEPTED", respondedAt: new Date() }
      }),
      prisma.comparisonInvite.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED", acceptedAt: new Date(), comparisonLinkId: existingLink.id }
      })
    ]);
    return { comparisonLinkId: existingLink.id };
  }

  await prisma.$transaction([
    prisma.comparisonLink.update({
      where: { id: result.id },
      data: { status: "ACCEPTED", respondedAt: new Date() }
    }),
    prisma.comparisonInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", acceptedAt: new Date(), comparisonLinkId: result.id }
    })
  ]);

  return { comparisonLinkId: result.id };
}

export async function declineComparisonEmailInvite(
  token: string
): Promise<{ ok: true } | { error: ResolveEmailInviteError }> {
  const invite = await prisma.comparisonInvite.findUnique({ where: { token } });
  if (!invite) return { error: "not_found" };
  if (invite.status !== "PENDING") return { error: "already_resolved" };

  await prisma.comparisonInvite.update({ where: { id: invite.id }, data: { status: "DECLINED" } });
  return { ok: true };
}
