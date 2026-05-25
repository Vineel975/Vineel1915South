// middleware.ts
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "app_auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Paths the middleware should ignore (login page, login API, static assets)
const PUBLIC_PATHS = ["/login", "/api/login", "/favicon.ico"];

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/")
  );
}

async function isValidCookie(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;

  // Cookie format: "<timestamp>.<signature>"
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return false;
  const [timestamp, signature] = parts;

  // Recompute signature and compare
  const expected = await sign(timestamp, secret);
  return timingSafeEqual(signature, expected);
}

async function sign(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  const authed = await isValidCookie(cookie);

  if (authed) {
    return NextResponse.next();
  }

  // Not authed → redirect to login page, remembering where they wanted to go
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

// Run on all paths except Next.js internals
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};