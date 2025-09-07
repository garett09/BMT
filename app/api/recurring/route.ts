import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromAuth } from "@/lib/server-auth";
import { withSecurityHeaders, applyCors } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";
import { DataPersistence } from "@/lib/dataPersistence";
import { z } from "zod";

export const runtime = "nodejs";

export type RecurringTemplate = {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  subcategory?: string;
  accountId?: string;
  frequency: "daily" | "weekly" | "monthly" | "weekday" | "15th";
  lastRun?: string; // ISO date
  snoozeUntil?: string; // ISO date (if set, ignore until this date passes)
};

const RecurringSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["income", "expense"]),
  amount: z.number().positive(),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  accountId: z.string().optional(),
  frequency: z.enum(["daily", "weekly", "monthly", "weekday", "15th"]),
  lastRun: z.string().optional(),
  snoozeUntil: z.string().optional(),
});

export async function OPTIONS(req: NextRequest) {
  const res = withSecurityHeaders(NextResponse.json({ ok: true }));
  return applyCors(req, res);
}

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "recurring:get", 60, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });
  const dp = new DataPersistence<RecurringTemplate[]>(userId, "recurring");
  const list = (await dp.get())?.value || [];
  const res = NextResponse.json(list);
  return applyCors(req, withSecurityHeaders(res));
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "recurring:write", 30, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });
  const body = await req.json();
  const parsed = RecurringSchema.safeParse({ ...body });
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const dp = new DataPersistence<RecurringTemplate[]>(userId, "recurring");
  const list = (await dp.get())?.value || [];
  const idx = list.findIndex((r) => r.id === parsed.data.id);
  if (idx >= 0) list[idx] = parsed.data; else list.push(parsed.data);
  await dp.set(list);
  const res = NextResponse.json(parsed.data);
  return applyCors(req, withSecurityHeaders(res));
}

export async function PUT(req: NextRequest) {
  const userId = await getUserIdFromAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "recurring:write", 30, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });
  const body = await req.json();
  const dp = new DataPersistence<RecurringTemplate[]>(userId, "recurring");
  const list = (await dp.get())?.value || [];
  const id = String(body?.id || "");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  list[idx] = { ...list[idx], ...body } as RecurringTemplate;
  await dp.set(list);
  return applyCors(req, withSecurityHeaders(NextResponse.json(list[idx])));
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserIdFromAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "recurring:write", 30, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const dp = new DataPersistence<RecurringTemplate[]>(userId, "recurring");
  const list = (await dp.get())?.value || [];
  const next = list.filter((r) => r.id !== id);
  await dp.set(next);
  const res = NextResponse.json({ ok: true });
  return applyCors(req, withSecurityHeaders(res));
}


