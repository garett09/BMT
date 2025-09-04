import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRedis, keys, type TransactionRecord } from "@/lib/redis";
import { getUserIdFromAuth } from "@/lib/server-auth";
import { randomUUID } from "crypto";
import { withSecurityHeaders, applyCors } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";
export const runtime = "nodejs";

const TxSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().positive(),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  description: z.string().optional(),
  date: z.string().optional(),
  source: z.string().optional(),
  classification: z.string().optional(),
  accountId: z.string().optional(),
  recurring: z.boolean().optional(),
});

export async function OPTIONS(req: NextRequest) {
  const res = withSecurityHeaders(NextResponse.json({ ok: true }));
  return applyCors(req, res);
}

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "transactions:get", 120, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });
  try {
    const redis = getRedis();
    const ids = (await redis.lrange(keys.txIndexByUser(userId), 0, -1)) as string[] || [];
    const txs: TransactionRecord[] = [];
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      const t = await redis.get(keys.txEntity(id)) as TransactionRecord | null;
      if (t) txs.push(t);
    }
    const res = NextResponse.json(txs);
    return applyCors(req, withSecurityHeaders(res));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown";
    const res = NextResponse.json([], { status: 200 });
    res.headers.set("X-Data-Error", String(message));
    return applyCors(req, withSecurityHeaders(res));
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "transactions:write", 60, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });
  const body = await req.json();
  const parsed = TxSchema.safeParse({
    ...body,
    amount: typeof body.amount === "string" ? Number(body.amount) : body.amount,
  });
  if (!parsed.success) return applyCors(req, withSecurityHeaders(NextResponse.json({ error: "Invalid payload" }, { status: 400 })));
  const redis = getRedis();
  const id = randomUUID();
  const now = new Date().toISOString();
  const tx: TransactionRecord = {
    id,
    userId,
    type: parsed.data.type,
    amount: parsed.data.amount,
    category: parsed.data.category,
    subcategory: parsed.data.subcategory,
    description: parsed.data.description,
    date: parsed.data.date ?? now.slice(0, 10),
    createdAt: now,
    source: parsed.data.source,
    classification: parsed.data.classification,
    accountId: parsed.data.accountId,
    recurring: parsed.data.recurring,
  };
  await redis.set(keys.txEntity(id), tx);
  await redis.lpush(keys.txIndexByUser(userId), id);
  const res = NextResponse.json(tx);
  return applyCors(req, withSecurityHeaders(res));
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserIdFromAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "transactions:write", 60, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return applyCors(req, withSecurityHeaders(NextResponse.json({ error: "Missing id" }, { status: 400 })));
  const redis = getRedis();
  const entityKey = keys.txEntity(id);
  const tx = await redis.get(entityKey) as TransactionRecord | null;
  if (!tx || tx.userId !== userId) return applyCors(req, withSecurityHeaders(NextResponse.json({ error: "Not found" }, { status: 404 })));
  await redis.del(entityKey);
  await redis.lrem(keys.txIndexByUser(userId), 0, id);
  const res = NextResponse.json({ ok: true });
  return applyCors(req, withSecurityHeaders(res));
}

export async function PUT(req: NextRequest) {
  const userId = await getUserIdFromAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "transactions:write", 60, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });
  const body = await req.json();
  const id = String(body?.id || "");
  if (!id) return applyCors(req, withSecurityHeaders(NextResponse.json({ error: "Missing id" }, { status: 400 })));
  const redis = getRedis();
  const existing = await redis.get(keys.txEntity(id)) as TransactionRecord | null;
  if (!existing || existing.userId !== userId) return applyCors(req, withSecurityHeaders(NextResponse.json({ error: "Not found" }, { status: 404 })));
  const merged: TransactionRecord = {
    ...existing,
    type: body.type ?? existing.type,
    amount: typeof body.amount === "number" ? body.amount : existing.amount,
    category: body.category ?? existing.category,
    description: body.description ?? existing.description,
    date: body.date ?? existing.date,
    source: body.source ?? existing.source,
    classification: body.classification ?? existing.classification,
    accountId: body.accountId ?? existing.accountId,
  };
  await redis.set(keys.txEntity(id), merged);
  const res = NextResponse.json(merged);
  return applyCors(req, withSecurityHeaders(res));
}


