// Shared LLM call helper for Mission Agent stages — extracted here so
// Stage 2.2's three new LLM calls (decomposition; combined constraint+KPI)
// don't each re-duplicate the fetch/mock-fallback plumbing Stage 2.1's
// intentExtraction.ts originally had inline. Follows the same gateway/model
// choice as src/lib/design-studio/advisor.functions.ts (the closest
// precedent in this codebase — no ModelProvider interface exists anywhere
// in the repo to adapt to instead).
//
// Deliberately NOT a createServerFn itself — it's a plain async function
// called from within each stage's own createServerFn handler (which is
// where the server-only execution boundary actually needs to live).

export interface LlmGatewayResult {
  // null covers both "no LOVABLE_API_KEY configured" and "the call failed" —
  // callers can't distinguish the two and shouldn't need to; either way the
  // right move is falling back to that call's own mock.
  content: string | null;
}

export async function callLlmGateway(
  systemPrompt: string,
  userContent: string,
  opts?: { model?: string; jsonMode?: boolean },
): Promise<LlmGatewayResult> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return { content: null };

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: opts?.model ?? "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        ...(opts?.jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!res.ok) return { content: null };

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    return { content: typeof content === "string" ? content : null };
  } catch {
    return { content: null };
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
