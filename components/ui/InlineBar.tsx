export function InlineBar({ value, max = 100, color = "#22c55e" }: { value: number; max?: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
      <div className="h-full" style={{ width: pct + "%", background: color }} />
    </div>
  );
}


