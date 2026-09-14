import { prisma } from "@/lib/db/prisma";
import { generateInsights } from "@/lib/insights/engine";
import type { AnalyticsResult } from "@/lib/analytics/engine";
import type { ResolvedPeriod } from "@/lib/dashboard/period";
import type { GeneratedInsight } from "@/lib/insights/types";

export interface GenerateAndPersistInsightsInput {
  userId: string;
  period: ResolvedPeriod;
  analytics: AnalyticsResult;
}

/**
 * Corre el Insights Engine sobre un AnalyticsResult ya calculado y
 * persiste el resultado (upsert por `userId+periodStart+periodEnd+type`).
 *
 * Compartido entre `lib/jobs/insights.ts` (período canónico "rolling12",
 * para el dashboard) y `lib/jobs/wrapped.ts` (período de año calendario
 * específico, para Wrapped) — la única diferencia real entre ambos casos
 * de uso es DE DÓNDE sale el período, no cómo se generan o persisten los
 * insights. Antes de esta extracción, ambas rutas hubieran duplicado el
 * mismo bucle de upsert.
 */
export async function generateAndPersistInsights({
  userId,
  period,
  analytics
}: GenerateAndPersistInsightsInput): Promise<GeneratedInsight[]> {
  const periodDays = Math.max(
    1,
    Math.round((period.end.getTime() - period.start.getTime()) / 86_400_000)
  );

  const generated = await generateInsights(
    { analytics, periodDays },
    // useAI depende de que la API key esté configurada — sin ella, el
    // engine cae automáticamente a plantillas deterministas.
    { userId, useAI: Boolean(process.env.HUGGINGFACE_API_KEY) }
  );

  for (const insight of generated) {
    await prisma.insight.upsert({
      where: {
        userId_periodStart_periodEnd_type: {
          userId,
          periodStart: period.start,
          periodEnd: period.end,
          type: insight.type
        }
      },
      create: {
        userId,
        periodStart: period.start,
        periodEnd: period.end,
        type: insight.type,
        priority: insight.priority,
        data: insight.data,
        narrative: insight.narrative,
        source: insight.source
      },
      update: {
        priority: insight.priority,
        data: insight.data,
        narrative: insight.narrative,
        source: insight.source
      }
    });
  }

  return generated;
}
