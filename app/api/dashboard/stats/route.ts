import { NextResponse } from "next/server";
import { getUserIdFromAuth } from "@/lib/server-auth";
import { getRedis, keys, type TransactionRecord } from "@/lib/redis";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const urlReq = req as any;
  const userId = await getUserIdFromAuth(urlReq);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const redis = getRedis();
  const ids = (await redis.lrange<string>(keys.txIndexByUser(userId), 0, -1)) || [];
  const pipeline = redis.pipeline();
  ids.forEach((id) => pipeline.get<TransactionRecord | null>(keys.txEntity(id)));
  const txs = (await pipeline.exec()).filter(Boolean) as TransactionRecord[];

  const totals = txs.reduce(
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


