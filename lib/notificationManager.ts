import { getRedis, keys } from "@/lib/redis";

export type Notification = {
  id: string;
  type: "budget" | "spend" | "savings" | "insight";
  message: string;
  priority: 1 | 2 | 3; // 3 highest
  createdAt: string;
  read?: boolean;
};

export async function addNotification(userId: string, n: Notification) {
  const redis = getRedis();
  const list = ((await redis.get<Notification[]>(keys.notifications(userId))) || []).slice(0, 199);
  list.unshift(n);
  await redis.set(keys.notifications(userId), list);
}

export async function getNotifications(userId: string) {
  const redis = getRedis();
  return ((await redis.get<Notification[]>(keys.notifications(userId))) || []).slice(0, 200);
}

export async function markAllRead(userId: string) {
  const redis = getRedis();
  const list = ((await redis.get<Notification[]>(keys.notifications(userId))) || []).map((n) => ({ ...n, read: true }));
  await redis.set(keys.notifications(userId), list);
}


