import { prisma } from "@/lib/db/prisma";
import { runAnalytics, type AnalyticsResult } from "@/lib/analytics/engine";
import { calculateDeveloperActivityScore, type DeveloperActivityScore } from "@/lib/analytics/score";
import { resolvePeriod, type PeriodOption, type ResolvedPeriod } from "@/lib/dashboard/period";

/**
 * Capa de acceso a datos "delgada" (sección 13): trae de Prisma y delega
 * el cálculo al Analytics Engine puro.
 *
 * `getAnalyticsForPeriod` es la función de bajo nivel — toma un período ya
 * resuelto, sin opinión sobre de dónde salió. `getAnalyticsForUser` es el
 * caso de uso del dashboard (uno de los 3 `PeriodOption`). Wrapped
 * (lib/wrapped/service.ts) usa `getAnalyticsForPeriod` directamente con un
 * período de año calendario, que no es ninguno de los 3 `PeriodOption` del
 * selector del dashboard — de ahí la separación.
 */
export async function getAnalyticsForPeriod(
  userId: string,
  period: ResolvedPeriod
): Promise<AnalyticsResult> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const [commits, repositories, languageStats] = await Promise.all([
    prisma.commit.findMany({
      // ⚠️ `lt`, no `lte` — period.end es un límite EXCLUSIVO (ver
      // lib/dashboard/period.ts). Con `lte` se excluiría todo el día de
      // hoy del período.
      where: { userId, date: { gte: period.start, lt: period.end } },
      select: { id: true, date: true, repositoryId: true }
    }),
    prisma.repository.findMany({
      where: { userId },
      select: { id: true, name: true }
    }),
    prisma.languageStat.findMany({
      where: { userId },
      select: { repositoryId: true, language: true, bytes: true, capturedAt: true }
    })
  ]);

  return runAnalytics({
    commits,
    repositories,
    languageStats,
    timezone: user.timezone,
    period
  });
}

/**
 * Se extrajo a un servicio compartido para que el Server Component del
 * dashboard (render inicial) y `/analytics` (cambios de período desde
 * el cliente) nunca diverjan en cómo arman la consulta.
 */
export async function getAnalyticsForUser(
  userId: string,
  periodOption: PeriodOption
): Promise<AnalyticsResult> {
  return getAnalyticsForPeriod(userId, resolvePeriod(periodOption));
}

export interface AnalyticsWithScore {
  analytics: AnalyticsResult;
  score: DeveloperActivityScore;
}

/**
 * El Developer Activity Score (Fase 5) es un enriquecimiento de
 * presentación sobre `AnalyticsResult`, no parte del Analytics Engine en
 * sí — por eso se calcula aquí, en la capa de servicio, y no dentro de
 * `runAnalytics()`. Necesita `periodDays`, que esta capa ya conoce por
 * `resolvePeriod`, sin tener que exponerlo desde el engine.
 */
export async function getAnalyticsWithScore(
  userId: string,
  periodOption: PeriodOption
): Promise<AnalyticsWithScore> {
  const period = resolvePeriod(periodOption);
  const analytics = await getAnalyticsForPeriod(userId, period);
  const periodDays = Math.max(
    1,
    Math.round((period.end.getTime() - period.start.getTime()) / 86_400_000)
  );
  return { analytics, score: calculateDeveloperActivityScore(analytics, periodDays) };
}
