import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRedis, keys, type TransactionRecord } from "@/lib/redis";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { randomUUID } from "crypto";
import { withSecurityHeaders, applyCors } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";
export const runtime = "nodejs";

const TxSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().positive(),
  category: z.string().min(1),
  description: z.string().optional(),
  date: z.string().optional(),
});

export async function OPTIONS(req: NextRequest) {
  const res = withSecurityHeaders(NextResponse.json({ ok: true }));
  return applyCors(req, res);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "transactions:get", 120, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });
  const userId = session.user.id as string;
  const redis = getRedis();
  const ids = (await redis.lrange<string>(keys.txIndexByUser(userId), 0, -1)) || [];
  const pipeline = redis.pipeline();
  ids.forEach((id) => pipeline.get<TransactionRecord | null>(keys.txEntity(id)));
  const txs = (await pipeline.exec()).filter(Boolean) as TransactionRecord[];
  const res = NextResponse.json(txs);
  return applyCors(req, withSecurityHeaders(res));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "transactions:write", 60, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });
  const userId = session.user.id as string;
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
    description: parsed.data.description,
    date: parsed.data.date ?? now.slice(0, 10),
    createdAt: now,
  };
  await redis.set(keys.txEntity(id), tx);
  await redis.lpush(keys.txIndexByUser(userId), id);
  const res = NextResponse.json(tx);
  return applyCors(req, withSecurityHeaders(res));
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "transactions:write", 60, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });
  const userId = session.user.id as string;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return applyCors(req, withSecurityHeaders(NextResponse.json({ error: "Missing id" }, { status: 400 })));
  const redis = getRedis();
  const entityKey = keys.txEntity(id);
  const tx = await redis.get<TransactionRecord | null>(entityKey);
  if (!tx || tx.userId !== userId) return applyCors(req, withSecurityHeaders(NextResponse.json({ error: "Not found" }, { status: 404 })));
  await redis.del(entityKey);
  await redis.lrem(keys.txIndexByUser(userId), 0, id);
  const res = NextResponse.json({ ok: true });
  return applyCors(req, withSecurityHeaders(res));
}


