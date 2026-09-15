import { SlideShell } from "@/components/wrapped/slides/SlideShell";
import type { OpeningSlideData } from "@/lib/wrapped/types";
import { getDictionary, t } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

export function OpeningSlide({ data, locale }: { data: OpeningSlideData; locale: Locale }) {
  const dict = getDictionary(locale).wrapped.opening;
  return (
    <SlideShell kind="opening">
      <p className="text-sm uppercase tracking-[0.2em] text-cool-muted/70">{dict.eyebrow}</p>
      <h1 className="font-display text-5xl font-bold text-white sm:text-6xl">{data.year}</h1>
      <p className="max-w-sm text-lg text-cool-muted">
        {t(dict.subtitle, { username: data.username })}
      </p>
    </SlideShell>
  );
}
