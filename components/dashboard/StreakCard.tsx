import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  locale: Locale;
}

export function StreakCard({ currentStreak, longestStreak, locale }: StreakCardProps) {
  const dict = getDictionary(locale).dashboard;
  const isRecord = currentStreak > 0 && currentStreak >= longestStreak;

  return (
    <div className="flex items-center justify-between rounded-xl border border-wrapped-border bg-wrapped-card p-6">
      <div>
        <p className="font-display text-4xl font-semibold tabular-nums text-wrapped-amber">
          {currentStreak}
        </p>
        <p className="text-sm text-neutral-400">
          {currentStreak === 0 ? dict.streakNoActive : dict.streakDaysInARow}
        </p>
      </div>
      <div className="h-10 w-px bg-wrapped-border" />
      <div className="text-right">
        <p className="font-display text-2xl font-semibold tabular-nums text-neutral-300">
          {longestStreak}
        </p>
        <p className="text-sm text-neutral-500">
          {isRecord ? dict.streakRecordNow : dict.streakRecordOfPeriod}
        </p>
      </div>
    </div>
  );
}
