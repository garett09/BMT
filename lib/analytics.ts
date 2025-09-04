import { type TransactionRecord } from "@/lib/redis";

export type AnalyticsSummary = {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  byCategory: Record<string, { income: number; expense: number }>;
  spendingVelocity: number; // avg expense per day (last 30 days)
  healthScore: number; // 0-100 simplistic
};

export function computeAnalytics(transactions: TransactionRecord[]): AnalyticsSummary {
  const byCategory: Record<string, { income: number; expense: number }> = {};
  let totalIncome = 0;
  let totalExpense = 0;
  const now = new Date();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const cutoff = new Date(now.getTime() - THIRTY_DAYS_MS);
  let recentExpense = 0;

  for (const t of transactions) {
    const cat = (t.category || "uncategorized").toLowerCase();
    byCategory[cat] ||= { income: 0, expense: 0 };
    if (t.type === "income") {
      totalIncome += t.amount;
      byCategory[cat].income += t.amount;
    } else {
      totalExpense += t.amount;
      byCategory[cat].expense += t.amount;
      const d = new Date(t.date || t.createdAt);
      if (d >= cutoff) recentExpense += t.amount;
    }
  }
  const balance = totalIncome - totalExpense;
  const spendingVelocity = recentExpense / 30;
  // naive health score: higher balance and lower velocity => better
  const incomeGuard = Math.max(1, totalIncome || 1);
  const expenseRatio = totalExpense / incomeGuard; // lower is better
  const velocityPenalty = Math.min(1, spendingVelocity / (incomeGuard / 30));
  const raw = 100 - (expenseRatio * 60 + velocityPenalty * 40) * 100;
  const healthScore = Math.max(0, Math.min(100, Math.round(raw)));

  return { totalIncome, totalExpense, balance, byCategory, spendingVelocity, healthScore };
}


