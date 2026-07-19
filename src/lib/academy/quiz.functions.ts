import { createServerFn } from "@tanstack/react-start";

const ANTHROPIC_MODEL = "claude-sonnet-4-6";

export interface GeneratedQuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface GenerateQuizInput {
  topicBrief: string;
  count: number;
}

type GenerateQuizResult = { questions: GeneratedQuizQuestion[] } | { error: "missing_key" | "generation_failed" };

function stripJsonFences(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

function isValidQuestion(q: unknown): q is GeneratedQuizQuestion {
  if (!q || typeof q !== "object") return false;
  const r = q as Record<string, unknown>;
  return (
    typeof r.question === "string" &&
    Array.isArray(r.options) &&
    r.options.length === 4 &&
    r.options.every((o) => typeof o === "string") &&
    typeof r.correctIndex === "number" &&
    r.correctIndex >= 0 &&
    r.correctIndex <= 3 &&
    typeof r.explanation === "string"
  );
}

async function callAnthropic(key: string, prompt: string): Promise<string | null> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  const text = json?.content?.[0]?.text;
  return typeof text === "string" ? text : null;
}

export const generateQuizQuestions = createServerFn({ method: "POST" })
  .validator((d: GenerateQuizInput) => d)
  .handler(async ({ data }): Promise<GenerateQuizResult> => {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return { error: "missing_key" };

    const prompt = `${data.topicBrief}

Generate exactly ${data.count} multiple-choice questions testing this material. Return ONLY a raw JSON array with no markdown code fences and no commentary. Each item must have this exact shape:
{"question": string, "options": [string, string, string, string], "correctIndex": number (0-3, index of the correct option), "explanation": string}`;

    for (let attempt = 0; attempt < 2; attempt++) {
      const raw = await callAnthropic(key, prompt);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(stripJsonFences(raw));
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(isValidQuestion)) {
          return { questions: parsed as GeneratedQuizQuestion[] };
        }
      } catch {
        // fall through to retry
      }
    }
    return { error: "generation_failed" };
  });
