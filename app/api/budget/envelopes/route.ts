import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DataPersistence } from "@/lib/dataPersistence";
import { getUserIdFromAuth } from "@/lib/server-auth";
import { withSecurityHeaders, applyCors } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

// Store: month -> { category -> amount }
type EnvelopeMap = Record<string, number>;
type EnvelopeStore = Record<string, EnvelopeMap>;

const BulkSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  envelopes: z.record(z.string(), z.number().min(0)).optional(),
  // single update alternative
  category: z.string().optional(),
  amount: z.number().min(0).optional(),
});

export async function OPTIONS(req: NextRequest) {
  const res = withSecurityHeaders(NextResponse.json({ ok: true }));
  return applyCors(req, res);
}

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "envelopes:get", 60, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);

  const dp = new DataPersistence<EnvelopeStore>(userId, "budget:envelopes");
  const store = (await dp.get())?.value || {};
  const envelopes = store[month] || {};
  const res = NextResponse.json({ month, envelopes });
  return applyCors(req, withSecurityHeaders(res));
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "envelopes:write", 20, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });

  const body = await req.json();
  const parsed = BulkSchema.safeParse({
    ...body,
    amount: typeof body.amount === "string" ? Number(body.amount) : body.amount,
    envelopes: body.envelopes && typeof body.envelopes === "object" ? Object.fromEntries(Object.entries(body.envelopes).map(([k,v])=>[k, typeof v === "string" ? Number(v) : v])) : undefined,
  });
  if (!parsed.success) return applyCors(req, withSecurityHeaders(NextResponse.json({ error: "Invalid payload" }, { status: 400 })));

  const { month, envelopes, category, amount } = parsed.data;
  const dp = new DataPersistence<EnvelopeStore>(userId, "budget:envelopes");
  const store = (await dp.get())?.value || {};
  const cur: EnvelopeMap = { ...(store[month] || {}) };

  if (envelopes && Object.keys(envelopes).length > 0) {
    for (const [k, v] of Object.entries(envelopes)) cur[k] = v;
  } else if (category && typeof amount === "number") {
    cur[category] = amount;
  } else {
    return applyCors(req, withSecurityHeaders(NextResponse.json({ error: "Nothing to update" }, { status: 400 })));
  }
  store[month] = cur;
  await dp.set(store);
  const res = NextResponse.json({ month, envelopes: cur });
  return applyCors(req, withSecurityHeaders(res));
}

export async function PUT(req: NextRequest) {
  return POST(req);
}


