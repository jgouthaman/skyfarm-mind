import { createServerFn } from "@tanstack/react-start";
import { callLlmGateway, stripJsonFences } from "./llmGateway.ts";

// Stage 2.1, Step 2 (MissionAgent.md Section 4.1.1) — combined intent
// understanding + entity extraction, one LLM call covering both, not two
// round trips. Uses the shared callLlmGateway helper (llmGateway.ts) for
// the actual fetch/mock-fallback plumbing.
//
// Note on the prompt below: Section 4.1.1 describes this step's input,
// merge rule, and exact output shape (`{ intent, payload_hint, range_hint,
// endurance_hint, constraint_hints[] }`, line ~176) but — unlike Sections
// 4.2.1 and 4.3.1 — does not include a literal SYSTEM/USER prompt block for
// this specific step. The prompt below is written to match that described
// contract and mirrors the structure/tone of the doc's other explicit
// templates, since there was no verbatim block to adapt here.
const SYSTEM = `You are Mission Agent's intent-understanding and entity-extraction step for TorqWings' aerospace design platform. Given a mission's raw text and any already-structured requirement fields, identify the mission's intent and extract payload, range, and endurance hints plus any additional constraint hints. Explicit structured field values always win — if a field is already stated explicitly, do not re-guess it; only fill in what's genuinely missing. Return JSON only.`;

export interface IntentExtractionInput {
  rawTextCombined: string;
  structuredFields: Record<string, unknown>;
  groundingContext?: Record<string, unknown>;
}

export interface IntentExtractionResult {
  intent: string;
  payloadHint: string | null;
  rangeHint: string | null;
  enduranceHint: string | null;
  constraintHints: string[];
  mock: boolean;
}

export const extractIntentAndEntities = createServerFn({ method: "POST" })
  .validator((d: IntentExtractionInput) => d)
  .handler(async ({ data }): Promise<IntentExtractionResult> => {
    const userContent = `Raw mission text: ${data.rawTextCombined}
Structured fields already provided (do not re-derive these): ${JSON.stringify(data.structuredFields ?? {}, null, 2)}
Grounding context (from imported project / selected regulations / market data, if any): ${JSON.stringify(data.groundingContext ?? {}, null, 2)}

Return:
{ "intent": "string", "payload_hint": "string | null", "range_hint": "string | null", "endurance_hint": "string | null", "constraint_hints": ["string"] }`;

    const { content } = await callLlmGateway(SYSTEM, userContent, { jsonMode: true });
    if (!content) return { ...mockExtraction(data), mock: true };

    const parsed = parseExtractionResponse(content);
    if (!parsed) return { ...mockExtraction(data), mock: true };
    return { ...parsed, mock: false };
  });

function parseExtractionResponse(raw: string): Omit<IntentExtractionResult, "mock"> | null {
  try {
    const obj = JSON.parse(stripJsonFences(raw));
    if (typeof obj.intent !== "string") return null;
    return {
      intent: obj.intent,
      payloadHint: typeof obj.payload_hint === "string" ? obj.payload_hint : null,
      rangeHint: typeof obj.range_hint === "string" ? obj.range_hint : null,
      enduranceHint: typeof obj.endurance_hint === "string" ? obj.endurance_hint : null,
      constraintHints: Array.isArray(obj.constraint_hints)
        ? obj.constraint_hints.filter((c: unknown): c is string => typeof c === "string")
        : [],
    };
  } catch {
    return null;
  }
}

function mockExtraction(data: IntentExtractionInput): Omit<IntentExtractionResult, "mock"> {
  return {
    intent: `Mock intent derived from: "${data.rawTextCombined.slice(0, 80)}"`,
    payloadHint: null,
    rangeHint: null,
    enduranceHint: null,
    constraintHints: [],
  };
}
