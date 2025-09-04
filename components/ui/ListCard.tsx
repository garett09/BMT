import type { ReactNode } from "react";
import clsx from "clsx";

export function ListCard({ left, right, sub, className }: { left: ReactNode; right: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={clsx("flex items-center justify-between border rounded-xl card p-3", className)}>
      <div>
        <div className="text-sm font-medium">{left}</div>
        {sub && <div className="text-xs text-[var(--muted)]">{sub}</div>}
      </div>
      <div className="text-sm font-semibold">{right}</div>
    </div>
  );
}


