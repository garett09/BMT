"use client";
import { useEffect, useMemo, useState } from "react";
import { computeAnalytics } from "@/lib/analytics";
import { forecastBudget } from "@/lib/intelligentBudget";
import type { TransactionRecord } from "@/lib/redis";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { KpiCard } from "@/components/KpiCard";
import { Tabs } from "@/components/ui/Tabs";
import { StatCard } from "@/components/StatCard";
import { Section } from "@/components/Section";
import { TrendChart } from "@/components/charts/TrendChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { ArrowDownRight, ArrowUpRight, DollarSign, Target } from "lucide-react";

export function EnhancedDashboard() {
  const [txs, setTxs] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch("/api/transactions", { cache: "no-store" });
      if (res.ok) setTxs(await res.json());
      setLoading(false);
    })();
  }, []);

  const analytics = useMemo(() => computeAnalytics(txs), [txs]);
  const monthISO = new Date().toISOString().slice(0, 7);
  const forecast = useMemo(() => forecastBudget(txs, monthISO), [txs, monthISO]);

  const chartData = useMemo(() => {
    return Object.entries(analytics.byCategory)
      .sort(([, a], [, b]) => b.expense - a.expense)
      .slice(0, 6)
      .map(([name, v]) => ({ name, expense: v.expense }));
  }, [analytics]);

  const trendData = useMemo(() => {
    // simple 7-day trend from tx dates
    const map = new Map<string, number>();
    for (const t of txs) {
      const key = (t.date || t.createdAt).slice(5, 10);
      map.set(key, (map.get(key) || 0) + (t.type === "expense" ? t.amount : 0));
    }
    return [...map.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-7)
      .map(([name, value]) => ({ name, value }));
  }, [txs]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <KpiCard label="Income" value={`₱${analytics.totalIncome.toLocaleString()}`} tone="pos" />
        <KpiCard label="Expense" value={`₱${analytics.totalExpense.toLocaleString()}`} tone="neg" />
        <KpiCard label="Balance" value={`₱${analytics.balance.toLocaleString()}`} tone={analytics.balance >= 0 ? "pos" : "neg"} />
      </div>

      <div className="rounded-md border card p-3">
        <div className="flex items-baseline justify-between">
          <div className="text-sm font-medium">This Month Budget</div>
          <div className="text-xs text-[var(--muted)]">Conf {Math.round(forecast.confidence * 100)}%</div>
        </div>
        <div className="text-xl font-semibold brand-text">₱{forecast.recommendedBudget.toLocaleString()}</div>
        {forecast.insights.length > 0 && (
          <ul className="mt-2 list-disc pl-4 text-xs text-[var(--muted)]">
            {forecast.insights.map((i, idx) => (
              <li key={idx}>{i}</li>
            ))}
          </ul>
        )}
      </div>

      <Tabs items={["Overview", "Trends", "Insights", "Budget", "Predictions", "Historical"]} active={"Overview"} onChange={() => {}} />

      <div className="grid grid-cols-1 gap-3">
        <div className="grid grid-cols-2 gap-3">
          <StatCard title="Total Income" value={`₱${analytics.totalIncome.toLocaleString()}`} icon={<ArrowUpRight size={16} />} tone="pos" />
          <StatCard title="Total Expenses" value={`₱${analytics.totalExpense.toLocaleString()}`} icon={<ArrowDownRight size={16} />} tone="neg" />
          <StatCard title="Net Income" value={`₱${analytics.balance.toLocaleString()}`} icon={<DollarSign size={16} />} />
          <StatCard title="Transactions" value={`${txs.length}`} icon={<Target size={16} />} />
        </div>

        <Section title="Spending Trends">
          <TrendChart data={trendData} />
        </Section>

        <Section title="Top Spending Categories">
          <div className="grid grid-cols-2 gap-3">
            <DonutChart data={chartData.map((d) => ({ name: d.name, value: d.expense }))} />
            <div className="text-xs text-[var(--muted)] space-y-1">
              {chartData.map((d) => (
                <div key={d.name} className="flex items-center justify-between border-b border-[var(--border)]/50 pb-1">
                  <span>{d.name}</span>
                  <span className="text-white">₱{d.expense.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>

      {loading && <div className="text-xs text-muted-foreground">Loading data…</div>}
    </div>
  );
}


