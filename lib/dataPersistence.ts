import { getRedis, keys } from "@/lib/redis";

export type PersistenceItem<T> = {
  value: T;
  checksum: string; // simple checksum for integrity
  updatedAt: string;
};

function computeChecksum(input: unknown): string {
  const json = JSON.stringify(input);
  let hash = 0;
  for (let i = 0; i < json.length; i++) {
    hash = (hash << 5) - hash + json.charCodeAt(i);
    hash |= 0;
  }
  return String(hash >>> 0);
}

export class DataPersistence<T = unknown> {
  constructor(private userId: string, private dataType: string) {}

  private dataKey() {
    return keys.userData(this.userId, this.dataType);
  }
  private backupsKey() {
    return keys.userDataBackups(this.userId, this.dataType);
  }

  async get(): Promise<PersistenceItem<T> | null> {
    const redis = getRedis();
    const item = await redis.get<PersistenceItem<T> | null>(this.dataKey());
    return item ?? null;
  }

  async set(value: T): Promise<PersistenceItem<T>> {
    const redis = getRedis();
    const updatedAt = new Date().toISOString();
    const checksum = computeChecksum(value);
    const item: PersistenceItem<T> = { value, checksum, updatedAt };

    await redis.set(this.dataKey(), item);
    // Record a backup snapshot in a sorted set with timestamp as score
    await redis.zadd(this.backupsKey(), { score: Date.now(), member: JSON.stringify(item) });
    // Keep last 30 days of snapshots
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const minScore = Date.now() - THIRTY_DAYS_MS;
    await redis.zremrangebyscore(this.backupsKey(), 0, minScore);
    return item;
  }

  async exportAll(): Promise<{ current: PersistenceItem<T> | null; backups: Array<PersistenceItem<T>> }> {
    const redis = getRedis();
    const current = await this.get();
    const raws: string[] = await redis.zrange(this.backupsKey(), 0, Date.now());
    const backups = raws.map((r) => JSON.parse(r) as PersistenceItem<T>);
    return { current, backups };
  }
}


