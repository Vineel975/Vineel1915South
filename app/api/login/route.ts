// app/api/login/route.ts
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "app_auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

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

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({}));

  const expected = process.env.APP_PASSWORD;
  const secret = process.env.AUTH_SECRET;

  // TEMPORARY DEBUG - REMOVE BEFORE COMMITTING
  console.log("[login debug] received password length:", password?.length);
  console.log("[login debug] expected password length:", expected?.length);
  console.log("[login debug] match:", password === expected);
  console.log("[login debug] AUTH_SECRET set:", !!secret);

  if (!expected || !secret) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }

  if (password !== expected) {
    // Small delay to slow down brute-force attempts
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const timestamp = Date.now().toString();
  const signature = await sign(timestamp, secret);
  const cookieValue = `${timestamp}.${signature}`;

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}