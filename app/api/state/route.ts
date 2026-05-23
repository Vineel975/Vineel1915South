import { NextRequest } from "next/server";
import { put, head, BlobNotFoundError } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BLOB_KEY = "state.json";
// Reject payloads bigger than this to keep blob writes bounded.
const MAX_BODY_BYTES = 5_000_000; // 5 MB

interface AppState {
  prototypes: unknown[];
  masterPrompt: string | null;
  dataReality: string | null;
  updatedAt: number;
}

function emptyState(): AppState {
  return {
    prototypes: [],
    masterPrompt: null,
    dataReality: null,
    updatedAt: 0,
  };
}

export async function GET() {
  try {
    let url: string;
    try {
      const meta = await head(BLOB_KEY);
      url = meta.url;
    } catch (err) {
      if (err instanceof BlobNotFoundError) {
        return Response.json(emptyState());
      }
      throw err;
    }
    // Cache-bust query string defeats Blob CDN caching after a fresh PUT.
    const bustUrl = `${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}`;
    const upstream = await fetch(bustUrl, { cache: "no-store" });
    if (!upstream.ok) return Response.json(emptyState());
    const text = await upstream.text();
    return new Response(text, {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "read failed",
        detail: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}

export async function PUT(req: NextRequest) {
  let body: string;
  try {
    body = await req.text();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid body" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  if (body.length > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: "Payload too large" }), {
      status: 413,
      headers: { "content-type": "application/json" },
    });
  }
  // Validate JSON shape minimally
  try {
    const parsed = JSON.parse(body);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.prototypes)) {
      throw new Error("invalid shape");
    }
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Invalid state JSON",
        detail: err instanceof Error ? err.message : String(err),
      }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }
  try {
    await put(BLOB_KEY, body, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 0,
    });
    return Response.json({ ok: true });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "write failed",
        detail: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
