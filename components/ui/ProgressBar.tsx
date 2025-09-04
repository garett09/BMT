export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  return (
    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
      <div className="h-full brand-bg" style={{ width: pct + "%" }} />
    </div>
  );
}


