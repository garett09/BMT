import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromAuth } from "@/lib/server-auth";
import { withSecurityHeaders, applyCors } from "@/lib/security";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let redisOk = false;
  let error: string | undefined;
  try {
    const redis = getRedis();
    const pong = await redis.ping();
    redisOk = pong === "PONG" || pong === "pong";
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "unknown";
  }
  const res = NextResponse.json({ ok: redisOk, error });
  return applyCors(req, withSecurityHeaders(res));
}


