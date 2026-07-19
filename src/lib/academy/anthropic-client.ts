const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

function anthropicHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY as string,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
  };
}

export async function streamAnthropicContent(
  topicBrief: string,
  onDelta: (fullTextSoFar: string) => void,
  maxTokens = 2000,
): Promise<void> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: anthropicHeaders(),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      stream: true,
      messages: [{ role: "user", content: topicBrief }],
    }),
  });
  if (!res.ok || !res.body) throw new Error(`Anthropic request failed: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let acc = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6);
      if (payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload);
        if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
          acc += evt.delta.text;
          onDelta(acc);
        }
      } catch {
        // ignore malformed SSE line
      }
    }
  }
}

export interface GeneratedQuestion {
  question: string;
  options: { a: string; b: string; c: string; d: string };
  correct: "a" | "b" | "c" | "d";
  explanation: string;
}

function stripJsonFences(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

function isValidQuestion(q: unknown): q is GeneratedQuestion {
  if (!q || typeof q !== "object") return false;
  const r = q as Record<string, unknown>;
  if (typeof r.question !== "string" || typeof r.explanation !== "string") return false;
  if (!["a", "b", "c", "d"].includes(r.correct as string)) return false;
  const opts = r.options as Record<string, unknown> | null;
  if (!opts || typeof opts !== "object") return false;
  return ["a", "b", "c", "d"].every((k) => typeof opts[k] === "string");
}

export async function generateAnthropicQuestions(
  topicBrief: string,
  count: number,
  maxTokens: number,
): Promise<GeneratedQuestion[]> {
  const prompt = `${topicBrief}

Generate exactly ${count} multiple-choice questions testing this material. Return ONLY a raw JSON array with no markdown code fences and no commentary. Each item must have this exact shape:
{"question": string, "options": {"a": string, "b": string, "c": string, "d": string}, "correct": "a"|"b"|"c"|"d", "explanation": string}`;

  const res = await fetch(API_URL, {
    method: "POST",
    headers: anthropicHeaders(),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      stream: false,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic request failed: ${res.status}`);
  const json = await res.json();
  const raw = json?.content?.[0]?.text;
  if (typeof raw !== "string") throw new Error("Empty response from Anthropic");

  const parsed = JSON.parse(stripJsonFences(raw));
  if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(isValidQuestion)) {
    throw new Error("Malformed question data");
  }
  return parsed as GeneratedQuestion[];
}
