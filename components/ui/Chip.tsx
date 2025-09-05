import clsx from "clsx";

export function Chip({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: "neutral" | "pos" | "neg" | "info"; className?: string }) {
  const tones: Record<string, string> = {
    neutral: "bg-white/5 text-[var(--foreground)] border-[var(--border)]",
    pos: "bg-[var(--positive)]/15 text-[var(--positive)] border-[var(--positive)]/30",
    neg: "bg-[var(--negative)]/15 text-[var(--negative)] border-[var(--negative)]/30",
    info: "bg-[#06b6d4]/15 text-[#06b6d4] border-[#06b6d4]/30",
  };
  return <span className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-[10px] border", tones[tone], className)}>{children}</span>;
}

export function ProviderBadge({ name, className }: { name: string; className?: string }) {
  const colors: Record<string, string> = {
    BPI: "#dc2626",
    BDO: "#1d4ed8",
    Metrobank: "#0ea5e9",
    PNB: "#0ea5e9",
    Chinabank: "#ef4444",
    "Security Bank": "#22c55e",
    RCBC: "#0ea5e9",
    UnionBank: "#f97316",
    EastWest: "#a855f7",
    LandBank: "#16a34a",
    UCPB: "#0ea5e9",
    AUB: "#f59e0b",
    PSBank: "#ef4444",
    Maya: "#22c55e",
    GCash: "#2563eb",
    GrabPay: "#16a34a",
    ShopeePay: "#ea580c",
  } as const;
  const color = colors[name] || "#64748b";
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-[10px] border", className)} style={{ color, backgroundColor: color + "26", borderColor: color + "40" }}>
      {name}
    </span>
  );
}

export function ProviderLogo({ name, className }: { name: string; className?: string }) {
  const colors: Record<string, string> = {
    BPI: "#dc2626",
    BDO: "#1d4ed8",
    Metrobank: "#0ea5e9",
    PNB: "#0ea5e9",
    Chinabank: "#ef4444",
    "Security Bank": "#22c55e",
    RCBC: "#0ea5e9",
    UnionBank: "#f97316",
    EastWest: "#a855f7",
    LandBank: "#16a34a",
    UCPB: "#0ea5e9",
    AUB: "#f59e0b",
    PSBank: "#ef4444",
    Maya: "#22c55e",
    GCash: "#2563eb",
    GrabPay: "#16a34a",
    ShopeePay: "#ea580c",
  } as const;
  const color = colors[name] || "#64748b";
  const initials = name.split(/\s+/).map(s=>s[0]).join("").slice(0,2).toUpperCase();
  return (
    <span className={clsx("inline-flex items-center justify-center rounded-full text-[10px] font-semibold", className)} style={{ width: 18, height: 18, backgroundColor: color+"26", color, border: `1px solid ${color}40` }}>
      {initials}
    </span>
  );
}


