import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyJwt } from "@/lib/jwt";
import { NextRequest } from "next/server";

export async function getUserIdFromAuth(req?: NextRequest): Promise<string | null> {
  // Prefer NextAuth session
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) return session.user.id as string;
  } catch {}
  // Fallback to Bearer JWT
  const header = req?.headers.get("authorization") || req?.headers.get("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) return null;
  const payload = await verifyJwt(token);
  return payload?.sub || null;
}


