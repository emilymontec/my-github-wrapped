interface ComparisonMetricRowProps {
  label: string;
  valueA: string | number;
  valueB: string | number;
  higherIsA?: boolean | null;
}

export function ComparisonMetricRow({ label, valueA, valueB, higherIsA }: ComparisonMetricRowProps) {
  return (
    <div className="grid grid-cols-3 items-center gap-4 border-b border-cool-line/20 py-3 last:border-0">
      <span
        className={`text-right font-display text-xl tabular-nums ${
          higherIsA === true ? "text-cool-cyan" : "text-cool-muted"
        }`}
      >
        {valueA}
      </span>
      <span className="text-center text-xs uppercase tracking-wide text-cool-muted/70">{label}</span>
      <span
        className={`text-left font-display text-xl tabular-nums ${
          higherIsA === false ? "text-cool-cyan" : "text-cool-muted"
        }`}
      >
        {valueB}
      </span>
    </div>
  );
}
