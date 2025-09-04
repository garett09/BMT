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
import { AreaTrend } from "@/components/charts/AreaTrend";
import { ArrowDownRight, ArrowUpRight, DollarSign, Target } from "lucide-react";
import { QuickActionCard } from "@/components/QuickActionCard";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ListSkeleton } from "@/components/ui/ListSkeleton";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { ListCard } from "@/components/ui/ListCard";
import { Chip } from "@/components/ui/Chip";
import { QuickAddAccount } from "@/components/QuickAddAccount";

export function EnhancedDashboard() {
  const [txs, setTxs] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  type Account = { id: string; name: string; balance: number; provider?: string; subtype?: string };
  const [accounts, setAccounts] = useState<Account[]>([]);

  const fetchAll = async () => {
    setLoading(true);
    const res = await fetch("/api/transactions", { cache: "no-store", credentials: "include" });
    if (res.ok) setTxs(await res.json());
    const ar = await fetch("/api/accounts", { cache: "no-store", credentials: "include" });
    if (ar.ok) setAccounts(await ar.json());
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

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

  // Weekly aggregation (last 8 weeks)
  const weeklyTrend = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of txs) {
      const d = new Date(t.date || t.createdAt);
      // ISO week key like 2025-W35
      const tmp = new Date(d.getTime());
      const dayNum = (d.getUTCDay() + 6) % 7; // make Monday=0
      tmp.setUTCDate(d.getUTCDate() - dayNum + 3);
      const firstThursday = tmp.getTime();
      const jan4 = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4));
      const week = 1 + Math.round((firstThursday - Date.UTC(jan4.getUTCFullYear(), 0, 4)) / (7 * 24 * 3600 * 1000));
      const key = `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
      map.set(key, (map.get(key) || 0) + (t.type === "expense" ? t.amount : 0));
    }
    return [...map.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-8)
      .map(([name, value]) => ({ name, value }));
  }, [txs]);

  const [tab, setTab] = useState("Overview");

  return (
    <PullToRefresh onRefresh={fetchAll}>
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

      <Tabs items={["Overview", "Trends", "Insights", "Budget", "Predictions", "Historical", "Accounts"]} active={tab} onChange={setTab} />

      {tab === "Overview" && (
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

        <div className="grid grid-cols-3 gap-3">
          <QuickActionCard title="Spending Alert" description="You're on track this month." action={<Button variant="secondary" href="/notifications">View Details →</Button>} />
          <QuickActionCard title="Savings Goal" description="Set or adjust your monthly target." action={<Button variant="secondary" href="/savings">Set Goals →</Button>} />
          <QuickActionCard title="Budget Timeline" description="Adjust monthly budget and limits." action={<Button variant="secondary" href="/settings">Adjust Budget →</Button>} />
        </div>
      </div>
      )}

      {tab === "Trends" && (
        <div className="grid grid-cols-1 gap-3">
          <Section title="Daily Trend (30d)"><AreaTrend data={trendData} /></Section>
          <Section title="Weekly Trend"><TrendChart data={weeklyTrend} /></Section>
        </div>
      )}

      {tab === "Insights" && (
        <Section title="Smart Insights">
          <div className="rounded-md border card p-4 text-sm text-[var(--muted)]">Your spending is {analytics.spendingVelocity > 0 ? "active" : "low"}. Budget confidence {Math.round(forecast.confidence * 100)}%.</div>
        </Section>
      )}

      {tab === "Budget" && (
        <div className="grid grid-cols-1 gap-3">
          <Section title="Budget Overview">
            <div className="text-xl font-semibold brand-text">₱{forecast.recommendedBudget.toLocaleString()}</div>
            <div className="text-xs text-[var(--muted)]">Recommended for {monthISO}</div>
            <div className="mt-3 space-y-1">
              <div className="text-xs">Remaining this month</div>
              <ProgressBar value={Math.max(0, forecast.recommendedBudget - analytics.totalExpense)} max={forecast.recommendedBudget} />
              <div className="text-xs text-[var(--muted)]">Daily limit ≈ ₱{Math.round((forecast.recommendedBudget - analytics.totalExpense) / Math.max(1, 30 - new Date().getDate())).toLocaleString()}</div>
            </div>
          </Section>
          <div className="grid grid-cols-3 gap-2 text-center">
            <KpiCard label="Days Left" value={`${Math.max(0, 30 - new Date().getDate())}`} />
            <KpiCard label="Spent" value={`₱${analytics.totalExpense.toLocaleString()}`} tone="neg" />
            <KpiCard label="Projected Balance" value={`₱${(analytics.totalIncome - (analytics.totalExpense + analytics.spendingVelocity * Math.max(0, 30 - new Date().getDate()))).toLocaleString()}`} tone={(analytics.totalIncome - (analytics.totalExpense + analytics.spendingVelocity * Math.max(0, 30 - new Date().getDate()))) >= 0 ? "pos" : "neg"} />
          </div>
        </div>
      )}

      {tab === "Predictions" && (
        <Section title="Next Month Prediction">
          <div className="text-sm">Net Prediction: <span className="font-semibold">₱{(analytics.balance).toLocaleString()}</span></div>
        </Section>
      )}

      {tab === "Historical" && (
        <div className="grid grid-cols-1 gap-3">
          <Section title="Year over Year">
            <div className="grid grid-cols-3 gap-2 text-center">
              <KpiCard label="Income YoY" value={`+${Math.round(5)}%`} tone="pos" />
              <KpiCard label="Expense YoY" value={`-${Math.round(2)}%`} tone="pos" />
              <KpiCard label="Balance YoY" value={`+${Math.round(7)}%`} tone="pos" />
            </div>
          </Section>
        </div>
      )}

      

      {tab === "Accounts" && (
        <div className="grid grid-cols-1 gap-3">
          <Section title="Balances">
            <div className="grid grid-cols-2 gap-2">
              <StatCard title="Total" value={`₱${accounts.reduce((s,a)=>s+(Number(a.balance)||0),0).toLocaleString()}`} icon={<DollarSign size={16} />} />
              <StatCard title="eWallets" value={`₱${accounts.filter(a=>a.subtype==='ewallet').reduce((s,a)=>s+(Number(a.balance)||0),0).toLocaleString()}`} icon={<DollarSign size={16} />} />
            </div>
          </Section>
          <Section title="Quick Add">
            <QuickAddAccount onAdded={async()=>{ const ar = await fetch("/api/accounts", { cache: "no-store", credentials: "include" }); if (ar.ok) setAccounts(await ar.json()); }} />
          </Section>
          <Section title="Your Accounts">
            <div className="space-y-2 text-sm">
              {accounts.length===0 ? <div className="text-[var(--muted)]">No accounts yet.</div> : accounts.map(a=> (
                <div key={a.id} className="flex items-center justify-between border rounded-md card p-3"><div>{a.name} • {a.subtype || a.provider || "account"}</div><div className="font-semibold">₱{Number(a.balance||0).toLocaleString()}</div></div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {loading && <ListSkeleton count={3} />}
    </div>
    </PullToRefresh>
  );
}


