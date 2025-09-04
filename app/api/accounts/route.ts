import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DataPersistence } from "@/lib/dataPersistence";
import { z } from "zod";
import { withSecurityHeaders, applyCors } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

type Account = {
  id: string;
  name: string;
  type: "cash" | "bank" | "credit" | "other";
  balance: number;
};

const AccountSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["cash", "bank", "credit", "other"]),
  balance: z.number(),
});

export async function OPTIONS(req: NextRequest) {
  const res = withSecurityHeaders(NextResponse.json({ ok: true }));
  return applyCors(req, res);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "accounts:get", 60, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });

  const dp = new DataPersistence<Account[]>(session.user.id as string, "accounts");
  const data = (await dp.get())?.value || [];
  const res = NextResponse.json(data);
  return applyCors(req, withSecurityHeaders(res));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "accounts:write", 20, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });

  const body = await req.json();
  const parsed = AccountSchema.safeParse({
    ...body,
    balance: typeof body.balance === "string" ? Number(body.balance) : body.balance,
  });
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const dp = new DataPersistence<Account[]>(session.user.id as string, "accounts");
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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "accounts:write", 20, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const dp = new DataPersistence<Account[]>(session.user.id as string, "accounts");
  const list = (await dp.get())?.value || [];
  const next = list.filter((a) => a.id !== id);
  await dp.set(next);
  const res = NextResponse.json({ ok: true });
  return applyCors(req, withSecurityHeaders(res));
}


