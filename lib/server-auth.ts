import { verifyJwt } from "@/lib/jwt";
import { NextRequest } from "next/server";

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
  if (!token) return null;
  const payload = await verifyJwt(token);
  return payload?.sub || null;
}


