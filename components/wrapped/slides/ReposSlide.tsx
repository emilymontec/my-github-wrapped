import { SlideShell } from "@/components/wrapped/slides/SlideShell";
import type { ReposSlideData } from "@/lib/wrapped/types";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

export function ReposSlide({ data, locale }: { data: ReposSlideData; locale: Locale }) {
  const dict = getDictionary(locale).wrapped.repos;
  return (
    <SlideShell kind="repos">
      <p className="text-lg text-cool-muted">{dict.eyebrow}</p>
      <p className="font-display text-4xl font-bold text-emerald-400 sm:text-5xl">
        {data.topRepository ?? "—"}
      </p>
      <p className="text-lg text-cool-muted">
        {dict.touchedPrefix} {data.activeRepositories} {dict.touchedSuffix}
      </p>
      {data.narrative && (
        <p className="max-w-sm text-lg leading-relaxed text-white">{data.narrative}</p>
      )}
    </SlideShell>
  );
}
