import type { ReactNode } from "react";
import clsx from "clsx";

export function ListCard({ left, right, sub, className }: { left: ReactNode; right: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={clsx("border rounded-xl card p-3", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full">
        <div className="min-w-0">
          <div className="text-sm font-medium">{left}</div>
          {sub && <div className="text-xs text-[var(--muted)]">{sub}</div>}
        </div>
        <div className="text-sm font-semibold flex flex-wrap gap-2 justify-end sm:justify-start">
          {right}
        </div>
      </div>
    </div>
  );
}


