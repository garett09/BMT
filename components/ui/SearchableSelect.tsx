"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

export type SelectOption = { value: string; label: string };
export type SelectGroup = { label: string; options: SelectOption[] };

export function SearchableSelect({
  options,
  groups,
  value,
  onChange,
  placeholder = "Select…",
  className,
}: {
  options?: SelectOption[];
  groups?: SelectGroup[];
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

  const isGrouped = Array.isArray(groups) && groups.length > 0;

  const filteredGroups: SelectGroup[] = useMemo(() => {
    if (!isGrouped) return [];
    const q = query.trim().toLowerCase();
    const src = groups as SelectGroup[];
    if (!q) return src;
    return src
      .map((g) => ({
        label: g.label,
        options: g.options.filter((o) => o.label.toLowerCase().includes(q)),
      }))
      .filter((g) => g.options.length > 0);
  }, [groups, isGrouped, query]);

  const filteredOptions: SelectOption[] = useMemo(() => {
    if (isGrouped) return [];
    const q = query.trim().toLowerCase();
    const src = options || [];
    if (!q) return src;
    return src.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, isGrouped, query]);

  const current = useMemo(() => {
    if (isGrouped) {
      for (const g of groups || []) {
        const found = g.options.find((o) => o.value === value);
        if (found) return found.label;
      }
      return "";
    }
    const arr = options || [];
    return arr.find((o) => o.value === value)?.label || "";
  }, [options, groups, value, isGrouped]);

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
            {!isGrouped ? (
              filteredOptions.length === 0 ? (
                <div className="p-2 text-xs text-[var(--muted)]">No results</div>
              ) : (
                filteredOptions.map((o) => (
                  <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); setQuery(""); }} className={clsx("w-full text-left px-3 py-2 text-sm hover:bg-white/5", value === o.value && "bg-white/10")}>{o.label}</button>
                ))
              )
            ) : (
              filteredGroups.length === 0 ? (
                <div className="p-2 text-xs text-[var(--muted)]">No results</div>
              ) : (
                filteredGroups.map((g) => (
                  <div key={g.label}>
                    <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-[var(--muted)]">{g.label}</div>
                    {g.options.map((o) => (
                      <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); setQuery(""); }} className={clsx("w-full text-left px-3 py-2 text-sm hover:bg-white/5", value === o.value && "bg-white/10")}>{o.label}</button>
                    ))}
                  </div>
                ))
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}


