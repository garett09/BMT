import { type TransactionRecord } from "@/lib/redis";

export type BudgetForecast = {
  month: string; // YYYY-MM
  recommendedBudget: number;
  confidence: number; // 0-1
  insights: string[];
};

export function forecastBudget(transactions: TransactionRecord[], monthISO: string): BudgetForecast {
  const grouped: Record<string, { income: number; expense: number }> = {};
  for (const t of transactions) {
    const month = (t.date || t.createdAt).slice(0, 7);
    grouped[month] ||= { income: 0, expense: 0 };
    if (t.type === "income") grouped[month].income += t.amount; else grouped[month].expense += t.amount;
  }

  const months = Object.keys(grouped).sort();
  const last12 = months.slice(-12).map((m) => grouped[m]);
  const avgExpense = last12.length ? last12.reduce((s, m) => s + m.expense, 0) / last12.length : 0;
  // seasonal factor: give 10% weight to same month last year if exists
  const sameMonthLastYear = (() => {
    const [y, m] = monthISO.split("-").map(Number);
    const key = `${y - 1}-${String(m).padStart(2, "0")}`;
    return grouped[key]?.expense ?? undefined;
  })();
  const seasonal = sameMonthLastYear !== undefined ? 0.9 * avgExpense + 0.1 * sameMonthLastYear : avgExpense;
  const buffer = 0.05 * seasonal;
  const recommendedBudget = Math.round(seasonal + buffer);

  const volatility = computeVolatility(last12.map((m) => m.expense));
  const confidence = Math.max(0.3, 1 - volatility);
  const insights: string[] = [];
  if (volatility > 0.5) insights.push("Spending is volatile; consider tighter weekly checkpoints.");
  if (recommendedBudget > avgExpense * 1.1) insights.push("Budget raised for seasonal uptick.");
  if (recommendedBudget < avgExpense * 0.9) insights.push("Budget lowered due to reduced recent spend.");
  return { month: monthISO, recommendedBudget, confidence: Number(confidence.toFixed(2)), insights };
}

function computeVolatility(series: number[]): number {
  if (series.length < 2) return 0.3;
  const mean = series.reduce((s, v) => s + v, 0) / series.length;
  const variance = series.reduce((s, v) => s + (v - mean) ** 2, 0) / series.length;
  const std = Math.sqrt(variance);
  return Math.min(1, std / (mean || 1));
}


