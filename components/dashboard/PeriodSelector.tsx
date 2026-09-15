"use client";

import { PERIOD_OPTIONS, getPeriodLabels, type PeriodOption } from "@/lib/dashboard/period";
import type { Locale } from "@/lib/i18n/locales";

interface PeriodSelectorProps {
  value: PeriodOption;
  onChange: (period: PeriodOption) => void;
  disabled?: boolean;
  locale: Locale;
}

export function PeriodSelector({ value, onChange, disabled = false, locale }: PeriodSelectorProps) {
  const labels = getPeriodLabels(locale);
  return (
    <div className="inline-flex rounded-full border border-cool-line/20 bg-cool-panel p-1">
      {PERIOD_OPTIONS.map((option) => {
        const isActive = option === value;
        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option)}
            className={`rounded-full px-3.5 py-1.5 text-sm transition-colors disabled:opacity-50 ${
              isActive
                ? "bg-cool-violet text-white"
                : "text-cool-muted hover:text-white"
            }`}
          >
            {labels[option]}
          </button>
        );
      })}
    </div>
  );
}
