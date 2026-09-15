"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

interface LanguageEntry {
  language: string;
  percentage: number;
}

export interface LanguageChartProps {
  distribution: LanguageEntry[];
  locale: Locale;
}

// Paleta fija (no generada al azar) para que el mismo lenguaje tenga
// siempre el mismo color entre visitas — importa para reconocimiento,
// no solo estética.
const COLORS = ["#58a6ff", "#39d353", "#e3b341", "#f778ba", "#a371f7", "#79c0ff", "#ff7b72"];

export function LanguageChart({ distribution, locale }: LanguageChartProps) {
  const dict = getDictionary(locale).dashboard;

  if (distribution.length === 0) {
    return <p className="text-sm text-cool-muted/70">{dict.chartNoLanguages}</p>;
  }

  const top = distribution.slice(0, 7);

  return (
    <div className="flex items-center gap-6">
      <div className="h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={top}
              dataKey="percentage"
              nameKey="language"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              stroke="none"
            >
              {top.map((entry, index) => (
                <Cell key={entry.language} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#161b22",
                border: "1px solid #21262d",
                borderRadius: 8,
                fontSize: 12
              }}
              formatter={(value: number, name: string) => [`${value}%`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex flex-col gap-2 text-sm">
        {top.map((entry, index) => (
          <li key={entry.language} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-white">{entry.language}</span>
            <span className="text-cool-muted/70">{entry.percentage}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
