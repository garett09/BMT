import { NextResponse } from "next/server";
import { getUserIdFromAuth } from "@/lib/server-auth";
import { getRedis, keys, type TransactionRecord } from "@/lib/redis";
import { addNotification, type Notification } from "@/lib/notificationManager";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const userId = await getUserIdFromAuth(req as unknown as any);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const redis = getRedis();
  const ids = (await redis.lrange<string>(keys.txIndexByUser(userId), 0, -1)) || [];
  const txs = (await Promise.all(ids.map((id)=> redis.get(keys.txEntity(id))))) as (TransactionRecord | null)[];
  const clean = txs.filter(Boolean) as TransactionRecord[];

  const totals = clean.reduce(
    (acc, t) => {
      if (t.type === "income") acc.income += t.amount; else acc.expense += t.amount;
      return acc;
    },
    { income: 0, expense: 0 }
  );
  const balance = totals.income - totals.expense;

  return NextResponse.json({
    income: totals.income,
    expense: totals.expense,
    balance,
    count: txs.length,
  });
}


