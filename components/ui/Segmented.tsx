"use client";
export function Segmented({ value, onChange, options }: { value: string; onChange: (v: string)=>void; options: string[] }) {
  return (
    <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      {options.map((opt) => (
        <button key={opt} onClick={()=>onChange(opt)} className={`px-3 py-1.5 text-sm ${opt===value?"brand-bg text-white":"text-[var(--muted)] hover:text-[var(--foreground)]"}`}>{opt}</button>
      ))}
    </div>
  );
}


