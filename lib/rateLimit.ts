import { NextRequest } from "next/server";
import { getRedis } from "@/lib/redis";

export type RateLimitResult = {
  limited: boolean;
  remaining: number;
  limit: number;
  resetSeconds: number;
  headers: Record<string, string>;
};

export async function rateLimit(req: NextRequest, key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const redis = getRedis();
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = (forwarded || "").split(",")[0].trim() || "unknown";
  const rlKey = `ratelimit:${key}:${ip}`;
  const count = await redis.incr(rlKey);
  if (count === 1) await redis.expire(rlKey, windowSeconds);

  const remaining = Math.max(0, limit - count);
  const limited = count > limit;
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(Math.max(0, remaining)),
    "X-RateLimit-Reset": String(windowSeconds),
  };
  return { limited, remaining, limit, resetSeconds: windowSeconds, headers };
}


