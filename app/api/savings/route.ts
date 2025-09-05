import { NextRequest, NextResponse } from "next/server";
import { DataPersistence } from "@/lib/dataPersistence";
import { z } from "zod";
import { withSecurityHeaders, applyCors } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";
import { getUserIdFromAuth } from "@/lib/server-auth";

export const runtime = "edge";

type SavingsGoal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  dueDate?: string;
};

const SavingsSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  targetAmount: z.number().positive(),
  currentAmount: z.number().min(0),
  dueDate: z.string().optional(),
});

export async function OPTIONS(req: NextRequest) {
  const res = withSecurityHeaders(NextResponse.json({ ok: true }));
  return applyCors(req, res);
}

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "savings:get", 60, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });

  const dp = new DataPersistence<SavingsGoal[]>(userId, "savings");
  const data = (await dp.get())?.value || [];
  const res = NextResponse.json(data);
  return applyCors(req, withSecurityHeaders(res));
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "savings:write", 20, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });

  const body = await req.json();
  const parsed = SavingsSchema.safeParse({
    ...body,
    targetAmount: typeof body.targetAmount === "string" ? Number(body.targetAmount) : body.targetAmount,
    currentAmount: typeof body.currentAmount === "string" ? Number(body.currentAmount) : body.currentAmount,
  });
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const dp = new DataPersistence<SavingsGoal[]>(userId, "savings");
  const list = (await dp.get())?.value || [];
  const idx = list.findIndex((a) => a.id === parsed.data.id);
  if (idx >= 0) list[idx] = parsed.data; else list.push(parsed.data);
  await dp.set(list);
  const res = NextResponse.json(parsed.data);
  return applyCors(req, withSecurityHeaders(res));
}

export async function PUT(req: NextRequest) {
  return POST(req);
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserIdFromAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "savings:write", 20, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const dp = new DataPersistence<SavingsGoal[]>(userId, "savings");
  const list = (await dp.get())?.value || [];
  const next = list.filter((a) => a.id !== id);
  await dp.set(next);
  const res = NextResponse.json({ ok: true });
  return applyCors(req, withSecurityHeaders(res));
}


