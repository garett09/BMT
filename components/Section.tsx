import type { ReactNode } from "react";

export function Section({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="rounded-2xl border card p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">{title}</div>
        {actions}
      </div>
      {children}
    </div>
  );
}


