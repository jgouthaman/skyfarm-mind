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
// Two providers -- Anthropic and Groq (GROQ_API_KEY, an OpenAI-compatible
// REST API, no SDK dependency) -- tried in the order set in Mission Hub ->
// Configurations -> AI Providers (default: Anthropic first, Groq fallback).
// A provider that's unconfigured or fails is skipped; if none answers, the
// caller falls back to its own mock output. The result says which provider
// actually answered, and callers that care (the "AI" status badge) surface
// that rather than treating a Groq answer as equivalent to a Claude one.

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
  for (const provider of await providerOrder()) {
    const result =
      provider === "anthropic"
        ? await callAnthropic(systemPrompt, userContent, opts?.model)
        : await callGroq(systemPrompt, userContent);
    if (result) return { ...result, provider };
  }
  return { content: null, usage: null, provider: null };
}

// Order the providers are tried in, from Mission Hub -> Configurations -> AI
// Providers (llmProviderSettings.ts, cached ~30s). Imported lazily so this
// module stays free of the database client, and any failure falls back to
// Anthropic first, Groq second -- the order before the setting existed.
async function providerOrder(): Promise<LlmProvider[]> {
  try {
    const { getProviderOrder } = await import("./llmProviderSettings.ts");
    return (await getProviderOrder()).order;
  } catch {
    return ["anthropic", "groq"];
  }
}

async function isProviderLive(provider: LlmProvider): Promise<boolean> {
  if (provider === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return false;
    try {
      const client = new Anthropic({ apiKey: key });
      await client.models.list({ limit: 1 }, { signal: AbortSignal.timeout(5000) });
      return true;
    } catch {
      return false;
    }
  }
  const key = process.env.GROQ_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Live-connectivity check for the "AI" status indicator — reports which
// provider would actually answer the next call: the first live one in the
// configured order. Token-free probes (models list); AbortSignal.timeout
// keeps a slow/unreachable API from hanging the indicator in "checking".
export async function checkLlmLiveStatus(): Promise<{ live: boolean; provider: LlmProvider | null }> {
  for (const provider of await providerOrder()) {
    if (await isProviderLive(provider)) return { live: true, provider };
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
