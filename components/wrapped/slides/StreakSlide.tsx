import { SlideShell } from "@/components/wrapped/slides/SlideShell";
import type { StreakSlideData } from "@/lib/wrapped/types";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

export function StreakSlide({ data, locale }: { data: StreakSlideData; locale: Locale }) {
  const dict = getDictionary(locale).wrapped.streak;
  return (
    <SlideShell kind="streak">
      <p className="text-lg text-neutral-300">{dict.eyebrow}</p>
      <p className="font-display text-7xl font-bold tabular-nums text-wrapped-amber sm:text-8xl">
        {data.longestStreak}
      </p>
      <p className="text-lg text-neutral-300">{dict.suffix}</p>
      {data.narrative && (
        <p className="max-w-sm text-lg leading-relaxed text-neutral-200">{data.narrative}</p>
      )}
    </SlideShell>
  );
}
