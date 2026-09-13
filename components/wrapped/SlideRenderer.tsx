import type { WrappedSlide } from "@/lib/wrapped/types";
import type { Locale } from "@/lib/i18n/locales";
import { OpeningSlide } from "@/components/wrapped/slides/OpeningSlide";
import { VolumeSlide } from "@/components/wrapped/slides/VolumeSlide";
import { RhythmSlide } from "@/components/wrapped/slides/RhythmSlide";
import { LanguagesSlide } from "@/components/wrapped/slides/LanguagesSlide";
import { ReposSlide } from "@/components/wrapped/slides/ReposSlide";
import { StreakSlide } from "@/components/wrapped/slides/StreakSlide";
import { ClosingSlide } from "@/components/wrapped/slides/ClosingSlide";

function assertNever(value: never): never {
  throw new Error(`Slide kind sin renderer: ${JSON.stringify(value)}`);
}

export function SlideRenderer({ slide, locale }: { slide: WrappedSlide; locale: Locale }) {
  switch (slide.kind) {
    case "opening":
      return <OpeningSlide data={slide.data} locale={locale} />;
    case "volume":
      return <VolumeSlide data={slide.data} locale={locale} />;
    case "rhythm":
      return <RhythmSlide data={slide.data} locale={locale} />;
    case "languages":
      return <LanguagesSlide data={slide.data} locale={locale} />;
    case "repos":
      return <ReposSlide data={slide.data} locale={locale} />;
    case "streak":
      return <StreakSlide data={slide.data} locale={locale} />;
    case "closing":
      return <ClosingSlide data={slide.data} locale={locale} />;
    default:
      return assertNever(slide);
  }
}
