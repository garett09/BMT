import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DataPersistence } from "@/lib/dataPersistence";
import { getUserIdFromAuth } from "@/lib/server-auth";
import { withSecurityHeaders, applyCors } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

export type OnboardingState = {
  completed: boolean;
  completedAt?: string;
  steps: {
    addAccount?: boolean;
    setBudget?: boolean;
    setGoal?: boolean;
    enableNotifications?: boolean;
  };
};

const OnboardingSchema = z.object({
  completed: z.boolean().optional(),
  steps: z
    .object({
      addAccount: z.boolean().optional(),
      setBudget: z.boolean().optional(),
      setGoal: z.boolean().optional(),
      enableNotifications: z.boolean().optional(),
    })
    .partial()
    .optional(),
});

function emptyState(): OnboardingState {
  return { completed: false, steps: {} };
}

export async function OPTIONS(req: NextRequest) {
  const res = withSecurityHeaders(NextResponse.json({ ok: true }));
  return applyCors(req, res);
}

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "onboarding:get", 60, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });
  const dp = new DataPersistence<OnboardingState>(userId, "onboarding");
  const cur = (await dp.get())?.value || emptyState();
  const res = NextResponse.json(cur);
  return applyCors(req, withSecurityHeaders(res));
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit(req, "onboarding:write", 30, 60);
  const base = withSecurityHeaders(NextResponse.next());
  Object.entries(rl.headers).forEach(([k, v]) => base.headers.set(k, v));
  if (rl.limited) return NextResponse.json({ error: "Rate limit" }, { status: 429, headers: base.headers });

  const body = await req.json();
  const parsed = OnboardingSchema.safeParse(body);
  if (!parsed.success) return applyCors(req, withSecurityHeaders(NextResponse.json({ error: "Invalid payload" }, { status: 400 })));

  const dp = new DataPersistence<OnboardingState>(userId, "onboarding");
  const cur = (await dp.get())?.value || emptyState();
  const next: OnboardingState = {
    ...cur,
    ...parsed.data,
    steps: { ...cur.steps, ...(parsed.data.steps || {}) },
  };
  if (!cur.completed && next.completed) {
    next.completedAt = new Date().toISOString();
  }
  await dp.set(next);
  const res = NextResponse.json(next);
  return applyCors(req, withSecurityHeaders(res));
}

export async function PUT(req: NextRequest) {
  return POST(req);
}


