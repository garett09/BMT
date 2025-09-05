import { Redis } from "@upstash/redis";

// Singleton Redis client using Upstash REST with dev in-memory fallback
let redisClient: Redis | InMemoryRedis | null = null;

type PipelineCommand = () => Promise<any>;

class InMemoryPipeline {
  private commands: PipelineCommand[] = [];
  constructor(private redis: InMemoryRedis) {}
  get<T = unknown>(key: string) {
    this.commands.push(async () => this.redis.get<T>(key));
    return this;
  }
  set(key: string, value: any) {
    this.commands.push(async () => this.redis.set(key, value));
    return this;
  }
  async exec() {
    const out: any[] = [];
    for (const cmd of this.commands) {
      // Each command returns the value (not [err, result]) for simplicity
      // to match how this app consumes pipeline results.
      // eslint-disable-next-line no-await-in-loop
      const result = await cmd();
      out.push(result);
    }
    return out;
  }
}

class InMemoryRedis {
  private kv = new Map<string, any>();
  private lists = new Map<string, string[]>();
  private expirations = new Map<string, number>();
  private zsets = new Map<string, Array<{ score: number; value: string }>>();

  private now() {
    return Date.now();
  }

  private ensureNotExpired(key: string) {
    const exp = this.expirations.get(key);
    if (exp && this.now() > exp) {
      this.kv.delete(key);
      this.lists.delete(key);
      this.zsets.delete(key);
      this.expirations.delete(key);
    }
  }

  async ping() {
    return "PONG";
  }
  pipeline() {
    return new InMemoryPipeline(this);
  }
  async get<T = unknown>(key: string): Promise<T | null> {
    this.ensureNotExpired(key);
    const v = this.kv.get(key);
    return v === undefined ? null : (v as T);
  }
  async set(key: string, value: any) {
    this.ensureNotExpired(key);
    this.kv.set(key, value);
    return "OK";
  }
  async del(key: string) {
    this.ensureNotExpired(key);
    this.kv.delete(key);
    this.lists.delete(key);
    this.zsets.delete(key);
    this.expirations.delete(key);
    return 1;
  }
  async lrange<T = string>(key: string, start: number, stop: number): Promise<T[]> {
    this.ensureNotExpired(key);
    const arr = this.lists.get(key) || [];
    const end = stop === -1 ? arr.length : stop + 1;
    return arr.slice(start, end) as T[];
  }
  async lpush(key: string, value: string) {
    this.ensureNotExpired(key);
    const arr = this.lists.get(key) || [];
    arr.unshift(value);
    this.lists.set(key, arr);
    return arr.length;
  }
  async lrem(key: string, count: number, value: string) {
    this.ensureNotExpired(key);
    const arr = this.lists.get(key) || [];
    let removed = 0;
    const filtered = arr.filter((v) => {
      if (removed < Math.abs(count) && v === value) {
        removed += 1;
        return false;
      }
      return true;
    });
    this.lists.set(key, filtered);
    return removed;
  }
  async incr(key: string) {
    this.ensureNotExpired(key);
    const curr = Number(this.kv.get(key) ?? 0);
    const next = curr + 1;
    this.kv.set(key, next);
    return next;
  }
  async expire(key: string, seconds: number) {
    this.expirations.set(key, this.now() + seconds * 1000);
    return 1;
  }
  async zadd(key: string, ...args: any[]) {
    // Support both (score, member) and ({ score, member }) signatures
    let entries: Array<{ score: number; member: string }> = [];
    if (args.length === 1 && typeof args[0] === "object" && args[0] !== null) {
      const { score, member } = args[0] as { score: number; member: string };
      entries = [{ score, member }];
    } else if (args.length >= 2) {
      entries = [{ score: Number(args[0]), member: String(args[1]) }];
    }
    const arr = this.zsets.get(key) || [];
    for (const e of entries) {
      arr.push({ score: e.score, value: e.member });
    }
    arr.sort((a, b) => a.score - b.score);
    this.zsets.set(key, arr);
    return entries.length;
  }
  async zrange(key: string, min: number, max: number) {
    const arr = this.zsets.get(key) || [];
    return arr
      .filter((e) => e.score >= min && e.score <= max)
      .map((e) => e.value);
  }
  async zrangebyscore(key: string, min: number, max: number) {
    return this.zrange(key, min, max);
  }
  async zremrangebyscore(key: string, min: number, max: number) {
    const arr = this.zsets.get(key) || [];
    const kept = arr.filter((e) => e.score < min || e.score > max);
    this.zsets.set(key, kept);
    return arr.length - kept.length;
  }
}

type RedisClient = Redis | InMemoryRedis;

export function getRedis(): RedisClient {
  if (redisClient) return redisClient;

  // Force in-memory Redis for local development if explicitly requested
  const forceInMemory = (process.env.BMT_REDIS_INMEMORY || "").toLowerCase();
  if (process.env.NODE_ENV !== "production" && (forceInMemory === "1" || forceInMemory === "true")) {
    redisClient = new InMemoryRedis();
    return redisClient;
  }

  // Support both Upstash variable names and Vercel KV-style names
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    // Use in-memory fallback in non-production environments
    if (process.env.NODE_ENV !== "production") {
      redisClient = new InMemoryRedis();
      return redisClient;
    }
    throw new Error(
      "Missing Redis REST env vars. Set UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN (or KV_REST_API_URL & KV_REST_API_TOKEN)."
    );
  }

  const client = new Redis({ url, token });
  // Auto-switch to in-memory in dev if credentials are invalid
  if (process.env.NODE_ENV !== "production") {
    client.ping().then(() => {
      redisClient = client;
    }).catch(() => {
      // eslint-disable-next-line no-console
      console.warn("Redis ping failed in dev; using in-memory Redis fallback.");
      redisClient = new InMemoryRedis();
    });
    // Return a proxy that defers to whichever client is ready
    // but for simplicity we return the client; first commands may still fail until ping resolves
    redisClient = client;
    return redisClient;
  }
  redisClient = client;
  return redisClient;
}

export type UserRecord = {
  id: string;
  email: string;
  name?: string;
  passwordHash: string;
  createdAt: string;
};

export type TransactionRecord = {
  id: string;
  userId: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  subcategory?: string;
  description?: string;
  date: string; // ISO date string
  createdAt: string; // ISO timestamp
  // enhancements
  source?: string; // income source or merchant
  classification?: string; // e.g., fixed, variable, recurring
  accountId?: string; // link to account
  recurring?: boolean;
};

// Keys helpers
export const keys = {
  userByEmail: (email: string) => `user:email:${email.toLowerCase()}`,
  userId: (id: string) => `user:id:${id}`,
  txIndexByUser: (userId: string) => `tx:index:${userId}`,
  txEntity: (txId: string) => `tx:entity:${txId}`,
  userData: (userId: string, dataType: string) => `user:${userId}:${dataType}`,
  userDataBackups: (userId: string, dataType: string) => `user:${userId}:${dataType}:backups`,
  notifications: (userId: string) => `user:${userId}:notifications`,
  sharedPartnerEmail: (userId: string) => `user:${userId}:shared:partnerEmail`,
};


