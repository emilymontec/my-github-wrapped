"use client";

import { useMemo, useState } from "react";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

interface DayBucket {
  date: string;
  count: number;
}

export interface ActivityHeatmapProps {
  dailyDistribution: DayBucket[];
  locale: Locale;
}

/**
 * El heatmap SOLO dibuja lo que ya viene calculado en `dailyDistribution`
 * (lib/analytics/activity.ts::buildDailyDistribution). No agrupa por
 * semana con lógica propia de "qué es una semana" más allá de alinear la
 * grilla visualmente — la fecha y el conteo de cada día ya vienen
 * resueltos en la timezone del usuario desde el Analytics Engine.
 */
export function ActivityHeatmap({ dailyDistribution, locale }: ActivityHeatmapProps) {
  const dict = getDictionary(locale).dashboard;
  const WEEKDAY_LABELS = ["", dict.weekdayShort.mon, "", dict.weekdayShort.wed, "", dict.weekdayShort.fri, ""];
  const MONTH_LABELS = dict.monthsShort;

  const [hovered, setHovered] = useState<DayBucket | null>(null);

  const { weeks, monthMarkers, maxCount } = useMemo(() => {
    if (dailyDistribution.length === 0) {
      return {
        weeks: [] as (DayBucket | null)[][],
        monthMarkers: [] as { weekIndex: number; label: string }[],
        maxCount: 0
      };
    }

    const first = new Date(`${dailyDistribution[0].date}T00:00:00Z`);
    const leadingBlanks = first.getUTCDay(); // 0 = domingo

    const padded: (DayBucket | null)[] = [
      ...Array.from({ length: leadingBlanks }, () => null),
      ...dailyDistribution
    ];

    const weeksAcc: (DayBucket | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      weeksAcc.push(padded.slice(i, i + 7));
    }

    const markers: { weekIndex: number; label: string }[] = [];
    let lastMonth = -1;
    weeksAcc.forEach((week, weekIndex) => {
      const firstRealDay = week.find((d): d is DayBucket => d !== null);
      if (!firstRealDay) return;
      const month = new Date(`${firstRealDay.date}T00:00:00Z`).getUTCMonth();
      if (month !== lastMonth) {
        markers.push({ weekIndex, label: MONTH_LABELS[month] });
        lastMonth = month;
      }
    });

    const max = Math.max(1, ...dailyDistribution.map((d) => d.count));

    return { weeks: weeksAcc, monthMarkers: markers, maxCount: max };
  }, [dailyDistribution, MONTH_LABELS]);

  function levelFor(count: number): 0 | 1 | 2 | 3 | 4 {
    if (count === 0) return 0;
    const ratio = count / maxCount;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  }

  const heatClasses: Record<0 | 1 | 2 | 3 | 4, string> = {
    0: "bg-heat-0",
    1: "bg-heat-1",
    2: "bg-heat-2",
    3: "bg-heat-3",
    4: "bg-heat-4"
  };

  if (weeks.length === 0) {
    return <p className="text-sm text-neutral-500">{dict.chartNoActivity}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex flex-col gap-1 min-w-full">
        <div className="flex gap-[3px] pl-6 text-xs text-neutral-500">
          {weeks.map((_, weekIndex) => {
            const marker = monthMarkers.find((m) => m.weekIndex === weekIndex);
            return (
              <span key={weekIndex} className="w-[11px] shrink-0">
                {marker?.label ?? ""}
              </span>
            );
          })}
        </div>

        <div className="flex gap-[3px]">
          <div className="flex flex-col gap-[3px] pr-1 text-[10px] leading-[11px] text-neutral-500">
            {WEEKDAY_LABELS.map((label, i) => (
              <span key={i} className="h-[11px]">
                {label}
              </span>
            ))}
          </div>

          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-[3px]">
              {week.map((day, dayIndex) =>
                day === null ? (
                  <div key={dayIndex} className="h-[11px] w-[11px]" />
                ) : (
                  <div
                    key={dayIndex}
                    onMouseEnter={() => setHovered(day)}
                    onMouseLeave={() => setHovered(null)}
                    className={`h-[11px] w-[11px] rounded-[2px] ${heatClasses[levelFor(day.count)]} transition-transform hover:scale-125`}
                  />
                )
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pl-6 pt-1">
          <p className="text-xs text-neutral-500" aria-live="polite">
            {hovered
              ? `${hovered.count} ${hovered.count === 1 ? dict.commitSingular : dict.commitPlural} · ${hovered.date}`
              : dict.heatmapHoverHint}
          </p>
          <div className="flex items-center gap-1 text-xs text-neutral-500">
            <span>{dict.heatmapLess}</span>
            {([0, 1, 2, 3, 4] as const).map((level) => (
              <div key={level} className={`h-[11px] w-[11px] rounded-[2px] ${heatClasses[level]}`} />
            ))}
            <span>{dict.heatmapMore}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
