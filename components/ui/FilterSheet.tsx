"use client";
import { useEffect, useState } from "react";

export function FilterSheet({ id, children, onApply }: { id: string; children: React.ReactNode; onApply: () => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const prev = localStorage.getItem(`filtersheet:${id}:open`);
      if (prev === "1") setOpen(true);
    } catch {}
  }, [id]);

  function toggle() {
    setOpen((o) => {
      try { localStorage.setItem(`filtersheet:${id}:open`, o ? "0" : "1"); } catch {}
      return !o;
    });
  }

  return (
    <>
      <button className="rounded-md border px-3 py-2 text-xs" onClick={toggle}>{open ? "Hide Filters" : "Filters"}</button>
      {open && (
        <div className="fixed inset-0 z-40" onClick={toggle}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-xl border card p-3 max-w-md mx-auto" onClick={(e)=> e.stopPropagation()}>
            <div className="text-sm font-medium mb-2">Filters</div>
            <div className="space-y-2">{children}</div>
            <div className="mt-2 flex gap-2 justify-end"><button className="text-xs underline" onClick={toggle}>Close</button><button className="rounded-md brand-bg text-white px-3 py-2 text-xs" onClick={()=> { onApply(); toggle(); }}>Apply</button></div>
          </div>
        </div>
      )}
    </>
  );
}


