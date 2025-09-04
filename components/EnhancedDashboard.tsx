"use client";
import { useEffect, useMemo, useState } from "react";
import { computeAnalytics } from "@/lib/analytics";
import { forecastBudget } from "@/lib/intelligentBudget";
import type { TransactionRecord } from "@/lib/redis";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { KpiCard } from "@/components/KpiCard";
import { Tabs } from "@/components/ui/Tabs";
import { Segmented } from "@/components/ui/Segmented";
import { StatCard } from "@/components/StatCard";
import { Section } from "@/components/Section";
import { TrendChart } from "@/components/charts/TrendChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { AreaTrend } from "@/components/charts/AreaTrend";
import { ArrowDownRight, ArrowUpRight, DollarSign, Target } from "lucide-react";
import { QuickActionCard } from "@/components/QuickActionCard";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ListSkeleton } from "@/components/ui/ListSkeleton";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
// removed Accounts tab content; keep imports minimal
import { RadialProgress } from "@/components/ui/RadialProgress";

export function EnhancedDashboard() {
  const [txs, setTxs] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  // accounts are handled in dedicated page
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [savingsOpen, setSavingsOpen] = useState(false);
  const [budget, setBudget] = useState<string>("");
  const [monthBudget, setMonthBudget] = useState<number | null>(null);
  const [goal, setGoal] = useState({ id: "", name: "", targetAmount: "", currentAmount: "0", dueDate: "" });
  type SavingsGoal = { id: string; name: string; targetAmount: number; currentAmount: number; dueDate?: string };
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [confetti, setConfetti] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const res = await fetch("/api/transactions", { cache: "no-store", credentials: "include" });
    if (res.ok) setTxs(await res.json());
    // accounts fetched in dedicated Accounts page
    const mb = await fetch(`/api/budget?month=${monthISO}`, { cache: "no-store", credentials: "include" });
    if (mb.ok) { const d = await mb.json(); setMonthBudget(typeof d.amount === "number" ? d.amount : null); }
    const sg = await fetch("/api/savings", { cache: "no-store", credentials: "include" });
    if (sg.ok) setGoals(await sg.json());
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

  // Data-heavy derived metrics for data folks
  const monthTx = useMemo(() => {
    const m = monthISO;
    const expenses = txs.filter((t) => t.type === "expense" && (t.date || "").startsWith(m));
    const incomes = txs.filter((t) => t.type === "income" && (t.date || "").startsWith(m));
    const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
    const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dayOfMonth = today.getDate();
    const avgDailySpend = totalExpense / Math.max(1, dayOfMonth);
    const targetBudget = monthBudget ?? forecast.recommendedBudget;
    const burnRate = targetBudget > 0 ? totalExpense / targetBudget : 0;
    const byCat = expenses.reduce((map: Record<string, number>, t) => { map[t.category] = (map[t.category] || 0) + t.amount; return map; }, {} as Record<string, number>);
    const top = Object.entries(byCat).sort((a,b)=>b[1]-a[1])[0];
    const topCategoryShare = top ? top[1] / Math.max(1, totalExpense) : 0;
    return { totalExpense, totalIncome, avgDailySpend, burnRate, topCategory: top?.[0] || "-", topCategoryShare, daysInMonth, dayOfMonth, targetBudget };
  }, [txs, monthISO, forecast.recommendedBudget, monthBudget]);

  const spendVolatility = useMemo(() => {
    // Coefficient of variation of daily expenses in last 30 days
    const byDay = new Map<string, number>();
    const now = new Date();
    for (const t of txs) {
      if (t.type !== "expense") continue;
      const d = new Date(t.date || t.createdAt);
      if ((now.getTime() - d.getTime()) / (24*3600*1000) > 30) continue;
      const key = (t.date || t.createdAt).slice(0,10);
      byDay.set(key, (byDay.get(key) || 0) + t.amount);
    }
    if (byDay.size === 0) return 0;
    const values = [...byDay.values()];
    const mean = values.reduce((s,v)=>s+v,0) / values.length;
    const variance = values.reduce((s,v)=> s + Math.pow(v - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);
    const cv = std / Math.max(1e-6, mean);
    return cv; // lower is more stable
  }, [txs]);

  const incomeStability = useMemo(() => {
    // Stability of monthly income totals over last 6 months: 1 - CV
    const buckets = new Map<string, number>();
    for (const t of txs) {
      if (t.type !== "income") continue;
      const key = (t.date || t.createdAt).slice(0,7);
      buckets.set(key, (buckets.get(key) || 0) + t.amount);
    }
    const months = [...buckets.entries()].sort(([a],[b])=> a < b ? -1 : 1).slice(-6).map(([,v])=>v);
    if (months.length === 0) return 0;
    const mean = months.reduce((s,v)=>s+v,0) / months.length;
    const variance = months.reduce((s,v)=> s + Math.pow(v - mean, 2), 0) / months.length;
    const std = Math.sqrt(variance);
    const cv = std / Math.max(1e-6, mean);
    const stability = Math.max(0, Math.min(1, 1 - cv));
    return stability; // 0..1 (higher is more stable)
  }, [txs]);

  const weeklyIncomeExpense = useMemo(() => {
    // map ISO week to { income, expense }
    const map = new Map<string, { income: number; expense: number }>();
    for (const t of txs) {
      const d = new Date(t.date || t.createdAt);
      const tmp = new Date(d.getTime());
      const dayNum = (d.getUTCDay() + 6) % 7; // Monday=0
      tmp.setUTCDate(d.getUTCDate() - dayNum + 3);
      const firstThursday = tmp.getTime();
      const jan4 = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4));
      const week = 1 + Math.round((firstThursday - Date.UTC(jan4.getUTCFullYear(), 0, 4)) / (7 * 24 * 3600 * 1000));
      const key = `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
      const curr = map.get(key) || { income: 0, expense: 0 };
      curr[t.type] += t.amount as number;
      map.set(key, curr);
    }
    return [...map.entries()].sort(([a],[b])=> a < b ? -1 : 1).slice(-8).map(([name, v])=> ({ name, income: v.income, expense: v.expense }));
  }, [txs]);

  // Monthly summaries for Historical/Predictions
  const monthlySummary = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const t of txs) {
      const key = (t.date || t.createdAt).slice(0, 7);
      const curr = map.get(key) || { income: 0, expense: 0 };
      curr[t.type] += t.amount as number;
      map.set(key, curr);
    }
    const rows = [...map.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([month, v]) => ({ month, income: v.income, expense: v.expense, balance: v.income - v.expense }));
    const last6 = rows.slice(-6);
    return last6;
  }, [txs]);

  const predictions = useMemo(() => {
    const rows = monthlySummary;
    const last3 = rows.slice(-3);
    const avgIncome = last3.length ? Math.round(last3.reduce((s, r) => s + r.income, 0) / last3.length) : 0;
    const avgExpense = last3.length ? Math.round(last3.reduce((s, r) => s + r.expense, 0) / last3.length) : 0;
    const projectedIncome = Math.max(0, avgIncome);
    const projectedExpense = Math.max(0, Math.round((avgExpense + forecast.recommendedBudget) / 2));
    const projectedNet = projectedIncome - projectedExpense;
    const weekly = Array.from({ length: 4 }).map((_, i) => ({ name: `W${i + 1}`, income: i === 0 ? Math.round(projectedIncome) : 0, expense: Math.round(projectedExpense / 4) }));
    return { projectedIncome, projectedExpense, projectedNet, weekly };
  }, [monthlySummary, forecast.recommendedBudget]);

  const lastMonth = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  }, []);

  const topCatsLastMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of txs) {
      const m = (t.date || t.createdAt).slice(0, 7);
      if (t.type !== "expense" || m !== lastMonth) continue;
      map.set(t.category, (map.get(t.category) || 0) + t.amount);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [txs, lastMonth]);

  // Historical range selection
  const [histRange, setHistRange] = useState<"All" | "Year" | "Month" | "Week">("Month");

  const historicalRows = useMemo(() => {
    if (histRange === "All") {
      const income = txs.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
      const expense = txs.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
      return [{ label: "All-time", income, expense, balance: income - expense }];
    }
    if (histRange === "Year") {
      const m = new Map<string, { income: number; expense: number }>();
      for (const t of txs) {
        const y = (t.date || t.createdAt).slice(0,4);
        const v = m.get(y) || { income: 0, expense: 0 };
        v[t.type] += t.amount as number;
        m.set(y, v);
      }
      return [...m.entries()].sort(([a],[b])=> a < b ? -1 : 1).map(([label, v])=> ({ label, income: v.income, expense: v.expense, balance: v.income - v.expense }));
    }
    if (histRange === "Week") {
      const m = new Map<string, { income: number; expense: number }>();
      for (const t of txs) {
        const d = new Date(t.date || t.createdAt);
        const tmp = new Date(d.getTime());
        const dayNum = (d.getUTCDay() + 6) % 7; // Monday=0
        tmp.setUTCDate(d.getUTCDate() - dayNum + 3);
        const firstThursday = tmp.getTime();
        const jan4 = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4));
        const week = 1 + Math.round((firstThursday - Date.UTC(jan4.getUTCFullYear(), 0, 4)) / (7 * 24 * 3600 * 1000));
        const key = `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
        const v = m.get(key) || { income: 0, expense: 0 };
        v[t.type] += t.amount as number;
        m.set(key, v);
      }
      return [...m.entries()].sort(([a],[b])=> a < b ? -1 : 1).slice(-12).map(([label, v])=> ({ label, income: v.income, expense: v.expense, balance: v.income - v.expense }));
    }
    // Month (default)
    return monthlySummary.map(r=> ({ label: r.month, income: r.income, expense: r.expense, balance: r.balance }));
  }, [txs, histRange, monthlySummary]);

  const goalStats = useMemo(() => {
    const target = Number(goal.targetAmount || 0);
    const current = Number(goal.currentAmount || 0);
    const pct = target > 0 ? Math.min(1, current / target) : 0;
    return { target, current, pct };
  }, [goal]);

  return (
    <PullToRefresh onRefresh={fetchAll}>
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <KpiCard label="Income" value={`₱${analytics.totalIncome.toLocaleString()}`} tone="pos" />
        <KpiCard label="Expense" value={`₱${analytics.totalExpense.toLocaleString()}`} tone="neg" />
        <KpiCard label="Balance" value={`₱${analytics.balance.toLocaleString()}`} tone={analytics.balance >= 0 ? "pos" : "neg"} />
      </div>

      <div className="rounded-md border card p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">This Month Budget</div>
            <div className="text-xs text-[var(--muted)]">Conf {Math.round(forecast.confidence * 100)}%</div>
          </div>
          <RadialProgress value={analytics.totalExpense} max={monthTx.targetBudget} label="Spent" />
        </div>
        <div className="mt-2 text-xl font-semibold brand-text">₱{(monthTx.targetBudget).toLocaleString()}</div>
        <div className="text-xs text-[var(--muted)]">Safe per-day ≈ ₱{Math.round((forecast.recommendedBudget - analytics.totalExpense) / Math.max(1, monthTx.daysInMonth - monthTx.dayOfMonth)).toLocaleString()}</div>
        {forecast.insights.length > 0 && (
          <ul className="mt-2 list-disc pl-4 text-xs text-[var(--muted)]">
            {forecast.insights.map((i, idx) => (
              <li key={idx}>{i}</li>
            ))}
          </ul>
        )}
      </div>

      <Tabs items={["Overview", "Trends", "Insights", "Budget", "Predictions", "Historical"]} active={tab} onChange={setTab} />

      {tab === "Overview" && (
      <div className="grid grid-cols-1 gap-3">
        <div className="grid grid-cols-2 gap-3">
          <StatCard title="Net Income" value={`₱${analytics.balance.toLocaleString()}`} icon={<DollarSign size={16} />} />
          <StatCard title="Transactions" value={`${txs.length}`} icon={<Target size={16} />} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <KpiCard label="Avg Daily Spend" value={`₱${Math.round(monthTx.avgDailySpend).toLocaleString()}`} tone="neg" />
          <KpiCard label="Burn Rate" value={`${Math.round(monthTx.burnRate*100)}%`} tone={monthTx.burnRate <= 1 ? "pos" : "neg"} />
          <KpiCard label="Top Cat Share" value={`${Math.round(monthTx.topCategoryShare*100)}%`} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <KpiCard label="Spend Volatility" value={`${(spendVolatility).toFixed(2)}`} />
          <KpiCard label="Income Stability" value={`${Math.round(incomeStability*100)}%`} tone={incomeStability >= 0.6 ? "pos" : "neg"} />
          <KpiCard label="Days Elapsed" value={`${monthTx.dayOfMonth}/${monthTx.daysInMonth}`} />
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
                  <span className="text-white">₱{d.expense.toLocaleString()} ({Math.round((d.expense/Math.max(1, analytics.totalExpense))*100)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Weekly Income vs Expense">
          <div className="w-full h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyIncomeExpense}>
                <XAxis dataKey="name" hide />
                <YAxis hide />
                <Tooltip formatter={(v: number)=>`₱${Number(v).toLocaleString()}`} />
                <Bar dataKey="income" fill="#22c55e" radius={[4,4,0,0]} />
                <Bar dataKey="expense" fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <div className="grid grid-cols-3 gap-3">
          <QuickActionCard title="Spending Alert" description="You're on track this month." action={<Button variant="secondary" href="/notifications">View Details →</Button>} />
          <QuickActionCard title="Savings Goal" description="Create or update a savings goal." action={<Button variant="secondary" onClick={()=> setSavingsOpen(true)}>Set Goals →</Button>} />
          <QuickActionCard title="Budget Timeline" description="Adjust monthly budget and limits." action={<Button variant="secondary" onClick={()=> setBudgetOpen(true)}>Adjust Budget →</Button>} />
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
        <div className="grid grid-cols-1 gap-3">
          <Section title="Next Month Projection">
            <div className="grid grid-cols-3 gap-2 text-center">
              <KpiCard label="Projected Income" value={`₱${predictions.projectedIncome.toLocaleString()}`} tone="pos" />
              <KpiCard label="Projected Expense" value={`₱${predictions.projectedExpense.toLocaleString()}`} tone="neg" />
              <KpiCard label="Projected Net" value={`₱${predictions.projectedNet.toLocaleString()}`} tone={predictions.projectedNet >= 0 ? "pos" : "neg"} />
            </div>
            <div className="w-full h-40 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={predictions.weekly}>
                  <XAxis dataKey="name" />
                  <YAxis hide />
                  <Tooltip formatter={(v: number)=>`₱${Number(v).toLocaleString()}`} />
                  <Bar dataKey="income" fill="#22c55e" radius={[4,4,0,0]} />
                  <Bar dataKey="expense" fill="#ef4444" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>

          <Section title="Monthly Averages (last 3)">
            <div className="grid grid-cols-3 gap-3 text-center">
              <KpiCard label="Avg Income" value={`₱${(monthlySummary.slice(-3).reduce((s,r)=>s+r.income,0)/Math.max(1, monthlySummary.slice(-3).length)|0).toLocaleString()}`} tone="pos" />
              <KpiCard label="Avg Expense" value={`₱${(monthlySummary.slice(-3).reduce((s,r)=>s+r.expense,0)/Math.max(1, monthlySummary.slice(-3).length)|0).toLocaleString()}`} tone="neg" />
              <KpiCard label="Avg Net" value={`₱${(monthlySummary.slice(-3).reduce((s,r)=>s+(r.income-r.expense),0)/Math.max(1, monthlySummary.slice(-3).length)|0).toLocaleString()}`} />
            </div>
          </Section>
        </div>
      )}

      {tab === "Historical" && (
        <div className="grid grid-cols-1 gap-3">
          <Section title="Historical Summary">
            <div className="mb-2"><Segmented value={histRange} onChange={(v: string)=> setHistRange(v as "All"|"Year"|"Month"|"Week")} options={["All","Year","Month","Week"]} /></div>
            <div className="text-xs space-y-1">
              <div className="grid grid-cols-4 gap-2 text-[var(--muted)]"><div>Period</div><div className="text-right">Income</div><div className="text-right">Expense</div><div className="text-right">Balance</div></div>
              {historicalRows.map((r, idx, arr) => {
                const prev = idx > 0 ? arr[idx-1] : undefined;
                const delta = prev ? ((r.balance - prev.balance) / Math.max(1, Math.abs(prev.balance))) * 100 : 0;
                return (
                  <div key={r.label} className="grid grid-cols-4 gap-2">
                    <div>{r.label}</div>
                    <div className="text-right">₱{r.income.toLocaleString()}</div>
                    <div className="text-right">₱{r.expense.toLocaleString()}</div>
                    <div className="text-right">₱{r.balance.toLocaleString()} {idx>0 && <span className={delta>=0?"text-[var(--positive)]":"text-[var(--negative)]"}>({Math.round(delta)}%)</span>}</div>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title={`Top Categories • ${lastMonth}`}>
            <div className="text-xs space-y-1">
              {topCatsLastMonth.length === 0 ? (
                <div className="text-[var(--muted)]">No data for last month.</div>
              ) : topCatsLastMonth.map(([name, value]) => (
                <div key={name} className="flex items-center justify-between border-b border-[var(--border)]/50 pb-1">
                  <span>{name}</span>
                  <span className="text-white">₱{value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      

      

      <Modal open={budgetOpen} onClose={()=> setBudgetOpen(false)} title="Adjust Monthly Budget">
        <form onSubmit={async (e)=>{ e.preventDefault(); const amt = Number(budget||0); await fetch("/api/budget", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month: monthISO, amount: amt }), credentials: "include" }); setMonthBudget(amt); setBudgetOpen(false); }} className="grid grid-cols-2 gap-2">
          <div className="col-span-2 text-xs text-[var(--muted)]">Set your target spend for {monthISO}.</div>
          <div className="col-span-2 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">₱</span>
            <input className="border rounded-md pl-7 pr-3 py-2 w-full" inputMode="decimal" step="0.01" type="number" placeholder={String(monthBudget ?? forecast.recommendedBudget)} value={budget} onChange={(e)=> setBudget(e.target.value)} />
          </div>
          <Button type="submit" className="col-span-2" fullWidth>Save</Button>
        </form>
      </Modal>

      <Modal open={savingsOpen} onClose={()=> setSavingsOpen(false)} title="Savings Goal">
        <form onSubmit={async (e)=>{ e.preventDefault(); const payload = { id: goal.id || String(Date.now()), name: goal.name || "Goal", targetAmount: Number(goal.targetAmount||0), currentAmount: Number(goal.currentAmount||0), dueDate: goal.dueDate || undefined }; const res = await fetch("/api/savings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), credentials: "include" }); if (res.ok) { const list = await (await fetch("/api/savings", { cache: "no-store", credentials: "include" })).json(); setGoals(list); const hit = payload.targetAmount > 0 && payload.currentAmount >= payload.targetAmount; if (hit) { setConfetti(true); setTimeout(()=> setConfetti(false), 1200); } setSavingsOpen(false); setGoal({ id: "", name: "", targetAmount: "", currentAmount: "0", dueDate: "" }); } }} className="grid grid-cols-2 gap-3 relative">
          <div className="col-span-2 grid grid-cols-3 gap-3 items-center">
            <div className="col-span-1 flex justify-center"><RadialProgress value={goalStats.current} max={Math.max(1, goalStats.target)} label="Goal" /></div>
            <div className="col-span-2 space-y-2">
              <input className="border rounded-md px-3 py-2 w-full" placeholder="Goal name (e.g., Emergency Fund)" value={goal.name} onChange={(e)=> setGoal({ ...goal, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">₱</span>
                  <input className="border rounded-md pl-7 pr-3 py-2 w-full" type="number" inputMode="decimal" step="0.01" placeholder="Target" value={goal.targetAmount} onChange={(e)=> setGoal({ ...goal, targetAmount: e.target.value })} />
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">₱</span>
                  <input className="border rounded-md pl-7 pr-3 py-2 w-full" type="number" inputMode="decimal" step="0.01" placeholder="Current" value={goal.currentAmount} onChange={(e)=> setGoal({ ...goal, currentAmount: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {[1000,5000,10000].map((n)=> (
                  <button key={n} type="button" className="text-[10px] border rounded-full px-2.5 py-1 text-[var(--muted)] hover:text-[var(--foreground)]" onClick={()=> setGoal((g)=> ({ ...g, currentAmount: String(Number(g.currentAmount||0) + n) }))}>+{n.toLocaleString()}</button>
                ))}
                <button type="button" className="text-[10px] border rounded-full px-2.5 py-1 text-[var(--muted)] hover:text-[var(--foreground)]" onClick={()=> setGoal((g)=> ({ ...g, currentAmount: g.targetAmount }))}>Max</button>
              </div>
            </div>
          </div>
          <div className="col-span-2 grid grid-cols-3 gap-2 items-center">
            <input className="border rounded-md px-3 py-2 col-span-2" type="date" value={goal.dueDate} onChange={(e)=> setGoal({ ...goal, dueDate: e.target.value })} />
            <div className="flex gap-2">
              {[[3,"3m"],[6,"6m"],[12,"12m"]].map(([m,label])=> (
                <button key={String(label)} type="button" className="text-[10px] border rounded-full px-2.5 py-1 text-[var(--muted)] hover:text-[var(--foreground)]" onClick={()=> { const d = new Date(); d.setMonth(d.getMonth() + (m as number)); setGoal((g)=> ({ ...g, dueDate: d.toISOString().slice(0,10) })); }}>{label as string}</button>
              ))}
            </div>
          </div>
          {goalStats.target > 0 && (
            <div className="col-span-2 text-xs text-[var(--muted)]">Progress: {Math.round(goalStats.pct*100)}% • Remaining ₱{Math.max(0, goalStats.target - goalStats.current).toLocaleString()}</div>
          )}
          <Button type="submit" className="col-span-2" fullWidth disabled={!goal.name.trim() || !(goalStats.target > 0) || goalStats.current > goalStats.target}>Save Goal</Button>
          {confetti && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {[...Array(20)].map((_,i)=> (
                <span key={i} className="absolute text-xs" style={{ left: `${(i*13)%100}%`, top: `${(i*7)%100}%`, animation: "fall 1.2s linear forwards", color: i%2?"#22c55e":"#a855f7" }}>★</span>
              ))}
              <style>{`@keyframes fall{0%{transform: translateY(-10px) rotate(0)}100%{transform: translateY(120px) rotate(360deg); opacity:0}}`}</style>
            </div>
          )}
        </form>
        <div className="mt-4 space-y-2">
          <div className="text-xs text-[var(--muted)] px-1">Your Goals</div>
          {goals.length === 0 ? (
            <div className="text-xs text-[var(--muted)] px-1">No goals yet.</div>
          ) : goals.map((g)=> {
            const pct = g.targetAmount > 0 ? Math.min(1, g.currentAmount / g.targetAmount) : 0;
            return (
              <div key={g.id} className="rounded-md border card p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{g.name}</div>
                  <div className="text-xs">₱{g.currentAmount.toLocaleString()} / ₱{g.targetAmount.toLocaleString()}</div>
                </div>
                <div className="mt-2"><ProgressBar value={g.currentAmount} max={Math.max(1, g.targetAmount)} /></div>
                <div className="mt-2 flex gap-2">
                  <Button variant="secondary" onClick={()=> setGoal({ id: g.id, name: g.name, targetAmount: String(g.targetAmount), currentAmount: String(g.currentAmount), dueDate: g.dueDate || "" })}>Edit</Button>
                  <Button variant="danger" onClick={async()=>{ await fetch(`/api/savings?id=${g.id}`, { method: "DELETE", credentials: "include" }); const list = await (await fetch("/api/savings", { cache: "no-store", credentials: "include" })).json(); setGoals(list); }}>Delete</Button>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
      {loading && <ListSkeleton count={3} />}
    </div>
    </PullToRefresh>
  );
}


