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
import { Modal } from "@/components/ui/Modal";
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
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [savingsOpen, setSavingsOpen] = useState(false);
  const [budget, setBudget] = useState<string>("");
  const [goal, setGoal] = useState({ id: "", name: "", targetAmount: "", currentAmount: "0", dueDate: "" });

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
    const burnRate = forecast.recommendedBudget > 0 ? totalExpense / forecast.recommendedBudget : 0;
    const byCat = expenses.reduce((map: Record<string, number>, t) => { map[t.category] = (map[t.category] || 0) + t.amount; return map; }, {} as Record<string, number>);
    const top = Object.entries(byCat).sort((a,b)=>b[1]-a[1])[0];
    const topCategoryShare = top ? top[1] / Math.max(1, totalExpense) : 0;
    return { totalExpense, totalIncome, avgDailySpend, burnRate, topCategory: top?.[0] || "-", topCategoryShare, daysInMonth, dayOfMonth };
  }, [txs, monthISO, forecast.recommendedBudget]);

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

      <Modal open={budgetOpen} onClose={()=> setBudgetOpen(false)} title="Adjust Monthly Budget">
        <form onSubmit={async (e)=>{ e.preventDefault(); setBudgetOpen(false); }} className="grid grid-cols-2 gap-2">
          <div className="col-span-2 text-xs text-[var(--muted)]">Set your target spend for {monthISO}.</div>
          <div className="col-span-2 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">₱</span>
            <input className="border rounded-md pl-7 pr-3 py-2 w-full" inputMode="decimal" step="0.01" type="number" placeholder="0.00" value={budget} onChange={(e)=> setBudget(e.target.value)} />
          </div>
          <Button type="submit" className="col-span-2" fullWidth>Save</Button>
        </form>
      </Modal>

      <Modal open={savingsOpen} onClose={()=> setSavingsOpen(false)} title="Savings Goal">
        <form onSubmit={async (e)=>{ e.preventDefault(); const payload = { id: goal.id || String(Date.now()), name: goal.name || "Goal", targetAmount: Number(goal.targetAmount||0), currentAmount: Number(goal.currentAmount||0), dueDate: goal.dueDate || undefined }; const res = await fetch("/api/savings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), credentials: "include" }); if (res.ok) { setSavingsOpen(false); setGoal({ id: "", name: "", targetAmount: "", currentAmount: "0", dueDate: "" }); } }} className="grid grid-cols-2 gap-2">
          <input className="border rounded-md px-3 py-2 col-span-2" placeholder="Goal name (e.g., Emergency Fund)" value={goal.name} onChange={(e)=> setGoal({ ...goal, name: e.target.value })} />
          <input className="border rounded-md px-3 py-2" type="number" placeholder="Target amount" value={goal.targetAmount} onChange={(e)=> setGoal({ ...goal, targetAmount: e.target.value })} />
          <input className="border rounded-md px-3 py-2" type="number" placeholder="Current amount" value={goal.currentAmount} onChange={(e)=> setGoal({ ...goal, currentAmount: e.target.value })} />
          <input className="border rounded-md px-3 py-2 col-span-2" type="date" value={goal.dueDate} onChange={(e)=> setGoal({ ...goal, dueDate: e.target.value })} />
          <Button type="submit" className="col-span-2" fullWidth>Save Goal</Button>
        </form>
      </Modal>
      {loading && <ListSkeleton count={3} />}
    </div>
    </PullToRefresh>
  );
}


