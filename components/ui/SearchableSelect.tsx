"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

export type SelectOption = { value: string; label: string };

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  className,
}: {
  options: SelectOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const current = options.find((o) => o.value === value)?.label || "";

  return (
    <div ref={ref} className={clsx("relative", className)}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full text-left border rounded-md px-3 py-2 bg-[var(--card)] border-[var(--border)]">
        {current || <span className="text-[var(--muted)]">{placeholder}</span>}
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--card)] shadow-lg">
          <div className="p-2 border-b border-[var(--border)]">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="w-full bg-transparent outline-none text-sm" />
          </div>
          <div className="max-h-48 overflow-auto">
            {filtered.length === 0 ? (
              <div className="p-2 text-xs text-[var(--muted)]">No results</div>
            ) : (
              filtered.map((o) => (
                <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); setQuery(""); }} className={clsx("w-full text-left px-3 py-2 text-sm hover:bg-white/5", value === o.value && "bg-white/10")}>{o.label}</button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}


