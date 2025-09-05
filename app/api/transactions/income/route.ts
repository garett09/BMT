import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRedis, keys, type TransactionRecord } from "@/lib/redis";
import { getUserIdFromAuth } from "@/lib/server-auth";
import { randomUUID } from "crypto";
import { rateLimit } from "@/lib/rateLimit";
import { withSecurityHeaders, applyCors } from "@/lib/security";

export const runtime = "nodejs";

const Schema = z.object({ amount: z.number().positive(), category: z.string().min(1), description: z.string().optional(), date: z.string().optional() });

export async function GET(req: NextRequest) {
  const res = withSecurityHeaders(NextResponse.redirect(new URL("/api/transactions", req.url)));
  return applyCors(req, res);
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "transactions:income:write", 60, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });
  const body = await req.json();
  const parsed = Schema.safeParse({ ...body, amount: typeof body.amount === "string" ? Number(body.amount) : body.amount });
  if (!parsed.success) return applyCors(req, withSecurityHeaders(NextResponse.json({ error: "Invalid payload" }, { status: 400 })));
  const redis = getRedis();
  const id = randomUUID();
  const now = new Date().toISOString();
  const tx: TransactionRecord = { id, userId, type: "income", amount: parsed.data.amount, category: parsed.data.category, description: parsed.data.description, date: parsed.data.date ?? now.slice(0, 10), createdAt: now };
  await redis.set(keys.txEntity(id), tx);
  await redis.lpush(keys.txIndexByUser(userId), id);
  const res = NextResponse.json(tx);
  Object.entries(rl.headers).forEach(([k, v]) => res.headers.set(k, v));
  return applyCors(req, withSecurityHeaders(res));
}


