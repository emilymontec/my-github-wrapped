import { SlideShell } from "@/components/wrapped/slides/SlideShell";
import type { RhythmSlideData } from "@/lib/wrapped/types";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

export function RhythmSlide({ data, locale }: { data: RhythmSlideData; locale: Locale }) {
  const dict = getDictionary(locale).wrapped;
  const hourLabel = data.mostActiveHour !== null ? `${data.mostActiveHour}:00` : null;
  const dayLabel = data.mostActiveDay
    ? dict.rhythm.days[data.mostActiveDay as keyof typeof dict.rhythm.days]
    : null;

  return (
    <SlideShell kind="rhythm">
      <p className="text-lg text-neutral-300">{dict.rhythm.eyebrow}</p>
      <p className="font-display text-5xl font-bold text-wrapped-amber sm:text-6xl">
        {hourLabel && dayLabel
          ? `${dayLabel}, ${hourLabel}`
          : hourLabel ?? dayLabel ?? dict.rhythm.noPattern}
      </p>
      {data.narrative && (
        <p className="max-w-sm text-lg leading-relaxed text-neutral-200">{data.narrative}</p>
      )}
    </SlideShell>
  );
}
