import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRedis, keys, type UserRecord } from "@/lib/redis";
import { compare } from "bcryptjs";
import { signJwt } from "@/lib/jwt";
import { rateLimit } from "@/lib/rateLimit";
import { withSecurityHeaders, applyCors } from "@/lib/security";

export const runtime = "nodejs";

const LoginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });

export async function OPTIONS(req: NextRequest) {
  const res = withSecurityHeaders(NextResponse.json({ ok: true }));
  return applyCors(req, res);
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, "auth:login", 20, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });

  const data = await req.json();
  const parsed = LoginSchema.safeParse(data);
  if (!parsed.success) return applyCors(req, withSecurityHeaders(NextResponse.json({ error: "Invalid payload" }, { status: 400 })));
  const redis = getRedis();
  const userId = await redis.get<string | null>(keys.userByEmail(parsed.data.email));
  if (!userId) return applyCors(req, withSecurityHeaders(NextResponse.json({ error: "Invalid credentials" }, { status: 401 })));
  const user = await redis.get<UserRecord | null>(keys.userId(userId));
  if (!user) return applyCors(req, withSecurityHeaders(NextResponse.json({ error: "Invalid credentials" }, { status: 401 })));
  const ok = await compare(parsed.data.password, user.passwordHash);
  if (!ok) return applyCors(req, withSecurityHeaders(NextResponse.json({ error: "Invalid credentials" }, { status: 401 })));
  const token = await signJwt({ sub: user.id, email: user.email, name: user.name });
  const res = NextResponse.json({ token });
  return applyCors(req, withSecurityHeaders(res));
}


