import { SlideShell } from "@/components/wrapped/slides/SlideShell";
import type { LanguagesSlideData } from "@/lib/wrapped/types";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

export function LanguagesSlide({ data, locale }: { data: LanguagesSlideData; locale: Locale }) {
  const dict = getDictionary(locale).wrapped.languages;
  return (
    <SlideShell kind="languages">
      <p className="text-lg text-cool-muted">{dict.eyebrow}</p>
      <p className="font-display text-6xl font-bold text-fuchsia-400 sm:text-7xl">
        {data.topLanguage ?? "—"}
      </p>

      {data.distribution.length > 1 && (
        <div className="flex flex-wrap justify-center gap-2">
          {data.distribution.slice(0, 5).map((entry) => (
            <span
              key={entry.language}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-cool-muted"
            >
              {entry.language} · {entry.percentage}%
            </span>
          ))}
        </div>
      )}

      {data.narrative && (
        <p className="max-w-sm text-lg leading-relaxed text-white">{data.narrative}</p>
      )}
    </SlideShell>
  );
}
