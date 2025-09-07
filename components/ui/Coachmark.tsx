"use client";
import { useEffect, useState } from "react";

export function Coachmark({ id, title, text, onClose }: { id: string; title: string; text: string; onClose?: () => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(`coach:${id}`);
      const first = localStorage.getItem("bmt:firstOpen");
      if (!first) localStorage.setItem("bmt:firstOpen", String(Date.now()));
      const withinWeek = (() => {
        const t = first ? Number(first) : Date.now();
        return Date.now() - t < 7 * 24 * 3600 * 1000;
      })();
      if (!seen && withinWeek) setOpen(true);
    } catch {}
  }, [id]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center p-4" onClick={() => { setOpen(false); try { localStorage.setItem(`coach:${id}`, "1"); } catch {}; onClose?.(); }}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 max-w-md w-full rounded-xl border card p-4 mb-[env(safe-area-inset-bottom)]" onClick={(e)=> e.stopPropagation()}>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-[var(--muted)] mt-1">{text}</div>
        <div className="mt-3 text-right">
          <button className="text-xs underline" onClick={() => { setOpen(false); try { localStorage.setItem(`coach:${id}`, "1"); } catch {}; onClose?.(); }}>Got it</button>
        </div>
      </div>
    </div>
  );
}


