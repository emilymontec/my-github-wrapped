import { prisma } from "@/lib/db/prisma";

export interface NotificationPreferences {
  wrappedReadyEmail: boolean;
  streakMilestoneEmail: boolean;
  comparisonInviteEmail: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  wrappedReadyEmail: true,
  streakMilestoneEmail: true,
  comparisonInviteEmail: true
};

/**
 * ⚠️ No crea una fila si no existe -- la mayoría de los usuarios nunca
 * va a tocar /settings, y forzar una fila por usuario desde el primer
 * login sería una escritura innecesaria en el camino de auth (mismo
 * motivo por el que `getPrivateReposStatus` lee directo de columnas de
 * `User` en vez de necesitar una fila previa). Si no existe fila, el
 * usuario simplemente tiene los defaults -- que son `true`, así que el
 * comportamiento observable ("recibe notificaciones") es idéntico a si
 * la fila existiera.
 */
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const row = await prisma.notificationPreference.findUnique({
    where: { userId },
    select: { wrappedReadyEmail: true, streakMilestoneEmail: true, comparisonInviteEmail: true }
  });

  return row ?? DEFAULT_PREFERENCES;
}

/**
 * Upsert parcial: solo los campos presentes en `updates` se tocan, el
 * resto conserva su valor actual (o el default, si la fila no existía
 * todavía). Esto es lo que permite exponer un PATCH granular por tipo de
 * notificación desde /settings sin que activar una casilla desactive
 * accidentalmente otra que el usuario no tocó.
 */
export async function setNotificationPreferences(
  userId: string,
  updates: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const row = await prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId, ...DEFAULT_PREFERENCES, ...updates },
    update: updates,
    select: { wrappedReadyEmail: true, streakMilestoneEmail: true, comparisonInviteEmail: true }
  });

  return row;
}
