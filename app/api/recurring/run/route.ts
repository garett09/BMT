import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromAuth } from "@/lib/server-auth";
import { withSecurityHeaders, applyCors } from "@/lib/security";
import { DataPersistence } from "@/lib/dataPersistence";
import { getRedis, keys, type TransactionRecord } from "@/lib/redis";
import { type RecurringTemplate } from "@/app/api/recurring/route";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

function isDue(t: RecurringTemplate, today: Date): boolean {
  const last = t.lastRun ? new Date(t.lastRun) : null;
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();
  const day = today.getDay(); // 0 Sun
  if (t.frequency === "daily") return !last || last.toDateString() !== today.toDateString();
  if (t.frequency === "weekday") return day >= 1 && day <= 5 && (!last || last.toDateString() !== today.toDateString());
  if (t.frequency === "weekly") {
    const diff = last ? (today.getTime() - last.getTime()) / (7 * 24 * 3600 * 1000) : Infinity;
    return diff >= 1;
  }
  if (t.frequency === "monthly") {
    return !last || last.getFullYear() !== y || last.getMonth() !== m;
  }
  if (t.frequency === "15th") {
    const is15 = d >= 15;
    const ranThisMonth = last && last.getFullYear() === y && last.getMonth() === m && last.getDate() >= 15;
    return is15 && !ranThisMonth;
  }
  return false;
}

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "recurring:run:get", 60, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });
  const dp = new DataPersistence<RecurringTemplate[]>(userId, "recurring");
  const list = (await dp.get())?.value || [];
  const today = new Date();
  const due = list.filter((r) => isDue(r, today));
  const res = NextResponse.json({ due });
  return applyCors(req, withSecurityHeaders(res));
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "recurring:run:post", 30, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });
  const redis = getRedis();
  const dp = new DataPersistence<RecurringTemplate[]>(userId, "recurring");
  const list = (await dp.get())?.value || [];
  const today = new Date();
  const nowISO = new Date().toISOString();
  const due = list.filter((r) => isDue(r, today));
  for (const r of due) {
    const id = crypto.randomUUID();
    const tx: TransactionRecord = {
      id,
      userId,
      type: r.type,
      amount: r.amount,
      category: r.category,
      subcategory: r.subcategory,
      date: nowISO.slice(0, 10),
      createdAt: nowISO,
      classification: "recurring",
      accountId: r.accountId,
    };
    // eslint-disable-next-line no-await-in-loop
    await redis.set(keys.txEntity(id), tx);
    // eslint-disable-next-line no-await-in-loop
    await redis.lpush(keys.txIndexByUser(userId), id);
    r.lastRun = nowISO.slice(0, 10);
  }
  if (due.length > 0) await dp.set(list);
  const res = NextResponse.json({ posted: due.length });
  return applyCors(req, withSecurityHeaders(res));
}



