import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromAuth } from "@/lib/server-auth";
import { withSecurityHeaders, applyCors } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";
import { DataPersistence } from "@/lib/dataPersistence";
import { z } from "zod";

export const runtime = "nodejs";

export type Rule = {
  id: string;
  when: { sourceRegex?: string };
  then: { setCategory?: string; splitToSavingsPercent?: number };
};

const RuleSchema = z.object({
  id: z.string().min(1),
  when: z.object({ sourceRegex: z.string().optional() }),
  then: z.object({ setCategory: z.string().optional(), splitToSavingsPercent: z.number().min(0).max(100).optional() }),
});

export async function OPTIONS(req: NextRequest) {
  const res = withSecurityHeaders(NextResponse.json({ ok: true }));
  return applyCors(req, res);
}

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "rules:get", 120, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });
  const dp = new DataPersistence<Rule[]>(userId, "rules");
  const list = (await dp.get())?.value || [];
  const res = NextResponse.json(list);
  return applyCors(req, withSecurityHeaders(res));
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "rules:write", 30, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });
  const body = await req.json();
  const parsed = RuleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const dp = new DataPersistence<Rule[]>(userId, "rules");
  const list = (await dp.get())?.value || [];
  const idx = list.findIndex((r) => r.id === parsed.data.id);
  if (idx >= 0) list[idx] = parsed.data; else list.push(parsed.data);
  await dp.set(list);
  return NextResponse.json(parsed.data);
}

export async function PUT(req: NextRequest) { return POST(req); }

export async function DELETE(req: NextRequest) {
  const userId = await getUserIdFromAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const dp = new DataPersistence<Rule[]>(userId, "rules");
  const next = ((await dp.get())?.value || []).filter((r) => r.id !== id);
  await dp.set(next);
  return NextResponse.json({ ok: true });
}



