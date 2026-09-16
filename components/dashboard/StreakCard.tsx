"use client";

import { getDictionary, t } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";
import { AnimatedStat } from "@/components/ui/AnimatedStat";

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  locale: Locale;
}

/**
 * Rediseño estilo Duolingo/TikTok: llama animada + número grande en vez
 * de dos columnas de texto plano. La animación es liviana a propósito
 * (transform/opacity en UN solo ícono chico) — nada de blur ni
 * backdrop-filter, misma disciplina que dejó el bug de freeze de GPU en
 * GlassCubeField (ver globals.css).
 */
export function StreakCard({ currentStreak, longestStreak, locale }: StreakCardProps) {
  const dict = getDictionary(locale).dashboard;
  const isRecord = currentStreak > 0 && currentStreak >= longestStreak;
  const isActive = currentStreak > 0;

  return (
    <div className="bento-panel flex flex-col items-center justify-center gap-1 p-6 text-center">
      <div className="relative flex h-16 w-16 items-center justify-center">
        {isActive && (
          <div className="flame-glow absolute inset-0 rounded-full bg-cool-violet/40 blur-md" aria-hidden="true" />
        )}
        <svg
          className={isActive ? "flame-icon relative" : "relative opacity-30"}
          width="52"
          height="52"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M12 2c1 3-2 4-2 7a4 4 0 0 0 8 0c0-1-.5-2-.5-2 2 1 3.5 3.5 3.5 6a7 7 0 1 1-14 0c0-4 2.5-6 3-8.5.3-1.5 1-2 2-2.5Z"
            fill={isActive ? "url(#flameGradient)" : "#8892b0"}
          />
          <defs>
            <linearGradient id="flameGradient" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#22d3ee" />
              <stop offset="1" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <p className="font-display text-4xl font-bold tabular-nums text-cool-text">
        <AnimatedStat value={currentStreak} />
      </p>
      <p className="text-sm text-cool-muted">
        {currentStreak === 0 ? dict.streakNoActive : dict.streakDaysInARow}
      </p>

      {isRecord ? (
        <span className="record-badge mt-2 inline-flex items-center gap-1 rounded-md border-2 border-cool-cyan/40 bg-cool-cyan/10 px-2.5 py-1 text-xs font-semibold text-cool-cyan">
          {dict.streakRecordNow}
        </span>
      ) : (
        <p className="mt-2 text-xs text-cool-muted/70">
          {t(dict.streakRecordOfPeriodValue, { value: longestStreak })}
        </p>
      )}
    </div>
  );
}
