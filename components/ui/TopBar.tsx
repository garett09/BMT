"use client";
import { useEffect, useState } from "react";
import { Search, Bell, Download } from "lucide-react";
import Link from "next/link";

export function TopBar() {
  const [badge, setBadge] = useState<number>(0);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // fetch unread notifications count
    fetch("/api/notifications", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((list) => {
        const unread = (list || []).filter((n: { read?: boolean }) => !n.read).length;
        setBadge(unread);
      })
      .catch(() => {});

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <header className="sticky top-0 z-20 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50 border-b">
      <div className="max-w-md mx-auto p-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              className="w-full rounded-xl bg-[var(--card)] border border-[var(--border)] px-9 py-2 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-solid)]/40"
              placeholder="Search transactions, goals, accounts..."
            />
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          </div>
          {deferredPrompt && (
            <button onClick={install} className="rounded-lg p-2 border border-[var(--border)] bg-[var(--card)]" title="Install App">
              <Download size={16} />
            </button>
          )}
          <Link href="/notifications" className="relative rounded-lg p-2 border border-[var(--border)] bg-[var(--card)]">
            <Bell size={16} />
            {badge > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] px-1 rounded">{badge}</span>
            )}
          </Link>
          <form action="/api/auth/logout" method="post">
            <button className="rounded-lg p-2 border border-[var(--border)] bg-[var(--card)]" title="Logout">⎋</button>
          </form>
        </div>
      </div>
    </header>
  );
}


