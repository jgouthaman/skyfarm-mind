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

// Token usage for one real Claude call — surfaced up through each stage's
// result so the UI can total requests/tokens across a whole mission run
// (see MissionDashboard's telemetry panel). null on a mock/failed call
// (nothing was actually sent), same "can't distinguish, don't need to"
// logic as LlmGatewayResult.content below.
export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface LlmGatewayResult {
  // null covers both "no ANTHROPIC_API_KEY configured" and "the call
  // failed" — callers can't distinguish the two and shouldn't need to;
  // either way the right move is falling back to that call's own mock.
  content: string | null;
  usage: LlmUsage | null;
}

export async function callLlmGateway(
  systemPrompt: string,
  userContent: string,
  opts?: { model?: string; jsonMode?: boolean },
): Promise<LlmGatewayResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { content: null, usage: null };

  // jsonMode: no request-level equivalent on the Messages API (no
  // response_format param, and assistant-prefill is removed on Sonnet 5) —
  // every caller's system prompt already says "Return JSON only" and
  // stripJsonFences below already tolerates fenced output, so this is a
  // no-op passthrough rather than a stricter mode, same as before.
  try {
    const client = new Anthropic({ apiKey: key });
    const response = await client.messages.create({
      model: opts?.model ?? "claude-sonnet-5",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    return {
      content: textBlock?.text ?? null,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  } catch {
    return { content: null, usage: null };
  }
}

// Live-connectivity check for the "AI" status indicator (Bay 01 header) —
// deliberately calls models.list() rather than messages.create(): it hits
// the same authenticated Anthropic endpoint/network path as a real
// generation call, but costs no tokens, so it's cheap enough to check on
// every page load. AbortSignal.timeout keeps a slow/unreachable API from
// hanging the indicator in a "checking" state.
export async function checkLlmLiveStatus(): Promise<boolean> {
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
