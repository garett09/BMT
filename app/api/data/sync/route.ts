import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DataPersistence } from "@/lib/dataPersistence";
import { withSecurityHeaders, applyCors } from "@/lib/security";

export const runtime = "nodejs";

// Naive last-write-wins incremental sync: client sends { type, value, updatedAt }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const { type, value, updatedAt } = await req.json();
  if (!type) return NextResponse.json({ error: "Missing type" }, { status: 400 });
  const dp = new DataPersistence(userId, String(type));
  const current = await dp.get();
  if (!current || !current.updatedAt || new Date(updatedAt) >= new Date(current.updatedAt)) {
    const saved = await dp.set(value);
    const res = NextResponse.json({ ok: true, applied: true, saved });
    return applyCors(req, withSecurityHeaders(res));
  }
  const res = NextResponse.json({ ok: true, applied: false, current });
  return applyCors(req, withSecurityHeaders(res));
}


