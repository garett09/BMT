"use client";
import { useEffect, useMemo, useState } from "react";
import type { TransactionRecord } from "@/lib/redis";
import { BottomNav } from "@/components/ui/BottomNav";
import { ListSkeleton } from "@/components/ui/ListSkeleton";
import { Section } from "@/components/Section";
import { KpiCard } from "@/components/KpiCard";
import { Segmented } from "@/components/ui/Segmented";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

export default function CashflowPage() {
  const [txs, setTxs] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"6m"|"12m">("12m");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/transactions", { cache: "no-store", credentials: "include" });
    if (res.ok) setTxs(await res.json());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const monthly = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const t of txs) {
      const key = (t.date || t.createdAt).slice(0,7);
      const curr = map.get(key) || { income: 0, expense: 0 };
      curr[t.type] += t.amount;
      map.set(key, curr);
    }
    const rows = [...map.entries()].sort(([a],[b])=> a < b ? -1 : 1).map(([month, v])=> ({ month, income: v.income, expense: v.expense, net: v.income - v.expense }));
    const tail = range === "6m" ? rows.slice(-6) : rows.slice(-12);
    return tail;
  }, [txs, range]);

  const kpis = useMemo(() => {
    const r = monthly;
    const avgIncome = r.length ? Math.round(r.reduce((s,x)=>s+x.income,0)/r.length) : 0;
    const avgExpense = r.length ? Math.round(r.reduce((s,x)=>s+x.expense,0)/r.length) : 0;
    const avgNet = r.length ? Math.round(r.reduce((s,x)=>s+x.net,0)/r.length) : 0;
    const last = r[r.length-1] || { net: 0 };
    return { avgIncome, avgExpense, avgNet, lastNet: last.net };
  }, [monthly]);

  return (
    <div className="min-h-dvh flex flex-col">
      <main className="flex-1 p-4 space-y-4 max-w-md mx-auto w-full">
        <h1 className="text-xl font-semibold">Cashflow</h1>
        <div className="mb-2"><Segmented value={range} onChange={(v)=> setRange(v as any)} options={["6m","12m"]} /></div>
        {loading ? (
          <ListSkeleton />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 text-center">
              <KpiCard label="Avg Income" value={`₱${kpis.avgIncome.toLocaleString()}`} tone="pos" />
              <KpiCard label="Avg Expense" value={`₱${kpis.avgExpense.toLocaleString()}`} tone="neg" />
              <KpiCard label="Avg Net" value={`₱${kpis.avgNet.toLocaleString()}`} tone={kpis.avgNet>=0?"pos":"neg"} />
            </div>
            <Section title="Monthly Inflow vs Outflow">
              <div className="w-full h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly}>
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis hide />
                    <Tooltip formatter={(v: number)=>`₱${Number(v).toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="income" fill="#22c55e" radius={[4,4,0,0]} name="Income" />
                    <Bar dataKey="expense" fill="#ef4444" radius={[4,4,0,0]} name="Expense" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>
            <Section title="Net Cashflow">
              <div className="grid grid-cols-1 gap-2 text-xs">
                {monthly.map((m)=> (
                  <div key={m.month} className="flex items-center justify-between border-b border-[var(--border)]/50 pb-1">
                    <span>{m.month}</span>
                    <span className={m.net>=0?"text-[var(--positive)]":"text-[var(--negative)]"}>₱{m.net.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </Section>
          </>
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


