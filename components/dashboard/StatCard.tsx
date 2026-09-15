import { AnimatedStat } from "@/components/ui/AnimatedStat";

interface StatCardProps {
  value: string | number;
  label: string;
  accent?: boolean;
}

export function StatCard({ value, label, accent = false }: StatCardProps) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className={`font-display text-4xl font-semibold tabular-nums ${
          accent ? "text-cool-cyan" : "text-white"
        }`}
      >
        {typeof value === "number" ? <AnimatedStat value={value} /> : value}
      </span>
      <span className="text-sm text-cool-muted">{label}</span>
    </div>
  );
}
