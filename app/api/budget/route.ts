import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DataPersistence } from "@/lib/dataPersistence";
import { getUserIdFromAuth } from "@/lib/server-auth";
import { withSecurityHeaders, applyCors } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

// We store budgets as a map of monthISO -> amount
type BudgetMap = Record<string, number>;

const BudgetSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  amount: z.number().min(0),
});

export async function OPTIONS(req: NextRequest) {
  const res = withSecurityHeaders(NextResponse.json({ ok: true }));
  return applyCors(req, res);
}

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "budget:get", 60, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);

  const dp = new DataPersistence<BudgetMap>(userId, "budget");
  const map = (await dp.get())?.value || {};
  const amount = map[month] ?? null;
  const res = NextResponse.json({ month, amount });
  return applyCors(req, withSecurityHeaders(res));
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "budget:write", 20, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });

  const body = await req.json();
  const parsed = BudgetSchema.safeParse({
    ...body,
    amount: typeof body.amount === "string" ? Number(body.amount) : body.amount,
  });
  if (!parsed.success) return applyCors(req, withSecurityHeaders(NextResponse.json({ error: "Invalid payload" }, { status: 400 })));

  const dp = new DataPersistence<BudgetMap>(userId, "budget");
  const map = (await dp.get())?.value || {};
  map[parsed.data.month] = parsed.data.amount;
  await dp.set(map);
  const res = NextResponse.json({ ok: true, month: parsed.data.month, amount: parsed.data.amount });
  return applyCors(req, withSecurityHeaders(res));
}

export async function PUT(req: NextRequest) {
  return POST(req);
}

