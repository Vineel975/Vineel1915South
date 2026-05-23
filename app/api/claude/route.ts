import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const ALLOWED_MODELS = new Set([
  "anthropic/claude-haiku-4.5",
  "anthropic/claude-sonnet-4.5",
  "anthropic/claude-sonnet-4.6",
]);

interface ProxyBody {
  model?: string;
  max_tokens?: number;
  messages?: Array<{ role: string; content: string }>;
  stream?: boolean;
}

export async function POST(req: NextRequest) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return new Response(
      JSON.stringify({ error: "OPENROUTER_API_KEY not set on server" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }

  let body: ProxyBody;
  try {
    body = (await req.json()) as ProxyBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  if (!body.model || !ALLOWED_MODELS.has(body.model)) {
    return new Response(
      JSON.stringify({ error: `Model not allowed: ${body.model}` }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const upstreamBody = {
    model: body.model,
    max_tokens: body.max_tokens ?? 4000,
    messages: body.messages,
    stream: !!body.stream,
  };

  const upstream = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${key}`,
      // OpenRouter recommends these to identify the app:
      "HTTP-Referer": "https://prototyper.1915south.local",
      "X-Title": "Workflow Prototyper",
    },
    body: JSON.stringify(upstreamBody),
    signal: req.signal,
  });

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return new Response(text || JSON.stringify({ error: "upstream error" }), {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  }

  if (upstreamBody.stream) {
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        "x-accel-buffering": "no",
      },
    });
  }

  const text = await upstream.text();
  return new Response(text, {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
