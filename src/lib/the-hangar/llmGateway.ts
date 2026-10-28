import Anthropic from "@anthropic-ai/sdk";

// Shared LLM call helper for Mission Agent stages — extracted here so
// Stage 2.2's three new LLM calls (decomposition; combined constraint+KPI)
// don't each re-duplicate the SDK-call/mock-fallback plumbing Stage 2.1's
// intentExtraction.ts originally had inline.
//
// Calls Claude directly via the official Anthropic SDK — not the Lovable AI
// gateway this file used before, and not academy/anthropic-client.ts's raw
// fetch()-from-the-browser pattern (that file reads a client-exposed
// VITE_ANTHROPIC_API_KEY, a real but separate/unrelated issue). This is
// server-only code (see the note below), so the real ANTHROPIC_API_KEY is
// safe to use here.
//
// Deliberately NOT a createServerFn itself — it's a plain async function
// called from within each stage's own createServerFn handler (which is
// where the server-only execution boundary actually needs to live).
//
// Falls back to Groq (GROQ_API_KEY, an OpenAI-compatible REST API — no SDK
// dependency needed) whenever Anthropic is unreachable or unconfigured,
// before giving up to the caller's own mock output. This is a lower-trust
// path (the fallback model follows "return JSON only" less reliably than
// Claude) so the result says which provider actually answered, and callers
// that care (the "AI" status badge) can surface that rather than silently
// treating a Groq answer as equivalent to a Claude one.

// Token usage for one real LLM call — surfaced up through each stage's
// result so the UI can total requests/tokens across a whole mission run
// (see MissionDashboard's telemetry panel). null on a mock/failed call
// (nothing was actually sent), same "can't distinguish, don't need to"
// logic as LlmGatewayResult.content below.
export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
}

export type LlmProvider = "anthropic" | "groq";

// Not a Llama model — this account's Groq catalog doesn't include one of
// those as a general chat model (checked against GET /openai/v1/models);
// gpt-oss-120b is the general-purpose chat model actually available here.
// Revisit if/when a Llama chat model becomes available on this account.
const GROQ_FALLBACK_MODEL = "openai/gpt-oss-120b";

export interface LlmGatewayResult {
  // null covers both "no provider configured" and "every provider's call
  // failed" — callers can't distinguish the two and shouldn't need to;
  // either way the right move is falling back to that call's own mock.
  content: string | null;
  usage: LlmUsage | null;
  // Which provider actually produced `content` — null alongside a null
  // `content` (nothing answered).
  provider: LlmProvider | null;
}

async function callAnthropic(
  systemPrompt: string,
  userContent: string,
  model: string | undefined,
): Promise<{ content: string; usage: LlmUsage } | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const client = new Anthropic({ apiKey: key });
    const response = await client.messages.create({
      model: model ?? "claude-sonnet-5",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    });
    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock?.text) return null;
    return {
      content: textBlock.text,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  } catch {
    return null;
  }
}

async function callGroq(
  systemPrompt: string,
  userContent: string,
): Promise<{ content: string; usage: LlmUsage } | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_FALLBACK_MODEL,
        max_tokens: 4096,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const content: string | undefined = json?.choices?.[0]?.message?.content;
    if (!content) return null;
    return {
      content,
      usage: {
        inputTokens: json?.usage?.prompt_tokens ?? 0,
        outputTokens: json?.usage?.completion_tokens ?? 0,
      },
    };
  } catch {
    return null;
  }
}

export async function callLlmGateway(
  systemPrompt: string,
  userContent: string,
  opts?: { model?: string; jsonMode?: boolean },
): Promise<LlmGatewayResult> {
  // jsonMode: no request-level equivalent on either provider's API —
  // every caller's system prompt already says "Return JSON only" and
  // stripJsonFences below already tolerates fenced output, so this is a
  // no-op passthrough rather than a stricter mode, same as before.
  const anthropicResult = await callAnthropic(systemPrompt, userContent, opts?.model);
  if (anthropicResult) return { ...anthropicResult, provider: "anthropic" };

  const groqResult = await callGroq(systemPrompt, userContent);
  if (groqResult) return { ...groqResult, provider: "groq" };

  return { content: null, usage: null, provider: null };
}

// Live-connectivity check for the "AI" status indicator (Bay 01 header) —
// reports which provider would actually answer the next call, not just a
// boolean, so the badge can show the real model in use rather than always
// assuming Claude. Checks Anthropic first (models.list — same cheap,
// token-free pattern as before) and only checks Groq if Anthropic isn't
// reachable, since Anthropic is always preferred when both are up.
// AbortSignal.timeout keeps a slow/unreachable API from hanging the
// indicator in a "checking" state.
export async function checkLlmLiveStatus(): Promise<{ live: boolean; provider: LlmProvider | null }> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const client = new Anthropic({ apiKey: anthropicKey });
      await client.models.list({ limit: 1 }, { signal: AbortSignal.timeout(5000) });
      return { live: true, provider: "anthropic" };
    } catch {
      // fall through to Groq
    }
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${groqKey}` },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) return { live: true, provider: "groq" };
    } catch {
      // fall through to offline
    }
  }

  return { live: false, provider: null };
}

// Combines usage from multiple LLM calls within one stage (e.g. Stage 2's
// separate decomposition + constraint/KPI calls) into one aggregate —
// nulls (mock/failed calls) simply don't add anything, rather than
// poisoning the whole sum to null, so a stage where only SOME of its calls
// were real still reports accurate partial totals.
export function sumUsage(...usages: (LlmUsage | null)[]): LlmUsage {
  return usages.reduce<LlmUsage>(
    (acc, u) => ({
      inputTokens: acc.inputTokens + (u?.inputTokens ?? 0),
      outputTokens: acc.outputTokens + (u?.outputTokens ?? 0),
    }),
    { inputTokens: 0, outputTokens: 0 },
  );
}

// Models sometimes wrap JSON-mode output in ```json fences anyway — strip
// before JSON.parse. Same helper Stage 2.1 and Academy's Anthropic client
// each had their own copy of; consolidated here.
export function stripJsonFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}
