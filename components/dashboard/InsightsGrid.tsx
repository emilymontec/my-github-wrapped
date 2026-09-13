import type { PersistedInsight } from "@/lib/insights/types";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

export interface InsightsGridProps {
  insights: PersistedInsight[];
  locale: Locale;
}

/**
 * ⚠️ Fase 9, límite documentado a propósito: `insight.narrative` es
 * texto ya generado (por IA o por `lib/insights/templates.ts`) y
 * persistido en `Insight.narrative` en el momento del sync — este
 * componente nunca lo traduce ni lo regenera, solo lo muestra tal cual
 * quedó guardado (casi siempre en español, porque `lib/insights/narrate.ts`
 * todavía le pide el narrado en español a la IA sin importar el locale
 * del usuario). Traducir narrativas ya persistidas requeriría regenerarlas
 * o agregar una capa de traducción aparte — deliberadamente fuera de
 * alcance de esta fase. Lo que sí es locale-aware acá es la etiqueta
 * corta del tipo de insight (`TYPE_LABELS` -> `dict.insightTypeLabels`)
 * y el estado vacío.
 */
export function InsightsGrid({ insights, locale }: InsightsGridProps) {
  const dict = getDictionary(locale).dashboard;

  if (insights.length === 0) {
    return <p className="text-sm text-neutral-500">{dict.insightsEmpty}</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {insights.map((insight) => (
        <div
          key={insight.id}
          className="rounded-xl border border-wrapped-border bg-wrapped-card p-5"
        >
          <p className="text-[15px] leading-relaxed text-neutral-200">{insight.narrative}</p>
          <p className="mt-3 text-xs text-neutral-500">
            {dict.insightTypeLabels[insight.type as keyof typeof dict.insightTypeLabels] ?? insight.type}
          </p>
        </div>
      ))}
    </div>
  );
}
