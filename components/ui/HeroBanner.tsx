export function HeroBanner({ title, subtitle, color = "#22c55e" }: { title: string; subtitle?: string; color?: string }) {
  return (
    <div className="rounded-2xl border card p-4" style={{ background: `radial-gradient(600px 200px at 10% -10%, ${color}22 0%, transparent 50%)` }}>
      <div className="text-lg font-semibold">{title}</div>
      {subtitle && <div className="text-sm text-[var(--muted)]">{subtitle}</div>}
    </div>
  );
}


