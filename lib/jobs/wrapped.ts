import { inngest } from "@/lib/jobs/client";
import { prisma } from "@/lib/db/prisma";
import { getAnalyticsForPeriod } from "@/lib/analytics/service";
import { generateAndPersistInsights } from "@/lib/insights/persist";
import { resolveYearPeriod } from "@/lib/wrapped/period";
import { SLIDE_ORDER } from "@/lib/wrapped/types";

/**
 * Genera (o regenera, si el año sigue en curso) el `WrappedReport` de un
 * año específico. Reutiliza exactamente la misma `getAnalyticsForPeriod`
 * y `generateAndPersistInsights` que usa `lib/jobs/insights.ts` para el
 * período canónico "rolling12" — la única diferencia es de dónde sale el
 * período (año calendario vs. rolling 12 meses).
 *
 * ⚠️ La verificación de "año cerrado, no regenerar" vive PRINCIPALMENTE
 * en `app/wrapped/route.ts` (evita encolar el job para nada), pero
 * se repite aquí como defensa en profundidad: si por una condición de
 * carrera dos requests encolan el mismo año cerrado casi al mismo
 * tiempo, el job nunca sobrescribe un reporte cerrado ya existente.
 */
export const generateWrappedReport = inngest.createFunction(
  { id: "generate-wrapped-report", retries: 2 },
  { event: "wrapped/generate.requested" },
  async ({ event, step }) => {
    const { userId, year } = event.data;
    const { period, isClosed } = resolveYearPeriod(year);

    const existing = await step.run("check-existing", () =>
      prisma.wrappedReport.findUnique({
        where: {
          userId_periodStart_periodEnd: { userId, periodStart: period.start, periodEnd: period.end }
        }
      })
    );

    if (existing && isClosed) {
      // Año cerrado con reporte ya generado: no se toca. "El resultado
      // del año" no se recalcula por definición (ver Consideraciones de
      // la Fase 3 del roadmap de producto).
      return { skipped: true, reason: "closed_year_already_generated" };
    }

    const analytics = await step.run("compute-analytics", () =>
      getAnalyticsForPeriod(userId, period)
    );

    await step.run("generate-and-persist-insights", () =>
      generateAndPersistInsights({ userId, period, analytics })
    );

    // ⚠️ Fase 8: se decide ANTES del upsert, con el resultado de
    // "check-existing" de arriba -- después del upsert `existing` ya no
    // serviría para distinguir creación de actualización. Notificar es
    // exclusivo del momento en que un año CERRADO se genera por primera
    // vez (nunca en una regeneración del año en curso, que pasa cada vez
    // que el usuario abre su propio Wrapped todavía abierto).
    const isFirstTimeClosedYear = isClosed && !existing;

    await step.run("upsert-wrapped-report", () =>
      prisma.wrappedReport.upsert({
        where: {
          userId_periodStart_periodEnd: { userId, periodStart: period.start, periodEnd: period.end }
        },
        create: {
          userId,
          periodStart: period.start,
          periodEnd: period.end,
          totalCommits: analytics.commitStats.totalCommits,
          totalRepositories: analytics.repositoryStats.totalRepositories,
          topLanguage: analytics.languageStats.topLanguage,
          topRepository: analytics.repositoryStats.topRepository,
          mostActiveDay: analytics.temporal.mostActiveDay,
          mostActiveHour: analytics.temporal.mostActiveHour,
          longestStreak: analytics.streaks.longestStreak,
          slidesOrder: [...SLIDE_ORDER],
          generatedAt: new Date()
        },
        update: {
          totalCommits: analytics.commitStats.totalCommits,
          totalRepositories: analytics.repositoryStats.totalRepositories,
          topLanguage: analytics.languageStats.topLanguage,
          topRepository: analytics.repositoryStats.topRepository,
          mostActiveDay: analytics.temporal.mostActiveDay,
          mostActiveHour: analytics.temporal.mostActiveHour,
          longestStreak: analytics.streaks.longestStreak,
          generatedAt: new Date()
        }
      })
    );

    if (isFirstTimeClosedYear) {
      await step.sendEvent("notify-wrapped-ready", {
        name: "notifications/wrapped-ready.requested",
        data: { userId, year }
      });
    }

    return { skipped: false };
  }
);
