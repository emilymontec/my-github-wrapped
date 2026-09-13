import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/notifications/email";
import { wrappedReadyEmail, streakMilestoneEmail } from "@/lib/notifications/templates";
import { getNotificationPreferences } from "@/lib/notifications/preferences";
import type { NotificationType } from "@/lib/notifications/types";
import type { BadgeType } from "@/lib/gamification/badges";
import { isSupportedLocale, DEFAULT_LOCALE } from "@/lib/i18n/locales";

export interface NotifyResult {
  sent: boolean;
  reason?: "not_configured" | "provider_error" | "preference_disabled" | "already_sent" | "no_email";
}

/**
 * ⚠️ Deduplicación por constraint de DB, no por un "check-then-write" en
 * dos pasos. `lib/jobs/wrapped-auto-generate.ts` documenta que el cron
 * corre todos los días del año para el mismo `previousYear`, y
 * `awardEligibleBadges` puede en teoría procesarse dos veces si un job
 * de Inngest se reintenta -- un `findFirst` seguido de un `create`
 * dejaría una ventana de carrera donde dos ejecuciones concurrentes
 * pasan el check antes de que cualquiera escriba. Intentar el `create`
 * primero y capturar la violación de `@@unique([userId, type, key])`
 * (código de error P2002) hace que la propia base de datos sea el
 * árbitro final de "¿ya se envió esto?", sin ventana de carrera posible.
 *
 * ⚠️ El chequeo del código de error es estructural (`error?.code`), no
 * `instanceof Prisma.PrismaClientKnownRequestError`: esa clase vive en
 * el cliente de Prisma generado, y depender de ella acoplaría este
 * chequeo a que `prisma generate` haya corrido con el motor real
 * disponible. El código P2002 es parte del contrato estable de Prisma
 * (no cambia entre versiones del cliente), así que verificarlo de forma
 * estructural es igual de correcto y más fácil de testear sin una DB
 * real ni un cliente generado.
 */
async function tryClaimNotification(userId: string, type: NotificationType, key: string): Promise<boolean> {
  try {
    await prisma.notificationLog.create({ data: { userId, type, key } });
    return true;
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code;
    if (code === "P2002") {
      return false; // ya se había enviado -- no es un error, es el caso esperado del cron/retry
    }
    throw error;
  }
}

/**
 * Notifica que el Wrapped de un año cerrado ya está generado.
 * ⚠️ Se llama SOLO la primera vez que un año cerrado se genera (ver
 * `lib/jobs/wrapped.ts`) -- nunca en una regeneración del año en curso,
 * que ocurre cada vez que el usuario abre su propio Wrapped todavía
 * abierto y no amerita un email cada vez.
 */
export async function notifyWrappedReady(userId: string, year: number): Promise<NotifyResult> {
  const preferences = await getNotificationPreferences(userId);
  if (!preferences.wrappedReadyEmail) {
    return { sent: false, reason: "preference_disabled" };
  }

  const claimed = await tryClaimNotification(userId, "wrapped_ready", String(year));
  if (!claimed) {
    return { sent: false, reason: "already_sent" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, username: true, name: true, locale: true }
  });
  if (!user?.email) {
    return { sent: false, reason: "no_email" };
  }

  // ⚠️ Fase 9: `User.locale` es un `String` en el schema (no un enum de
  // Prisma), así que se re-valida acá contra `SUPPORTED_LOCALES` antes
  // de pasarlo a las plantillas -- un valor corrupto o de un idioma
  // retirado no debe filtrarse hasta `getDictionary` y explotar el envío.
  const locale = isSupportedLocale(user.locale) ? user.locale : DEFAULT_LOCALE;

  const content = wrappedReadyEmail({ displayName: user.username ?? user.name, year, locale });
  return sendEmail(user.email, content);
}

/**
 * Notifica un badge de racha recién otorgado (streak_7 / streak_30 /
 * streak_100 -- ver `lib/gamification/badges.ts`). Solo estos tres:
 * el resto de los badges (polyglot_5, night_shift, century_club,
 * marathon) no está en el alcance pedido para esta fase ("milestones de
 * rachas"), y agregar más tipos sin que el producto lo pida sería
 * ampliar el alcance de notificaciones por email sin una decisión
 * consciente -- lo mismo que el proyecto evita en repos privados.
 */
export async function notifyStreakMilestone(
  userId: string,
  badgeType: BadgeType,
  streakLength: number
): Promise<NotifyResult> {
  const preferences = await getNotificationPreferences(userId);
  if (!preferences.streakMilestoneEmail) {
    return { sent: false, reason: "preference_disabled" };
  }

  const claimed = await tryClaimNotification(userId, "streak_milestone", badgeType);
  if (!claimed) {
    return { sent: false, reason: "already_sent" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, username: true, name: true, locale: true }
  });
  if (!user?.email) {
    return { sent: false, reason: "no_email" };
  }

  const locale = isSupportedLocale(user.locale) ? user.locale : DEFAULT_LOCALE;

  const content = streakMilestoneEmail({
    displayName: user.username ?? user.name,
    badgeType,
    streakLength,
    locale
  });
  return sendEmail(user.email, content);
}
