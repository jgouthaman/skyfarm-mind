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

export interface LlmGatewayResult {
  // null covers both "no ANTHROPIC_API_KEY configured" and "the call
  // failed" — callers can't distinguish the two and shouldn't need to;
  // either way the right move is falling back to that call's own mock.
  content: string | null;
  // TEMPORARY DIAGNOSTIC — only populated when opts.debugLabel is set.
  // Revert alongside every other "TEMPORARY DIAGNOSTIC" marker in this file
  // once the real cause of Bay 05's mock fallback is found. Returning
  // internal error detail to a caller (and, from there, into an API
  // response body) is not something that should ship.
  debugErrorDetail?: string;
}

// TEMPORARY DIAGNOSTIC — see debugErrorDetail above. Builds a compact,
// human-readable description of a caught error without assuming it's an
// Anthropic SDK error specifically (duck-types status/error.type since
// importing the SDK's error class just for this diagnostic isn't worth it
// for temporary code).
function describeError(err: unknown): string {
  if (err instanceof Error) {
    const withDetails = err as Error & { status?: number; error?: { type?: string } };
    const parts = [withDetails.message];
    if (withDetails.status !== undefined) parts.push(`status=${withDetails.status}`);
    if (withDetails.error?.type) parts.push(`type=${withDetails.error.type}`);
    return parts.join(" | ");
  }
  return String(err);
}

export async function callLlmGateway(
  systemPrompt: string,
  userContent: string,
  opts?: { model?: string; jsonMode?: boolean; debugLabel?: string },
): Promise<LlmGatewayResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    // TEMPORARY DIAGNOSTIC — revert once the real cause of Bay 05's mock
    // fallback is found. Gated behind opts.debugLabel so every existing
    // caller (Mission/Concept/AircraftDesign/CAD) that doesn't pass it is
    // completely unaffected — same silent behavior as before.
    if (opts?.debugLabel) {
      console.error(`[${opts.debugLabel}] callLlmGateway: ANTHROPIC_API_KEY is not set`);
    }
    return {
      content: null,
      ...(opts?.debugLabel
        ? { debugErrorDetail: "MISSING_KEY: ANTHROPIC_API_KEY is not set" }
        : {}),
    };
  }

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
    return { content: textBlock?.text ?? null };
  } catch (err) {
    // TEMPORARY DIAGNOSTIC — same gating/revert note as above. This is the
    // catch block that was silently swallowing the real cause (invalid
    // key, network error, non-2xx response, etc.) into a generic
    // { content: null } for every caller.
    if (opts?.debugLabel) {
      console.error(`[${opts.debugLabel}] callLlmGateway: Anthropic call failed:`, err);
    }
    return {
      content: null,
      ...(opts?.debugLabel ? { debugErrorDetail: `CALL_FAILED: ${describeError(err)}` } : {}),
    };
  }
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
