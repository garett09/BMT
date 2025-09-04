import type { ReactNode } from "react";

export function QuickActionCard({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border card p-4" style={{ background: "linear-gradient(135deg, #0f172a 0%, #0b1020 100%)" }}>
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-xs text-[var(--muted)] mt-1">{description}</div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}


