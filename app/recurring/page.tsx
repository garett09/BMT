"use client";
import { useEffect, useState } from "react";
import { BottomNav } from "@/components/ui/BottomNav";
import { TopBar } from "@/components/ui/TopBar";
import { Button } from "@/components/ui/Button";
import { ListSkeleton } from "@/components/ui/ListSkeleton";
import { useToast } from "@/components/ui/Toast";

type RecurringTemplate = {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  subcategory?: string;
  accountId?: string;
  frequency: "daily" | "weekly" | "monthly" | "weekday" | "15th";
  lastRun?: string;
};

export default function RecurringPage() {
  const { push } = useToast();
  const [list, setList] = useState<RecurringTemplate[]>([]);
  const [due, setDue] = useState<RecurringTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [allRes, dueRes] = await Promise.all([
      fetch("/api/recurring", { cache: "no-store", credentials: "include" }),
      fetch("/api/recurring/run", { cache: "no-store", credentials: "include" }),
    ]);
    if (allRes.ok) setList(await allRes.json());
    if (dueRes.ok) setDue((await dueRes.json()).due || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runNow = async () => {
    const res = await fetch("/api/recurring/run", { method: "POST", credentials: "include" });
    if (res.ok) { const d = await res.json(); push({ title: `Posted ${d.posted} entries`, type: "success" }); load(); }
    else push({ title: "Run failed", type: "error" });
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <TopBar />
      <main className="flex-1 p-4 space-y-4 max-w-md mx-auto w-full">
        <h1 className="text-xl font-semibold">Recurring</h1>
        <div className="rounded-md border card p-3 flex items-center justify-between">
          <div className="text-sm">Due today: <span className="font-medium">{due.length}</span></div>
          <Button onClick={runNow} variant="secondary">Run Now</Button>
        </div>
        {loading ? (
          <ListSkeleton />
        ) : list.length === 0 ? (
          <div className="rounded-md border card p-4 text-center text-sm text-[var(--muted)]">No recurring templates yet.</div>
        ) : (
          <div className="space-y-2">
            {list.map((r) => (
              <div key={r.id} className="rounded-md border card p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{r.type} • {r.category} {r.subcategory ? `• ${r.subcategory}` : ""}</div>
                  <div className="text-xs text-[var(--muted)]">₱{r.amount.toLocaleString()} • {r.frequency} {r.lastRun ? `• last ${r.lastRun}` : ""}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav items={[
        { href: "/dashboard", label: "Dashboard" },
        { href: "/transactions", label: "Transactions" },
        { href: "/history", label: "History" },
        { href: "/accounts", label: "Accounts" },
      ]} />
    </div>
  );
}


