/**
 * Catálogo cerrado de tipos de notificación (Fase 8). Igual convención
 * que `lib/insights/types.ts` y `lib/gamification/badges.ts::BADGE_TYPES`:
 * un array `as const` + union derivada, no un enum de Prisma -- así
 * `NotificationLog.type` puede seguir siendo `String` en el schema sin
 * requerir migración cuando se agregue un tipo nuevo, mientras el código
 * sí tiene el tipo cerrado en tiempo de compilación.
 */
export const NOTIFICATION_TYPES = ["wrapped_ready", "streak_milestone", "comparison_invite"] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Datos mínimos de usuario que necesita cualquier plantilla de email. */
export interface NotificationRecipient {
  userId: string;
  email: string;
  /** Nombre para mostrar en el saludo -- username de GitHub o null. */
  displayName: string | null;
}
