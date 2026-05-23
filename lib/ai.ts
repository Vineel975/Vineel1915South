import type { Analysis, LayoutPattern, MetadataResult } from "./types";
import {
  buildMetadataSystem,
  buildHtmlSystem,
  buildAnalysisSystem,
} from "./prompts";

const PROXY = "/api/claude";

// OpenRouter model slugs.
const MODEL_HAIKU = "anthropic/claude-haiku-4.5";
const MODEL_SONNET = "anthropic/claude-sonnet-4.5";

const TIMEOUT_METADATA = 30_000;
const TIMEOUT_HTML = 180_000;
const TIMEOUT_ANALYSIS = 90_000;

export class AiError extends Error {
  constructor(message: string, public detail?: string) {
    super(message);
    this.name = "AiError";
  }
}

export class AiTimeoutError extends Error {
  constructor(public stage: string) {
    super(`${stage} timed out`);
    this.name = "AiTimeoutError";
  }
}

export class NotAWorkflowError extends Error {
  constructor() {
    super("Not a workflow request");
    this.name = "NotAWorkflowError";
  }
}

function withTimeout(signal: AbortSignal | undefined, ms: number, stage: string) {
  const controller = new AbortController();
  const onParentAbort = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener("abort", onParentAbort, { once: true });
  }
  const timer = setTimeout(() => {
    controller.abort(new AiTimeoutError(stage));
  }, ms);
  const cleanup = () => {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onParentAbort);
  };
  return { signal: controller.signal, cleanup };
}

function stripJsonFences(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    const m = t.match(/^```[a-zA-Z]*\n?([\s\S]*?)```$/);
    if (m) t = m[1].trim();
  }
  return t;
}

function parseJsonLoose<T>(raw: string): T {
  const cleaned = stripJsonFences(raw);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first >= 0 && last > first) {
      return JSON.parse(cleaned.slice(first, last + 1)) as T;
    }
    throw new AiError("Could not parse model JSON", cleaned.slice(0, 500));
  }
}

function stripHtmlWrappers(html: string): string {
  let h = html;
  const fence = h.match(/^```(?:html)?\n?([\s\S]*?)```\s*$/);
  if (fence) h = fence[1];
  h = h.replace(/<\/?(?:html|head|body)[^>]*>/gi, "");
  return h.trim();
}

interface ProxyMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

interface ProxyBody {
  model: string;
  max_tokens: number;
  messages: ProxyMessage[];
  stream?: boolean;
}

async function callProxy(
  body: ProxyBody,
  signal: AbortSignal | undefined,
  timeoutMs: number,
  stage: string
): Promise<Response> {
  const { signal: combined, cleanup } = withTimeout(signal, timeoutMs, stage);
  try {
    const res = await fetch(PROXY, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: combined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new AiError(`${stage} failed (${res.status})`, text.slice(0, 400));
    }
    return res;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      if (combined.reason instanceof AiTimeoutError) {
        throw combined.reason;
      }
      throw err;
    }
    throw err;
  } finally {
    cleanup();
  }
}

function buildMessages(system: string, user: string): ProxyMessage[] {
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

function extractAssistantText(json: unknown): string {
  const j = json as {
    choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }>;
  };
  const c = j.choices?.[0]?.message?.content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.map((p) => p.text ?? "").join("");
  return "";
}

export async function classifyMetadata(opts: {
  description: string;
  context: string;
  signal?: AbortSignal;
}): Promise<MetadataResult> {
  const res = await callProxy(
    {
      model: MODEL_HAIKU,
      max_tokens: 600,
      messages: buildMessages(buildMetadataSystem(opts.context), opts.description),
    },
    opts.signal,
    TIMEOUT_METADATA,
    "Metadata classification"
  );
  const json = await res.json();
  const text = extractAssistantText(json);
  const parsed = parseJsonLoose<MetadataResult>(text);
  if (parsed.is_workflow === false) {
    throw new NotAWorkflowError();
  }
  if (!parsed.name || !parsed.layout_pattern) {
    throw new AiError("Metadata response missing required fields", text.slice(0, 400));
  }
  return parsed;
}

export interface StreamHtmlOpts {
  description: string;
  context: string;
  layout: LayoutPattern;
  rationale: string;
  name: string;
  summary: string;
  refinementPrompt?: string;
  previousHtml?: string;
  signal?: AbortSignal;
  onChunk: (fullHtmlSoFar: string) => void;
}

export async function streamHtml(opts: StreamHtmlOpts): Promise<{
  html: string;
  truncated: boolean;
}> {
  const system = buildHtmlSystem({
    context: opts.context,
    layout: opts.layout,
    rationale: opts.rationale,
    name: opts.name,
    summary: opts.summary,
    refinementPrompt: opts.refinementPrompt,
    previousHtml: opts.previousHtml,
  });

  const userContent = opts.refinementPrompt
    ? `Apply this change: ${opts.refinementPrompt}`
    : opts.description;

  const res = await callProxy(
    {
      model: MODEL_SONNET,
      max_tokens: 16000,
      messages: buildMessages(system, userContent),
      stream: true,
    },
    opts.signal,
    TIMEOUT_HTML,
    "HTML generation"
  );

  if (!res.body) {
    throw new AiError("HTML stream had no body");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let html = "";
  let truncated = false;
  let lastEmit = 0;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let lineEnd: number;
      while ((lineEnd = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, lineEnd).trim();
        buffer = buffer.slice(lineEnd + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        if (payload === "[DONE]") continue;
        let evt: {
          choices?: Array<{
            delta?: { content?: string };
            finish_reason?: string | null;
          }>;
          error?: { message?: string };
        };
        try {
          evt = JSON.parse(payload);
        } catch {
          continue;
        }
        if (evt.error) {
          throw new AiError("Stream error", evt.error.message ?? "");
        }
        const choice = evt.choices?.[0];
        if (!choice) continue;
        const piece = choice.delta?.content;
        if (typeof piece === "string" && piece.length > 0) {
          html += piece;
          const now = Date.now();
          if (now - lastEmit > 200) {
            lastEmit = now;
            opts.onChunk(stripHtmlWrappers(html));
          }
        }
        if (choice.finish_reason === "length") {
          truncated = true;
        }
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
  }

  const clean = stripHtmlWrappers(html);
  opts.onChunk(clean);
  return { html: clean, truncated };
}

export async function generateAnalysis(opts: {
  description: string;
  context: string;
  name: string;
  summary: string;
  layout: LayoutPattern;
  signal?: AbortSignal;
}): Promise<Analysis> {
  const system = buildAnalysisSystem({
    context: opts.context,
    name: opts.name,
    summary: opts.summary,
    layout: opts.layout,
    description: opts.description,
  });
  const res = await callProxy(
    {
      model: MODEL_SONNET,
      max_tokens: 6000,
      messages: buildMessages(system, "Produce the analysis JSON now."),
    },
    opts.signal,
    TIMEOUT_ANALYSIS,
    "Analysis"
  );
  const json = await res.json();
  const text = extractAssistantText(json);
  return parseJsonLoose<Analysis>(text);
}
