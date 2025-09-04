import { type TransactionRecord } from "@/lib/redis";

export type MonthlyArchive = {
  month: string; // YYYY-MM
  income: number;
  expense: number;
  balance: number;
};

export function archiveMonthly(transactions: TransactionRecord[]): MonthlyArchive[] {
  const map = new Map<string, { income: number; expense: number }>();
  for (const t of transactions) {
    const month = (t.date || t.createdAt).slice(0, 7);
    const v = map.get(month) || { income: 0, expense: 0 };
    if (t.type === "income") v.income += t.amount; else v.expense += t.amount;
    map.set(month, v);
  }
  return [...map.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([month, v]) => ({
    month,
    income: v.income,
    expense: v.expense,
    balance: v.income - v.expense,
  }));
}

export function yearOverYear(archives: MonthlyArchive[], monthISO: string) {
  const [y, m] = monthISO.split("-").map(Number);
  const thisKey = `${y}-${String(m).padStart(2, "0")}`;
  const lastKey = `${y - 1}-${String(m).padStart(2, "0")}`;
  const curr = archives.find((a) => a.month === thisKey);
  const prev = archives.find((a) => a.month === lastKey);
  if (!curr || !prev) return null;
  return {
    expenseChange: ratio(curr.expense, prev.expense),
    incomeChange: ratio(curr.income, prev.income),
    balanceChange: ratio(curr.balance, prev.balance),
  };
}

function ratio(curr: number, prev: number) {
  if (!prev) return Infinity;
  return (curr - prev) / prev;
}


