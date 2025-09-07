"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { TransactionRecord } from "@/lib/redis";
import { BottomNav } from "@/components/ui/BottomNav";
import { TopBar } from "@/components/ui/TopBar";
import { ListCard } from "@/components/ui/ListCard";
import { Chip } from "@/components/ui/Chip";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { ListSkeleton } from "@/components/ui/ListSkeleton";
import { Segmented } from "@/components/ui/Segmented";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import type { SelectGroup } from "@/components/ui/SearchableSelect";
import { incomeCategories, expenseCategories } from "@/components/constants";
import { FilterSheet } from "@/components/ui/FilterSheet";

export default function HistoryPage() {
  const [txs, setTxs] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0,7));
  const [accountId, setAccountId] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [visible, setVisible] = useState<number>(30);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    setLoading(true);
    const [res, ar] = await Promise.all([
      fetch("/api/transactions", { cache: "no-store", credentials: "include" }),
      fetch("/api/accounts", { cache: "no-store", credentials: "include" }),
    ]);
    if (res.ok) setTxs(await res.json());
    if (ar.ok) setAccounts(await ar.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisible((v) => v + 30);
    });
    io.observe(node);
    return () => io.disconnect();
  }, [sentinelRef]);

  const buildGroups: SelectGroup[] = useMemo(() => {
    // Merge income and expense catalogs into grouped list
    const toOptions = (cats: { name: string; subs?: string[] }[]) => cats.map((c) => ({ label: c.name, options: [{ value: c.name, label: c.name }, ...((c.subs || []).map((s) => ({ value: s, label: s })))] }));
    return [...toOptions(incomeCategories), ...toOptions(expenseCategories)];
  }, []);

  const filtered = useMemo(() => {
    const list = [...txs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return list.filter((t) => {
      if (filter !== "all" && t.type !== filter) return false;
      if (month && !(t.date || "").startsWith(month)) return false;
      if (accountId && t.accountId !== accountId) return false;
      if (category && !(t.category === category || t.subcategory === category)) return false;
      if (query) {
        const hay = `${t.description || ""} ${t.source || ""} ${t.classification || ""} ${t.category || ""} ${t.subcategory || ""}`.toLowerCase();
        if (!hay.includes(query.toLowerCase())) return false;
      }
      return true;
    });
  }, [txs, filter, month, accountId, category, query]);

  const visibleList = useMemo(() => filtered.slice(0, visible), [filtered, visible]);

  const grouped = useMemo(() => {
    const map = new Map<string, TransactionRecord[]>();
    for (const t of visibleList) {
      const key = (t.date || t.createdAt).slice(0,7);
      const arr = map.get(key) || [];
      arr.push(t);
      map.set(key, arr);
    }
    return [...map.entries()].sort(([a],[b])=> a < b ? 1 : -1); // newest month first
  }, [visibleList]);

  return (
    <PullToRefresh onRefresh={load}>
    <div className="min-h-dvh flex flex-col">
      <TopBar />
      <main className="flex-1 p-4 space-y-4 max-w-md mx-auto w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">History</h1>
          <FilterSheet id="history" onApply={()=> setVisible(30)}>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2"><Segmented value={filter} onChange={(v)=> setFilter(v as any)} options={["all","income","expense"]} /></div>
              <input className="border rounded-md px-3 py-2" type="month" value={month} onChange={(e)=> setMonth(e.target.value)} />
            </div>
          </FilterSheet>
        </div>

        <div className="col-span-2"><Segmented value={filter} onChange={(v)=>{ setFilter(v as "all"|"income"|"expense"); setVisible(30); }} options={["all","income","expense"]} /></div>

        <div className="grid grid-cols-2 gap-2">
          <input className="border rounded-md px-3 py-2" type="month" value={month} onChange={(e)=>{ setMonth(e.target.value); setVisible(30); }} />
          <input className="border rounded-md px-3 py-2" placeholder="Search notes/category" value={query} onChange={(e)=>{ setQuery(e.target.value); setVisible(30); }} />
          <SearchableSelect className="col-span-2" options={[{ value: "", label: "All Accounts" }, ...accounts.map((a)=>({ value: a.id, label: a.name }))]} value={accountId} onChange={(v)=>{ setAccountId(v); setVisible(30); }} placeholder="Account" />
          <SearchableSelect className="col-span-2" groups={buildGroups} value={category} onChange={(v)=>{ setCategory(v); setVisible(30); }} placeholder="Category or Subcategory" />
        </div>

        <div className="space-y-2">
          {loading ? (
            <ListSkeleton />
          ) : filtered.length === 0 ? (
            <div className="rounded-md border card p-4 text-center text-sm text-[var(--muted)]">No transactions yet.</div>
          ) : (
            grouped.map(([m, list]) => (
              <div key={m} className="space-y-2">
                <div className="sticky top-[52px] z-10 bg-background/90 backdrop-blur border-b px-1 py-1 text-xs text-[var(--muted)]">{m}</div>
                {list.map((t) => (
                  <ListCard
                    key={t.id}
                    className={t.type === "income" ? "border-l-4 border-l-[var(--positive)]" : "border-l-4 border-l-[var(--negative)]"}
                    left={<div className="flex items-center gap-2"><Chip tone={t.type === "income" ? "pos" : "neg"}>{t.type}</Chip><span>{t.category}{t.subcategory ? ` • ${t.subcategory}` : ""}</span></div>}
                    sub={<div className="text-[10px] text-[var(--muted)]">{t.date}</div>}
                    right={<div className={t.type === "income" ? "text-[var(--positive)]" : "text-[var(--negative)]"}>₱{t.amount.toLocaleString()}</div>}
                  />
                ))}
              </div>
            ))
          )}
          <div ref={sentinelRef} />
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


