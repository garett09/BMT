import { verifyJwt } from "@/lib/jwt";
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function getUserIdFromAuth(req: NextRequest): Promise<string | null> {
  // 1) Authorization: Bearer <token>
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  let token = bearer;
  // 2) Cookie: auth_token
  if (!token) {
    const cookie = req.cookies.get("auth_token")?.value;
    if (cookie) token = cookie;
  }
  if (token) {
    const payload = await verifyJwt(token);
    if (payload?.sub) return payload.sub;
  }
  // 3) NextAuth JWT fallback (supports NextAuth-authenticated sessions)
  try {
    const nextAuthToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const id = (nextAuthToken as unknown as { sub?: string; id?: string } | null)?.sub || (nextAuthToken as any)?.id;
    if (id) return String(id);
  } catch {}
  return null;
}


