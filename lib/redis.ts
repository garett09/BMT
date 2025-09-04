import { Redis } from "@upstash/redis";

// Singleton Redis client using Upstash REST
let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN env variables");
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


