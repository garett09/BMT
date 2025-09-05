import { NextRequest } from "next/server";
import { getRedis } from "@/lib/redis";

export type RateLimitResult = {
  limited: boolean;
  remaining: number;
  limit: number;
  resetSeconds: number;
  headers: Record<string, string>;
};

// In-memory fallback for development when Redis is unavailable/misconfigured
const inMemoryBuckets = new Map<string, { count: number; resetAt: number }>();

export async function rateLimit(req: NextRequest, key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = (forwarded || "").split(",")[0].trim() || "unknown";
  const rlKey = `ratelimit:${key}:${ip}`;

  try {
    const redis = getRedis();
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
  } catch {
    // Fallback: in-memory token bucket (per-process) to avoid 500s in dev
    const now = Date.now();
    const bucket = inMemoryBuckets.get(rlKey);
    if (!bucket || now > bucket.resetAt) {
      inMemoryBuckets.set(rlKey, { count: 1, resetAt: now + windowSeconds * 1000 });
    } else {
      bucket.count += 1;
    }
    const cur = inMemoryBuckets.get(rlKey)!;
    const remaining = Math.max(0, limit - cur.count);
    const limited = cur.count > limit;
    const resetSeconds = Math.max(0, Math.ceil((cur.resetAt - now) / 1000));
    const headers: Record<string, string> = {
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": String(Math.max(0, remaining)),
      "X-RateLimit-Reset": String(resetSeconds),
      "X-RateLimit-Fallback": "in-memory",
    };
    return { limited, remaining, limit, resetSeconds, headers };
  }
}


