import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromAuth } from "@/lib/server-auth";
import { getRedis, keys, type TransactionRecord } from "@/lib/redis";
import { addNotification, type Notification } from "@/lib/notificationManager";
import { rateLimit } from "@/lib/rateLimit";
import { withSecurityHeaders, applyCors } from "@/lib/security";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Basic per-IP rate limit
  const rl = await rateLimit(req, "dashboard:stats:get", 60, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });

  const { searchParams } = new URL(req.url);
  const refresh = searchParams.get("refresh") === "1";
  const redis = getRedis();
  const cacheKey = `stats:${userId}`;

  if (!refresh) {
    const cached = await redis.get<{ income: number; expense: number; balance: number; count: number }>(cacheKey);
    if (cached) {
      const res = NextResponse.json(cached);
      res.headers.set("Cache-Control", "private, max-age=0, s-maxage=30, stale-while-revalidate=300");
      Object.entries(rl.headers).forEach(([k, v]) => res.headers.set(k, v));
      return applyCors(req, withSecurityHeaders(res));
    }
  }

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

  // Basic anomaly checks → notifications (non-blocking)
  try {
    const today = new Date().toISOString().slice(0,10);
    const last7 = new Date(); last7.setDate(last7.getDate()-7);
    const byDay = new Map<string, number>();
    for (const t of clean) {
      if (t.type !== "expense") continue;
      const d = (t.date || t.createdAt).slice(0,10);
      if (new Date(d) < last7) continue;
      byDay.set(d, (byDay.get(d)||0)+ t.amount);
    }
    const last7Vals = [...byDay.values()];
    const last7Avg = last7Vals.length ? last7Vals.reduce((s,v)=>s+v,0)/last7Vals.length : 0;
    const todaySpend = clean.filter(t=> t.type==='expense' && (t.date || t.createdAt).slice(0,10)===today).reduce((s,t)=>s+t.amount,0);
    if (todaySpend > 0 && last7Avg > 0 && todaySpend > 2 * last7Avg) {
      const n: Notification = { id: `spike-${Date.now()}`, type: "spend", message: `High spend today: ₱${todaySpend.toLocaleString()} (> ${Math.round((todaySpend/last7Avg)*100)}% of 7d avg)`, priority: 3, createdAt: new Date().toISOString() };
      await addNotification(userId, n);
    }
    const lastIncome = clean.filter(t=> t.type==='income').sort((a,b)=> (a.date||a.createdAt) < (b.date||b.createdAt) ? 1 : -1)[0];
    if (lastIncome) {
      const lastIncomeDate = new Date(lastIncome.date || lastIncome.createdAt);
      const daysSince = Math.floor((Date.now()-lastIncomeDate.getTime())/(24*3600*1000));
      if (daysSince > 35) {
        const n: Notification = { id: `salary-${Math.floor(Date.now()/(7*24*3600*1000))}`, type: "insight", message: `No income detected in ${daysSince} days.`, priority: 2, createdAt: new Date().toISOString() };
        await addNotification(userId, n);
      }
    }
  } catch {}

  const payload = {
    income: totals.income,
    expense: totals.expense,
    balance,
    count: clean.length,
  } as const;

  // Cache result briefly for faster dashboards
  try { await redis.set(cacheKey, payload); await redis.expire(cacheKey, 30); } catch {}

  const res = NextResponse.json(payload);
  res.headers.set("Cache-Control", "private, max-age=0, s-maxage=30, stale-while-revalidate=300");
  Object.entries(rl.headers).forEach(([k, v]) => res.headers.set(k, v));
  return applyCors(req, withSecurityHeaders(res));
}


