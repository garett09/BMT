import { Redis } from "@upstash/redis";

// Singleton Redis client using Upstash REST
let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (redisClient) return redisClient;

  // Support both Upstash variable names and Vercel KV-style names
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Missing Redis REST env vars. Set UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN (or KV_REST_API_URL & KV_REST_API_TOKEN)."
    );
  }

  redisClient = new Redis({ url, token });
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
  description?: string;
  date: string; // ISO date string
  createdAt: string; // ISO timestamp
};

// Keys helpers
export const keys = {
  userByEmail: (email: string) => `user:email:${email.toLowerCase()}`,
  userId: (id: string) => `user:id:${id}`,
  txIndexByUser: (userId: string) => `tx:index:${userId}`,
  txEntity: (txId: string) => `tx:entity:${txId}`,
};


