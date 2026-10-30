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

// ── Claude-only calls with tools (Raman, Bay 16) ─────────────────────────
//
// For callers that need what callLlmGateway can't give: tool use (the Noise
// Fix agent, via anthropicTurn below), Anthropic's server-side web search
// (propeller research -- Claude only, Groq has no equivalent here), and the
// reason a call failed rather than a bare null -- Raman's fallbacks must be
// loud, so the caller logs and shows `error`.
// Claude Opus 5.5 rejects forced tool_choice (any/tool), so callers steer
// tool use from the prompt with tool_choice auto and strict tool schemas.

export const RAMAN_CLAUDE_MODEL = "claude-opus-5-5";

export type ClaudeCallResult =
  | { ok: true; message: Anthropic.Message; usage: LlmUsage; model: string }
  | { ok: false; error: string };

export async function callClaude(params: {
  system: string;
  messages: Anthropic.MessageParam[];
  tools?: Anthropic.ToolUnion[];
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
  timeoutMs?: number;
}): Promise<ClaudeCallResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, error: "ANTHROPIC_API_KEY is not set" };
  try {
    const client = new Anthropic({ apiKey: key, timeout: params.timeoutMs ?? 60_000, maxRetries: 1 });
    const message = await client.messages.create({
      model: RAMAN_CLAUDE_MODEL,
      max_tokens: params.maxTokens ?? 16000,
      output_config: { effort: params.effort ?? "medium" },
      system: params.system,
      messages: params.messages,
      ...(params.tools ? { tools: params.tools, tool_choice: { type: "auto" as const } } : {}),
    });
    if (message.stop_reason === "refusal") {
      return { ok: false, error: `Claude declined the request (${message.stop_details?.category ?? "no category"})` };
    }
    if (message.stop_reason === "max_tokens") {
      return { ok: false, error: "Claude's reply hit max_tokens before finishing" };
    }
    return {
      ok: true,
      message,
      model: message.model,
      usage: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens },
    };
  } catch (err) {
    if (err instanceof Anthropic.APIError) return { ok: false, error: `Anthropic API ${err.status ?? "error"}: ${err.message}` };
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Provider-ordered tool conversations (Raman, Bay 16) ──────────────────
//
// Raman follows the same AI Providers order as Bay 01 (primary first, then
// secondary) for the Noise Check summary and the Noise Fix agent. One
// conversation shape over both providers: Anthropic (Claude Opus 5.5, tool
// use) and Groq (gpt-oss-120b, OpenAI-style function calling). A turn
// either succeeds with text + tool calls and a reply() to continue, or
// fails with the reason -- the caller tries the next provider, and only
// falls back to a mock/rule-based path loudly when none answers.

export interface AgentToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface AgentToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export type AgentTurnResult =
  | {
      ok: true;
      provider: LlmProvider;
      model: string;
      text: string;
      toolCalls: AgentToolCall[];
      // Continue the conversation: tool results for this turn's calls, and/or a follow-up user line.
      reply: (results: { id: string; content: string }[], userText?: string) => Promise<AgentTurnResult>;
    }
  | { ok: false; provider: LlmProvider; error: string };

interface TurnOpts {
  system: string;
  tools?: AgentToolDef[];
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
  timeoutMs?: number;
}

export const RAMAN_GROQ_MODEL = GROQ_FALLBACK_MODEL;

async function anthropicTurn(messages: Anthropic.MessageParam[], opts: TurnOpts): Promise<AgentTurnResult> {
  const res = await callClaude({
    system: opts.system,
    messages,
    tools: opts.tools?.map((t) => ({ ...t, strict: true }) as Anthropic.Tool),
    maxTokens: opts.maxTokens,
    effort: opts.effort,
    timeoutMs: opts.timeoutMs,
  });
  if (!res.ok) return { ok: false, provider: "anthropic", error: res.error };
  const msg = res.message;
  return {
    ok: true,
    provider: "anthropic",
    model: msg.model,
    text: claudeText(msg),
    toolCalls: msg.content
      .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
      .map((b) => ({ id: b.id, name: b.name, input: (b.input ?? {}) as Record<string, unknown> })),
    reply: (results, userText) =>
      anthropicTurn(
        [
          ...messages,
          // The full reply, thinking blocks included, passed back unchanged.
          { role: "assistant", content: msg.content },
          {
            role: "user",
            content: [
              ...results.map((r) => ({ type: "tool_result" as const, tool_use_id: r.id, content: r.content })),
              ...(userText ? [{ type: "text" as const, text: userText }] : []),
            ],
          },
        ],
        opts,
      ),
  };
}

type GroqMessage = Record<string, unknown>;

async function groqTurn(messages: GroqMessage[], opts: TurnOpts): Promise<AgentTurnResult> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return { ok: false, provider: "groq", error: "GROQ_API_KEY is not set" };
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GROQ_FALLBACK_MODEL,
        max_tokens: opts.maxTokens ?? 8000,
        messages: [{ role: "system", content: opts.system }, ...messages],
        ...(opts.tools
          ? {
              tools: opts.tools.map((t) => ({
                type: "function",
                function: { name: t.name, description: t.description, parameters: t.input_schema },
              })),
              tool_choice: "auto",
            }
          : {}),
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 60_000),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, provider: "groq", error: `Groq HTTP ${res.status}: ${json?.error?.message ?? "no details"}` };
    const choice = json?.choices?.[0];
    const m = choice?.message;
    if (!m) return { ok: false, provider: "groq", error: "Groq returned no message" };
    if (choice.finish_reason === "length") return { ok: false, provider: "groq", error: "Groq's reply hit max_tokens before finishing" };
    const rawCalls: { id: string; function: { name: string; arguments: string } }[] = m.tool_calls ?? [];
    const toolCalls: AgentToolCall[] = rawCalls.map((tc) => {
      let input: Record<string, unknown> = {};
      try {
        input = JSON.parse(tc.function.arguments || "{}");
      } catch {
        input = {};
      }
      return { id: tc.id, name: tc.function.name, input };
    });
    const assistant: GroqMessage = { role: "assistant", content: m.content ?? "" };
    if (rawCalls.length) assistant.tool_calls = rawCalls;
    return {
      ok: true,
      provider: "groq",
      model: json.model ?? GROQ_FALLBACK_MODEL,
      text: String(m.content ?? "").trim(),
      toolCalls,
      reply: (results, userText) =>
        groqTurn(
          [
            ...messages,
            assistant,
            ...results.map((r) => ({ role: "tool", tool_call_id: r.id, content: r.content })),
            ...(userText ? [{ role: "user", content: userText }] : []),
          ],
          opts,
        ),
    };
  } catch (err) {
    return { ok: false, provider: "groq", error: err instanceof Error ? err.message : String(err) };
  }
}

// First turn of a conversation with one provider.
export function startAgentTurn(provider: LlmProvider, userText: string, opts: TurnOpts): Promise<AgentTurnResult> {
  return provider === "anthropic"
    ? anthropicTurn([{ role: "user", content: userText }], opts)
    : groqTurn([{ role: "user", content: userText }], opts);
}

// The Mission Hub AI Providers order (primary first).
export function llmProviderOrder(): Promise<LlmProvider[]> {
  return providerOrder();
}

export function modelForProvider(provider: LlmProvider): string {
  return provider === "anthropic" ? RAMAN_CLAUDE_MODEL : RAMAN_GROQ_MODEL;
}

// Backs Raman's "AI" flag -- same logic as Bay 01's checkLlmLiveStatus:
// the first provider in the AI Providers order that's genuinely reachable
// (token-free probe), with the model Raman uses on it and the order itself.
export async function checkRamanAiStatus(): Promise<{
  live: boolean;
  provider: LlmProvider | null;
  model: string | null;
  configuredOrder: LlmProvider[];
}> {
  const configuredOrder = await providerOrder();
  for (const provider of configuredOrder) {
    if (await isProviderLive(provider)) return { live: true, provider, model: modelForProvider(provider), configuredOrder };
  }
  return { live: false, provider: null, model: null, configuredOrder };
}

// All text blocks of a Claude reply, joined.
export function claudeText(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
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
