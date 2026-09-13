/**
 * Los tres períodos que ofrece el selector del dashboard (Fase 2 del
 * roadmap de producto). Es una función pura a propósito — tanto el
 * servidor (render inicial) como los Route Handlers (cambios de período
 * desde el cliente) deben resolver exactamente el mismo rango para el
 * mismo `PeriodOption`, o el dashboard mostraría números distintos según
 * cómo se haya cargado.
 */
import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

export const PERIOD_OPTIONS = ["last30", "calendarYear", "rolling12"] as const;
export type PeriodOption = (typeof PERIOD_OPTIONS)[number];

export interface ResolvedPeriod {
  start: Date;
  end: Date;
}

export function isPeriodOption(value: string | null): value is PeriodOption {
  return value !== null && (PERIOD_OPTIONS as readonly string[]).includes(value);
}

/**
 * ⚠️ Los límites de "año calendario" se calculan en UTC, no en la
 * timezone del usuario. Es una simplificación deliberada: el Analytics
 * Engine ya normaliza cada commit individual a la timezone del usuario
 * (sección 14.4) para clasificar día/hora, así que el único efecto de
 * este límite en UTC es incluir o excluir, como mucho, unas pocas horas
 * de commits en el borde del año — no vale la pena la complejidad de
 * resolver el 1 de enero en la timezone de cada usuario todavía. Revisar
 * si en algún momento se vuelve una queja real de usuarios.
 *
 * ⚠️ `end` es un límite EXCLUSIVO (el instante justo después del rango),
 * no el último instante incluido. Se define como la medianoche UTC del
 * día siguiente a `referenceDate`. Dos motivos:
 *
 * 1. Determinismo: al truncar a día completo, el job de Inngest que
 *    genera insights (corre en background con latencia variable) y el
 *    Route Handler que los sirve (corre cuando el usuario visita el
 *    dashboard, minutos u horas después) calculan el MISMO
 *    `periodStart`/`periodEnd` para el mismo `PeriodOption` en el mismo
 *    día — si se usara el timestamp exacto del momento de cada llamada,
 *    ambos nunca coincidirían.
 * 2. Inclusividad correcta: si `end` fuera la medianoche de HOY (en vez
 *    de mañana), cualquier commit de hoy después de medianoche quedaría
 *    excluido por un filtro `date <= end` — literalmente todo el día de
 *    hoy desaparecería del período. Con `end` = medianoche de MAÑANA y
 *    un filtro `date < end`, el día de hoy completo queda incluido.
 *
 * Todo el código que consume `ResolvedPeriod.end` para filtrar por fecha
 * debe usar comparación estrictamente menor (`lt`), nunca `lte`.
 */
function truncateToUtcDate(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export { truncateToUtcDate };

export function resolvePeriod(option: PeriodOption, referenceDate: Date = new Date()): ResolvedPeriod {
  const endExclusive = truncateToUtcDate(referenceDate);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

  if (option === "calendarYear") {
    return {
      start: new Date(Date.UTC(truncateToUtcDate(referenceDate).getUTCFullYear(), 0, 1)),
      end: endExclusive
    };
  }

  if (option === "rolling12") {
    const start = new Date(endExclusive);
    start.setUTCFullYear(start.getUTCFullYear() - 1);
    return { start, end: endExclusive };
  }

  // last30
  const start = new Date(endExclusive);
  start.setUTCDate(start.getUTCDate() - 30);
  return { start, end: endExclusive };
}

export const PERIOD_LABELS: Record<PeriodOption, string> = {
  last30: "Últimos 30 días",
  calendarYear: "Este año",
  rolling12: "Últimos 12 meses"
};

// ⚠️ Fase 9: `PERIOD_LABELS` (español) se mantiene por compatibilidad
// hacia atrás -- es un derivado de `lib/i18n/dictionaries/es.ts`, no una
// copia mantenida a mano, mismo patrón que `BADGE_INFO` en
// `lib/gamification/badges.ts`. `getPeriodLabels` es la variante
// locale-aware que usa `components/dashboard/PeriodSelector.tsx`.
export function getPeriodLabels(locale: Locale): Record<PeriodOption, string> {
  return getDictionary(locale).periods;
}
