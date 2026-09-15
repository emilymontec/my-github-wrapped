import { SlideShell } from "@/components/wrapped/slides/SlideShell";
import type { ClosingSlideData } from "@/lib/wrapped/types";
import { getDictionary, t } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

export function ClosingSlide({ data, locale }: { data: ClosingSlideData; locale: Locale }) {
  const dict = getDictionary(locale).wrapped.closing;
  return (
    <SlideShell kind="closing">
      <p className="text-sm uppercase tracking-[0.2em] text-cool-muted/70">
        {t(dict.eyebrow, { year: data.year })}
      </p>
      <p className="max-w-sm text-2xl font-medium text-white">
        {data.totalCommits.toLocaleString(locale)} commits
        {data.topLanguage ? <> {t(dict.writtenIn, { language: data.topLanguage })}</> : null}.
      </p>
      <p className="text-cool-muted">{dict.seeYouNextYear}</p>
    </SlideShell>
  );
}
