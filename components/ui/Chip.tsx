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


