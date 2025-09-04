import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRedis, keys, type UserRecord } from "@/lib/redis";
import { hash } from "bcryptjs";
import { randomUUID } from "crypto";
export const runtime = "nodejs";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(60).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const parsed = RegisterSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { email, password, name } = parsed.data;
    const redis = getRedis();
    const existingId = await redis.get<string | null>(keys.userByEmail(email));
    if (existingId) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const id = randomUUID();
    const passwordHash = await hash(password, 10);
    const now = new Date().toISOString();
    const user: UserRecord = { id, email: email.toLowerCase(), name, passwordHash, createdAt: now };

    await redis.set(keys.userId(id), user);
    await redis.set(keys.userByEmail(email), id);

    return NextResponse.json({ id, email, name });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


