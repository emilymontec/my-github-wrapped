import { SlideShell } from "@/components/wrapped/slides/SlideShell";
import type { VolumeSlideData } from "@/lib/wrapped/types";
import { getDictionary, t } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

export function VolumeSlide({ data, locale }: { data: VolumeSlideData; locale: Locale }) {
  const dict = getDictionary(locale).wrapped.volume;
  return (
    <SlideShell kind="volume">
      <p className="text-lg text-neutral-300">{dict.eyebrow}</p>
      <p className="font-display text-7xl font-bold tabular-nums text-wrapped-accent sm:text-8xl">
        {data.totalCommits.toLocaleString(locale)}
      </p>
      <p className="text-lg text-neutral-300">
        {t(dict.suffix, {
          activeDays: data.activeDays,
          avgPerWeek: data.averageCommitsPerWeek.toFixed(1)
        })}
      </p>
    </SlideShell>
  );
}
