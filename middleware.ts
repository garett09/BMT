import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const path = url.pathname;
  // Skip auth for API routes and public assets
  if (path.startsWith("/api/")) return NextResponse.next();
  if (path.startsWith("/_next") || path.startsWith("/public") || path === "/favicon.ico" || path === "/manifest.json" || path === "/sw.js") return NextResponse.next();
  // Skip auth for auth pages
  if (path.startsWith("/login") || path.startsWith("/register")) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isProtected = [
    "/dashboard",
    "/transactions",
    "/accounts",
    "/savings",
    "/shared",
    "/notifications",
  ].some((p) => path === p || path.startsWith(p + "/"));
  if (isProtected && !token) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/:path*"] };


