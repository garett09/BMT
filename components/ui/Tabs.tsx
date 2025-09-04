"use client";
import clsx from "clsx";

export function Tabs({ items, active, onChange }: { items: string[]; active: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar">
      {items.map((it) => (
        <button
          key={it}
          onClick={() => onChange(it)}
          className={clsx(
            "px-3 py-1.5 rounded-lg border text-sm",
            active === it ? "border-[var(--brand-solid)] text-white bg-[var(--brand-solid)]/15" : "border-[var(--border)] text-[var(--muted)] bg-[var(--card)] hover:text-[var(--foreground)]"
          )}
        >
          {it}
        </button>
      ))}
    </div>
  );
}


