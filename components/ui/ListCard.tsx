import type { ReactNode } from "react";

export function ListCard({ left, right, sub }: { left: ReactNode; right: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex items-center justify-between border rounded-xl card p-3">
      <div>
        <div className="text-sm font-medium">{left}</div>
        {sub && <div className="text-xs text-[var(--muted)]">{sub}</div>}
      </div>
      <div className="text-sm font-semibold">{right}</div>
    </div>
  );
}


