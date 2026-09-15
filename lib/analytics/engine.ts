import type {
  AnalyticsCommitInput,
  AnalyticsLanguageInput,
  AnalyticsPeriod,
  AnalyticsRepositoryInput
} from "@/lib/analytics/types";
import { calculateCommitStats, type CommitStats } from "@/lib/analytics/commits";
import { calculateRepositoryStats, type RepositoryStats } from "@/lib/analytics/repositories";
import { calculateLanguageStats, type LanguageStats } from "@/lib/analytics/languages";
import {
  buildDailyDistribution,
  buildHourlyDistribution,
  buildWeekdayDistribution,
  findMostActiveDay,
  findMostActiveHour,
  nightActivityPercentage,
  weekendActivityPercentage,
  type DayBucket,
  type HourBucket,
  type WeekdayBucket
} from "@/lib/analytics/activity";
import { calculateStreaks, type StreakResult } from "@/lib/analytics/streaks";
import { safeTimezone, type Weekday } from "@/lib/analytics/timezone";

/**
 * AnalyticsEngine (sección 13).
 *
 * Entrada: commits + repositories + languageStats + timezone + período.
 * Salida: metrics/statistics/patterns, sin tocar GitHub, la DB ni la UI.
 *
 * Esto es lo que hace posible testear con fixtures en memoria (ver
 * __tests__/) y lo que consumirán, en fases posteriores, el Insights
 * Engine (16) y el Dashboard/Wrapped (18-19).
 */

export interface AnalyticsInput {
  commits: AnalyticsCommitInput[];
  repositories: AnalyticsRepositoryInput[];
  languageStats: AnalyticsLanguageInput[];
  timezone: string;
  period: AnalyticsPeriod;
  /** Solo para tests deterministas del "current streak"; por defecto usa `new Date()`. */
  referenceDate?: Date;
}

export interface TemporalStats {
  hourlyDistribution: HourBucket[];
  weekdayDistribution: WeekdayBucket[];
  dailyDistribution: DayBucket[];
  mostActiveHour: number | null;
  mostActiveDay: Weekday | null;
  nightActivityPercentage: number;
  weekendActivityPercentage: number;
}

export interface AnalyticsResult {
  commitStats: CommitStats;
  repositoryStats: RepositoryStats;
  languageStats: LanguageStats;
  temporal: TemporalStats;
  streaks: StreakResult;
}

export function runAnalytics(input: AnalyticsInput): AnalyticsResult {
  const timezone = safeTimezone(input.timezone);
  const { commits, repositories, languageStats, period, referenceDate } = input;

  // ⚠️ Corrección: `languageStats` llega con el historial COMPLETO del
  // usuario (getAnalyticsForPeriod no lo filtra por fecha — LanguageStat
  // es una serie de tiempo de snapshots, no tiene "un" período natural
  // como sí lo tiene un commit). Sin este filtro, "Lenguajes" mostraba
  // siempre el conteo de TODA la cuenta sin importar qué período
  // estuviera seleccionado en el dashboard — los 3 filtros (30 días,
  // este año, últimos 12 meses) daban el mismo número.
  // Acotamos a los repos que tuvieron AL MENOS un commit dentro del
  // período ya filtrado — mismo criterio que ya usa
  // `calculateRepositoryStats` para "repos activos", así que ambos stats
  // quedan consistentes entre sí.
  const activeRepositoryIds = new Set(commits.map((c) => c.repositoryId));
  const periodLanguageStats = languageStats.filter((stat) => activeRepositoryIds.has(stat.repositoryId));

  return {
    commitStats: calculateCommitStats(commits, timezone, period),
    repositoryStats: calculateRepositoryStats(commits, repositories),
    languageStats: calculateLanguageStats(periodLanguageStats),
    temporal: {
      hourlyDistribution: buildHourlyDistribution(commits, timezone),
      weekdayDistribution: buildWeekdayDistribution(commits, timezone),
      dailyDistribution: buildDailyDistribution(commits, timezone, period),
      mostActiveHour: findMostActiveHour(commits, timezone),
      mostActiveDay: findMostActiveDay(commits, timezone),
      nightActivityPercentage: nightActivityPercentage(commits, timezone),
      weekendActivityPercentage: weekendActivityPercentage(commits, timezone)
    },
    streaks: calculateStreaks(commits, timezone, referenceDate)
  };
}

export * from "@/lib/analytics/types";
export * from "@/lib/analytics/timezone";
