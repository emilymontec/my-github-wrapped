import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAcceptedComparison } from "@/lib/comparisons/service";
import { getAnalyticsWithScore } from "@/lib/analytics/service";
import { ComparisonMetricRow } from "@/components/comparisons/ComparisonMetricRow";
import { getRequestDictionary } from "@/lib/i18n/server";
import { PixelGridBackground } from "@/components/ui/PixelGridBackground";

interface ComparePageProps {
  params: { id: string };
}

/**
 * ⚠️ `getAcceptedComparison` es la única fuente de verdad de acceso: si
 * el vínculo no está ACCEPTED, o si `session.user.id` no es uno de los
 * dos participantes, devuelve `null` y esta página responde 404 — nunca
 * un mensaje que confirme "existe pero no tenés acceso" (mismo principio
 * de no filtrar información que la página pública de Wrapped).
 */
export default async function ComparisonPage({ params }: ComparePageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const comparison = await getAcceptedComparison(session.user.id, params.id);
  if (!comparison) {
    notFound();
  }

  // Ambos lados se calculan sobre el mismo período canónico
  // ("rolling12") que ya usa el dashboard — comparar "últimos 30 días" de
  // uno contra "año calendario" del otro no tendría sentido.
  const [a, b, { dict }] = await Promise.all([
    getAnalyticsWithScore(comparison.userA.id, "rolling12"),
    getAnalyticsWithScore(comparison.userB.id, "rolling12"),
    getRequestDictionary()
  ]);

  const c = dict.comparisons;

  return (
    <main className="relative mx-auto max-w-2xl px-6 py-12">
      <PixelGridBackground variant="quiet" />
      <div className="relative z-10">
      <div className="mb-8 flex items-center justify-center gap-4 text-center">
        <h1 className="font-display text-2xl font-semibold text-white">{comparison.userA.username}</h1>
        <span className="text-neutral-500">{c.vsLabel}</span>
        <h1 className="font-display text-2xl font-semibold text-white">{comparison.userB.username}</h1>
      </div>

      <div className="rounded-xl border border-wrapped-border bg-wrapped-card p-6">
        <ComparisonMetricRow
          label={c.metricCommits}
          valueA={a.analytics.commitStats.totalCommits}
          valueB={b.analytics.commitStats.totalCommits}
          higherIsA={a.analytics.commitStats.totalCommits === b.analytics.commitStats.totalCommits ? null : a.analytics.commitStats.totalCommits > b.analytics.commitStats.totalCommits}
        />
        <ComparisonMetricRow
          label={c.metricActiveDays}
          valueA={a.analytics.commitStats.activeDays}
          valueB={b.analytics.commitStats.activeDays}
          higherIsA={a.analytics.commitStats.activeDays === b.analytics.commitStats.activeDays ? null : a.analytics.commitStats.activeDays > b.analytics.commitStats.activeDays}
        />
        <ComparisonMetricRow
          label={c.metricLongestStreak}
          valueA={a.analytics.streaks.longestStreak}
          valueB={b.analytics.streaks.longestStreak}
          higherIsA={a.analytics.streaks.longestStreak === b.analytics.streaks.longestStreak ? null : a.analytics.streaks.longestStreak > b.analytics.streaks.longestStreak}
        />
        <ComparisonMetricRow
          label={c.metricTopLanguage}
          valueA={a.analytics.languageStats.topLanguage ?? "—"}
          valueB={b.analytics.languageStats.topLanguage ?? "—"}
          higherIsA={null}
        />
        <ComparisonMetricRow
          label={c.metricActivityScore}
          valueA={a.score.score}
          valueB={b.score.score}
          higherIsA={a.score.score === b.score.score ? null : a.score.score > b.score.score}
        />
      </div>

      <p className="mt-4 text-center text-xs text-neutral-500">{c.footerNote}</p>
    </div>
    </main>
  );
}
