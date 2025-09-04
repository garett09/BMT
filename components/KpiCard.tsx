export function KpiCard({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "pos" | "neg" }) {
  const toneClass = tone === "pos" ? "text-[var(--positive)]" : tone === "neg" ? "text-[var(--negative)]" : "";
  return (
    <div className="rounded-md border card p-3 text-center">
      <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">{label}</div>
      <div className={`text-lg font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}


