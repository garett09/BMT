"use client";
import { useEffect, useMemo, useState } from "react";
import type { TransactionRecord } from "@/lib/redis";
import { BottomNav } from "@/components/ui/BottomNav";
import { ListCard } from "@/components/ui/ListCard";
import { Chip } from "@/components/ui/Chip";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { ListSkeleton } from "@/components/ui/ListSkeleton";
import { Segmented } from "@/components/ui/Segmented";

export default function HistoryPage() {
  const [txs, setTxs] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/transactions", { cache: "no-store", credentials: "include" });
    if (res.ok) setTxs(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const list = [...txs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    if (filter === "all") return list;
    return list.filter((t) => t.type === filter);
  }, [txs, filter]);

  return (
    <PullToRefresh onRefresh={load}>
    <div className="min-h-dvh flex flex-col">
      <main className="flex-1 p-4 space-y-4 max-w-md mx-auto w-full">
        <h1 className="text-xl font-semibold">History</h1>

        <div className="col-span-2"><Segmented value={filter} onChange={(v)=>setFilter(v as any)} options={["all","income","expense"]} /></div>

        <div className="space-y-2">
          {loading ? (
            <ListSkeleton />
          ) : filtered.length === 0 ? (
            <div className="rounded-md border card p-4 text-center text-sm text-[var(--muted)]">No transactions yet.</div>
          ) : (
            filtered.map((t) => (
              <ListCard
                key={t.id}
                left={<div className="flex items-center gap-2"><Chip tone={t.type === "income" ? "pos" : "neg"}>{t.type}</Chip><span>{t.category}{t.subcategory ? ` • ${t.subcategory}` : ""}</span></div>}
                sub={<div className="text-[10px] text-[var(--muted)]">{t.date}</div>}
                right={<div className={t.type === "income" ? "text-[var(--positive)]" : "text-[var(--negative)]"}>₱{t.amount.toLocaleString()}</div>}
              />
            ))
          )}
        </div>
      </main>
      <BottomNav items={[
        { href: "/dashboard", label: "Dashboard" },
        { href: "/transactions", label: "Transactions" },
        { href: "/history", label: "History", active: true },
        { href: "/accounts", label: "Accounts" },
      ]} />
    </div>
    </PullToRefresh>
  );
}


