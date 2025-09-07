"use client";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/ui/TopBar";

type Notification = { id: string; type: "budget" | "spend" | "savings" | "insight"; message: string; priority: 1 | 2 | 3; createdAt: string; read?: boolean };

export default function NotificationsPage() {
  const [list, setList] = useState<Notification[]>([]);

  const load = async () => {
    const res = await fetch("/api/notifications", { cache: "no-store", credentials: "include" });
    if (res.ok) setList(await res.json());
  };
  useEffect(() => { load(); }, []);

  const markAll = async () => {
    await fetch("/api/notifications", { method: "PUT", credentials: "include" });
    load();
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <TopBar />
      <main className="flex-1 p-4 space-y-4 max-w-md mx-auto w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Notifications</h1>
          <button onClick={markAll} className="text-sm underline">Mark all read</button>
        </div>
        <div className="space-y-2">
          {list.length === 0 ? (
            <div className="rounded-md border card p-4 text-sm">
              <div className="font-medium mb-1">Inbox is clear</div>
              <div className="text-[var(--muted)]">You'll see alerts here for budgets, goals and spending insights.</div>
            </div>
          ) : (
            list.map((n) => (
              <div key={n.id} className="border rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium capitalize">{n.type}</div>
                  <div className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-sm mt-1">{n.message}</div>
              </div>
            ))
          )}
        </div>
      </main>
      <nav className="sticky bottom-0 border-t bg-background">
        <div className="grid grid-cols-3 max-w-md mx-auto">
          <a href="/dashboard" className="p-3 text-center text-sm">Dashboard</a>
          <a href="/transactions" className="p-3 text-center text-sm">Transactions</a>
          <a href="/notifications" className="p-3 text-center text-sm">Inbox</a>
        </div>
      </nav>
    </div>
  );
}


