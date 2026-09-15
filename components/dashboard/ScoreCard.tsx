import Link from "next/link";
import type { DeveloperActivityScore } from "@/lib/analytics/score";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

export function ScoreCard({ score, locale }: { score: DeveloperActivityScore; locale: Locale }) {
  const dict = getDictionary(locale).dashboard;
  const dimensionLabels = dict.scoreDimensions;

  return (
    <div className="bento-panel p-6">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-sm text-cool-muted">{dict.scoreLabel}</p>
          <p className="font-display text-4xl font-semibold tabular-nums text-cool-cyan">
            {score.score}
          </p>
        </div>
        <Link href="/score" className="text-xs text-cool-muted/70 underline hover:text-cool-muted">
          {dict.scoreHowItsCalculated}
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {(Object.keys(score.breakdown) as (keyof typeof score.breakdown)[]).map((key) => (
          <div key={key} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-xs text-cool-muted">{dimensionLabels[key]}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-cool-violet"
                style={{ width: `${score.breakdown[key]}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-xs tabular-nums text-cool-muted">
              {score.breakdown[key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
