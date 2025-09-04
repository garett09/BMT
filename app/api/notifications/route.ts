import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withSecurityHeaders, applyCors } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";
import { addNotification, getNotifications, markAllRead } from "@/lib/notificationManager";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  const res = withSecurityHeaders(NextResponse.json({ ok: true }));
  return applyCors(req, res);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "notifications:get", 120, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });
  const list = await getNotifications(session.user.id as string);
  const res = NextResponse.json(list);
  return applyCors(req, withSecurityHeaders(res));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "notifications:write", 60, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });
  const n = await req.json();
  await addNotification(session.user.id as string, {
    id: n.id || String(Date.now()),
    type: n.type || "insight",
    message: String(n.message || ""),
    priority: n.priority === 3 || n.priority === 2 ? n.priority : 1,
    createdAt: new Date().toISOString(),
  });
  const res = NextResponse.json({ ok: true });
  return applyCors(req, withSecurityHeaders(res));
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "notifications:write", 60, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });
  await markAllRead(session.user.id as string);
  const res = NextResponse.json({ ok: true });
  return applyCors(req, withSecurityHeaders(res));
}


