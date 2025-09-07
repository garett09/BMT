import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromAuth } from "@/lib/server-auth";
import { getRedis, keys, type TransactionRecord } from "@/lib/redis";
import { withSecurityHeaders, applyCors } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

// Enable/disable expense sharing by storing partner email mapping
export async function POST(req: NextRequest) {
  const userId = await getUserIdFromAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "shared:write", 10, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });

  const { partnerEmail } = await req.json();
  const redis = getRedis();
  if (!partnerEmail) {
    await redis.del(keys.sharedPartnerEmail(userId));
    const res = NextResponse.json({ enabled: false });
    return applyCors(req, withSecurityHeaders(res));
  }

  await redis.set(keys.sharedPartnerEmail(userId), String(partnerEmail).toLowerCase());
  const res = NextResponse.json({ enabled: true, partnerEmail });
  return applyCors(req, withSecurityHeaders(res));
}

// Fetch combined expenses for the user and partner, if reciprocity is configured
export async function GET(req: NextRequest) {
  const userId = await getUserIdFromAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "shared:get", 30, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });

  const redis = getRedis();
  const myPartnerEmail = await redis.get<string | null>(keys.sharedPartnerEmail(userId));

  if (!myPartnerEmail) {
    const res = NextResponse.json({ expenses: [], partner: null });
    return applyCors(req, withSecurityHeaders(res));
  }

  const partnerId = await redis.get<string | null>(keys.userByEmail(myPartnerEmail));
  if (!partnerId) {
    const res = NextResponse.json({ expenses: [], partner: null });
    return applyCors(req, withSecurityHeaders(res));
  }

  // Check reciprocity: partner must have set current user's email
  // Fetch current user's email via stored user record
  const myUserId = userId;
  const myUser = await redis.get<{ email?: string } | null>(keys.userId(myUserId));
  const myEmail = (myUser?.email || "").toLowerCase();
  const partnerPartnerEmail = await redis.get<string | null>(keys.sharedPartnerEmail(partnerId));
  const reciprocal = partnerPartnerEmail === myEmail;

  const idsUser = (await redis.lrange<string>(keys.txIndexByUser(userId), 0, -1)) || [];
  const idsPartner = reciprocal ? ((await redis.lrange<string>(keys.txIndexByUser(partnerId), 0, -1)) || []) : [];
  const allIds = [...idsUser, ...idsPartner];
  const pipeline = redis.pipeline();
  allIds.forEach((id) => pipeline.get<TransactionRecord | null>(keys.txEntity(id)));
  const allTx = (await pipeline.exec()).filter(Boolean) as TransactionRecord[];
  const expenses = allTx.filter((t) => t.type === "expense");

  const res = NextResponse.json({ expenses, partner: reciprocal ? partnerId : null });
  return applyCors(req, withSecurityHeaders(res));
}


