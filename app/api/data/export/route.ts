import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DataPersistence } from "@/lib/dataPersistence";
import { withSecurityHeaders, applyCors } from "@/lib/security";

export const runtime = "nodejs";

const dataTypes = ["accounts", "savings"] as const;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload: Record<string, unknown> = {};
  for (const type of dataTypes) {
    const dp = new DataPersistence(userId, type);
    payload[type] = await dp.exportAll();
  }
  const res = NextResponse.json({ exportedAt: new Date().toISOString(), data: payload });
  return applyCors(req, withSecurityHeaders(res));
}


