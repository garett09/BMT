import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";

export async function GET() {
  const missing: string[] = [];
  if (!process.env.UPSTASH_REDIS_REST_URL && !process.env.KV_REST_API_URL) missing.push("UPSTASH_REDIS_REST_URL|KV_REST_API_URL");
  if (!process.env.UPSTASH_REDIS_REST_TOKEN && !process.env.KV_REST_API_TOKEN) missing.push("UPSTASH_REDIS_REST_TOKEN|KV_REST_API_TOKEN");
  if (!process.env.NEXTAUTH_SECRET) missing.push("NEXTAUTH_SECRET");
  if (!process.env.NEXTAUTH_URL) missing.push("NEXTAUTH_URL");

  let redisOk = false;
  let redisError: string | undefined;
  try {
    const redis = getRedis();
    const pong = await redis.ping();
    redisOk = pong === "PONG" || pong === "pong";
  } catch (e: unknown) {
    redisError = e instanceof Error ? e.message : "Redis connection failed";
  }

  const ok = missing.length === 0 && redisOk;
  return NextResponse.json({ ok, missing, redisOk, redisError }, { status: ok ? 200 : 500 });
}


