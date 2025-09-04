import { NextResponse } from "next/server";

export async function middleware(req: Request) {
  const url = new URL(req.url);
  const token = (req as any).cookies?.get?.("auth_token")?.value;
  const isProtected = [
    "/",
    "/dashboard",
    "/transactions",
    "/accounts",
    "/savings",
    "/shared",
    "/notifications",
    "/settings",
  ].some((p) => url.pathname === p || url.pathname.startsWith(p + "/"));
  if (isProtected && !token) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/:path*"] };


