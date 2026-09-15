"use client";

import { useState } from "react";
import type { PeriodOption } from "@/lib/dashboard/period";
import type { DashboardData } from "@/lib/dashboard/types";
import type { AnalyticsWithScore } from "@/lib/analytics/service";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { StatCard } from "@/components/dashboard/StatCard";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";
import { LanguageChart } from "@/components/dashboard/LanguageChart";
import { CommitTrend } from "@/components/dashboard/CommitTrend";
import { StreakCard } from "@/components/dashboard/StreakCard";
import { InsightsGrid } from "@/components/dashboard/InsightsGrid";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Skeleton } from "@/components/dashboard/Skeleton";
import { ScoreCard } from "@/components/dashboard/ScoreCard";
import { BadgesGrid } from "@/components/dashboard/BadgesGrid";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

interface DashboardClientProps {
  initialPeriod: PeriodOption;
  initialData: DashboardData;
  locale: Locale;
}

/**
 * Cambiar de período solo vuelve a pedir analytics (+ score, que viaja
 * junto desde la Fase 5) — los insights y los badges no dependen del
 * selector de gráficos (insights son del período canónico "rolling12",
 * badges son logros permanentes). Esto evita fetches redundantes y evita
 * que esas secciones "parpadeen" al cambiar de período.
 */
export function DashboardClient({ initialPeriod, initialData, locale }: DashboardClientProps) {
  const dict = getDictionary(locale).dashboard;
  const [period, setPeriod] = useState<PeriodOption>(initialPeriod);
  const [analytics, setAnalytics] = useState(initialData.analytics);
  const [score, setScore] = useState(initialData.score);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePeriodChange(next: PeriodOption) {
    if (next === period) return;
    setPeriod(next);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/analytics?period=${next}`);
      if (!res.ok) throw new Error(dict.periodLoadError);
      const data: AnalyticsWithScore = await res.json();
      setAnalytics(data.analytics);
      setScore(data.score);
    } catch {
      setError(dict.periodLoadError);
    } finally {
      setLoading(false);
    }
  }

  const hasActivity = analytics.commitStats.totalCommits > 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <PeriodSelector value={period} onChange={handlePeriodChange} disabled={loading} locale={locale} />
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      {!hasActivity ? (
        <EmptyState title={dict.periodEmptyTitle} description={dict.periodEmptyDescription} />
      ) : (
        <>
          <section className="bento-panel grid grid-cols-2 gap-6 p-6 sm:grid-cols-4">
            <StatCard value={analytics.commitStats.totalCommits} label={dict.statCommits} accent />
            <StatCard value={analytics.repositoryStats.activeRepositories} label={dict.statActiveRepos} />
            <StatCard value={analytics.languageStats.languageCount} label={dict.statLanguages} />
            <StatCard value={analytics.commitStats.activeDays} label={dict.statActiveDays} />
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <StreakCard
              currentStreak={analytics.streaks.currentStreak}
              longestStreak={analytics.streaks.longestStreak}
              locale={locale}
            />
            <ScoreCard score={score} locale={locale} />
          </div>

          <section className="bento-panel p-6">
            <h2 className="mb-4 font-display text-lg font-semibold">{dict.activitySectionTitle}</h2>
            {loading ? (
              <Skeleton className="h-[120px] w-full" />
            ) : (
              <ActivityHeatmap dailyDistribution={analytics.temporal.dailyDistribution} locale={locale} />
            )}
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="bento-panel p-6">
              <h2 className="mb-4 font-display text-lg font-semibold">{dict.weeklyTrendSectionTitle}</h2>
              {loading ? (
                <Skeleton className="h-[160px] w-full" />
              ) : (
                <CommitTrend dailyDistribution={analytics.temporal.dailyDistribution} locale={locale} />
              )}
            </section>

            <section className="bento-panel p-6">
              <h2 className="mb-4 font-display text-lg font-semibold">{dict.languagesSectionTitle}</h2>
              {loading ? (
                <Skeleton className="h-[180px] w-full" />
              ) : (
                <LanguageChart distribution={analytics.languageStats.distribution} locale={locale} />
              )}
            </section>
          </div>
        </>
      )}

      <section>
        <h2 className="mb-4 font-display text-lg font-semibold">{dict.badgesSectionTitle}</h2>
        <BadgesGrid locale={locale} />
      </section>

      <section>
        <h2 className="mb-4 font-display text-lg font-semibold">{dict.insightsSectionTitle}</h2>
        <InsightsGrid insights={initialData.insights} locale={locale} />
      </section>
    </div>
  );
}
