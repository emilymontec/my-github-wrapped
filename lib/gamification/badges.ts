import type { AnalyticsResult } from "@/lib/analytics/engine";
import { getDictionary } from "@/lib/i18n/dictionary";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";

/**
 * ⚠️ Misma regla que las reglas de Insights (lib/insights/rules.ts):
 * estas funciones LEEN métricas ya calculadas por el Analytics Engine,
 * nunca las recalculan. "No inventar un sistema paralelo de reglas"
 * (sección 42, Alcance) significa exactamente esto — los badges se
 * detectan sobre el mismo `AnalyticsResult` que ya usa el Insights
 * Engine, no sobre una lectura de commits aparte.
 *
 * A diferencia de los insights (que reflejan el estado ACTUAL de un
 * período y pueden dejar de aplicar), los badges son logros permanentes:
 * una vez que la métrica cruza el umbral, el badge se otorga y se queda
 * otorgado para siempre (ver comentario en el modelo `Badge` del
 * schema) — aunque la racha se corte o el conteo baje después.
 */

export const BADGE_TYPES = [
  "streak_7",
  "streak_30",
  "streak_100",
  "polyglot_5",
  "night_shift",
  "century_club",
  "marathon"
] as const;

export type BadgeType = (typeof BADGE_TYPES)[number];

export interface BadgeMetadata {
  label: string;
  description: string;
}

/**
 * ⚠️ Fase 9: `BADGE_INFO` (español, sin locale) se mantiene por
 * compatibilidad hacia atrás -- `app/badges/route.ts` y el dashboard
 * todavía no se migraron al diccionario (alcance parcial a propósito,
 * ver README.md). Es un derivado de `lib/i18n/dictionaries/es.ts`, no
 * una copia mantenida a mano: el texto vive en un solo lugar (el
 * diccionario) para que no puedan desincronizarse.
 */
export const BADGE_INFO: Record<BadgeType, BadgeMetadata> = getDictionary(DEFAULT_LOCALE).badges;

/** Variante locale-aware -- la usan `lib/notifications/templates.ts` y cualquier caller nuevo. */
export function getBadgeInfo(type: BadgeType, locale: Locale): BadgeMetadata {
  return getDictionary(locale).badges[type];
}

// Mismo umbral de muestra mínima que lib/insights/rules.ts, para no
// otorgar "night shift" con 3 commits de los cuales 2 fueron de noche.
const MIN_SAMPLE_COMMITS = 15;

export interface DetectedBadge {
  type: BadgeType;
  metadata: Record<string, number>;
}

/**
 * Devuelve todos los badges para los que el usuario califica ahora mismo
 * según `analytics`. El caller (lib/jobs/insights.ts) decide cuáles ya
 * estaban otorgados y solo persiste los nuevos — otorgar de más no es
 * un problema porque el upsert en DB es create-only.
 */
export function detectEligibleBadges(analytics: AnalyticsResult): DetectedBadge[] {
  const { streaks, languageStats, temporal, commitStats } = analytics;
  const eligible: DetectedBadge[] = [];

  if (streaks.longestStreak >= 7) {
    eligible.push({ type: "streak_7", metadata: { longestStreak: streaks.longestStreak } });
  }
  if (streaks.longestStreak >= 30) {
    eligible.push({ type: "streak_30", metadata: { longestStreak: streaks.longestStreak } });
  }
  if (streaks.longestStreak >= 100) {
    eligible.push({ type: "streak_100", metadata: { longestStreak: streaks.longestStreak } });
  }

  if (languageStats.languageCount >= 5) {
    eligible.push({ type: "polyglot_5", metadata: { languageCount: languageStats.languageCount } });
  }

  if (commitStats.totalCommits >= MIN_SAMPLE_COMMITS && temporal.nightActivityPercentage > 50) {
    eligible.push({
      type: "night_shift",
      metadata: { nightActivityPercentage: temporal.nightActivityPercentage }
    });
  }

  if (commitStats.totalCommits >= 100) {
    eligible.push({ type: "century_club", metadata: { totalCommits: commitStats.totalCommits } });
  }
  if (commitStats.totalCommits >= 1000) {
    eligible.push({ type: "marathon", metadata: { totalCommits: commitStats.totalCommits } });
  }

  return eligible;
}
