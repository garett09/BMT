import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRedis, keys, type TransactionRecord } from "@/lib/redis";
export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
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


