import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DataPersistence } from "@/lib/dataPersistence";
import { withSecurityHeaders, applyCors } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const json = await req.json();
  const data = json?.data as Record<string, any> | undefined;
  if (!data || typeof data !== "object") {
    return NextResponse.json({ error: "Invalid import payload" }, { status: 400 });
  }

  const results: Record<string, string> = {};
  for (const [type, value] of Object.entries(data)) {
    const dp = new DataPersistence(userId, type);
    await dp.set(value?.current?.value ?? value);
    results[type] = "imported";
  }

  const res = NextResponse.json({ ok: true, results });
  return applyCors(req, withSecurityHeaders(res));
}


