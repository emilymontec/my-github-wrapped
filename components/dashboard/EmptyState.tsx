interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-cool-line/20 py-16 text-center">
      <p className="font-display text-lg font-semibold text-white">{title}</p>
      <p className="max-w-sm text-sm text-cool-muted/70">{description}</p>
    </div>
  );
}
