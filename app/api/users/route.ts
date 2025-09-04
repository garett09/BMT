import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRedis, keys, type UserRecord } from "@/lib/redis";
import { withSecurityHeaders, applyCors } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  const res = withSecurityHeaders(NextResponse.json({ ok: true }));
  return applyCors(req, res);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "users:get", 60, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });

  const redis = getRedis();
  const user = await redis.get<UserRecord | null>(keys.userId(session.user.id as string));
  if (!user) return applyCors(req, withSecurityHeaders(NextResponse.json({ error: "Not found" }, { status: 404 })));
  const { passwordHash, ...publicUser } = user as any;
  const res = NextResponse.json(publicUser);
  return applyCors(req, withSecurityHeaders(res));
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "users:write", 20, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });

  const redis = getRedis();
  const userId = session.user.id as string;
  const existing = await redis.get<UserRecord | null>(keys.userId(userId));
  if (!existing) return applyCors(req, withSecurityHeaders(NextResponse.json({ error: "Not found" }, { status: 404 })));

  const body = await req.json();
  const name = typeof body?.name === "string" && body.name.trim().length > 0 ? String(body.name).trim() : existing.name;
  const updated: UserRecord = { ...existing, name };
  await redis.set(keys.userId(userId), updated);
  const { passwordHash, ...publicUser } = updated as any;
  const res = NextResponse.json(publicUser);
  return applyCors(req, withSecurityHeaders(res));
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "users:write", 10, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });

  const redis = getRedis();
  const userId = session.user.id as string;
  const existing = await redis.get<UserRecord | null>(keys.userId(userId));
  if (!existing) return applyCors(req, withSecurityHeaders(NextResponse.json({ error: "Not found" }, { status: 404 })));

  await redis.del(keys.userId(userId));
  await redis.del(keys.userByEmail(existing.email));
  const res = NextResponse.json({ ok: true });
  return applyCors(req, withSecurityHeaders(res));
}


