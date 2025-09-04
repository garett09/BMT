import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withSecurityHeaders, applyCors } from "@/lib/security";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let redisOk = false;
  let error: string | undefined;
  try {
    const redis = getRedis();
    const pong = await redis.ping();
    redisOk = pong === "PONG" || pong === "pong";
  } catch (e: any) {
    error = e?.message;
  }
  const res = NextResponse.json({ ok: redisOk, error });
  return applyCors(req, withSecurityHeaders(res));
}


