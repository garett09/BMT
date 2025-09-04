import { NextRequest, NextResponse } from "next/server";

export type CorsOptions = {
  allowOrigin?: string | string[];
  allowMethods?: string[];
  allowHeaders?: string[];
  maxAge?: number;
  allowCredentials?: boolean;
};

export function withSecurityHeaders(res: NextResponse) {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("X-DNS-Prefetch-Control", "off");
  res.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  // Very relaxed CSP by default; tighten as needed per route
  if (!res.headers.has("Content-Security-Policy")) {
    res.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "connect-src 'self'",
        "font-src 'self' data:",
        "frame-ancestors 'none'",
      ].join("; ")
    );
  }
  return res;
}

export function applyCors(req: NextRequest, res: NextResponse, options: CorsOptions = {}) {
  const {
    allowOrigin = "*",
    allowMethods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders = ["Content-Type", "Authorization"],
    maxAge = 600,
    allowCredentials = false,
  } = options;

  const origin = req.headers.get("origin") || "";
  const allowed = Array.isArray(allowOrigin) ? allowOrigin : [allowOrigin];
  const isAllowed = allowOrigin === "*" || allowed.includes(origin);
  const finalOrigin = allowCredentials ? (isAllowed ? origin : "null") : allowOrigin === "*" ? "*" : isAllowed ? origin : "null";

  res.headers.set("Access-Control-Allow-Origin", finalOrigin);
  if (allowCredentials) res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set("Access-Control-Allow-Methods", allowMethods.join(", "));
  res.headers.set("Access-Control-Allow-Headers", allowHeaders.join(", "));
  res.headers.set("Access-Control-Max-Age", String(maxAge));
  return res;
}


