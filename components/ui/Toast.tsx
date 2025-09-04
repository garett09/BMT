"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type Toast = { id: number; title: string; type?: "success" | "error" | "info" };
const ToastCtx = createContext<{ push: (t: Omit<Toast, "id">) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, ...t }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 2500);
  }, []);
  const value = useMemo(() => ({ push }), [push]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="fixed bottom-16 left-0 right-0 mx-auto max-w-md space-y-2 px-4">
        {toasts.map((t) => (
          <div key={t.id} className={`rounded-md px-3 py-2 text-sm border card ${t.type === "error" ? "border-red-600/40" : t.type === "success" ? "border-emerald-600/40" : ""}`}>
            {t.title}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}


