import { createServerFn } from "@tanstack/react-start";
import { callLlmGateway, stripJsonFences } from "./llmGateway.ts";
import type { ParsedMissionInput } from "./types/hangar-mission";

// Stage 2.2, Step 1 (MissionAgent.md Section 4.2.1) — Mission Decomposition.
// LLM call #2 overall (after Stage 2.1's combined intent+entity call).
// Input: detected_intent + extracted_entities from ParsedMissionInput.
// Output: decomposed_elements[] — discrete functional pieces of the mission.
//
// Prompt is verbatim from Section 4.2.1 (unlike Stage 2.1's intent/entity
// step, this one has a literal SYSTEM/USER block in the doc — nothing to
// adapt, just wire it up).
const SYSTEM = `You are Mission Agent's decomposition step for TorqWings' aerospace design platform. Break the mission into discrete functional elements. Each element should be a short phrase capturing one distinct aspect of the mission — domain/vertical, platform class, operational profile, regulatory category. Do not invent requirements not implied by the input. Return JSON only.`;

export interface MissionDecompositionInput {
  detectedIntent: string;
  extractedEntities: ParsedMissionInput["extractedEntities"];
}

export interface MissionDecompositionResult {
  decomposedElements: string[];
  mock: boolean;
}

export const decomposeMission = createServerFn({ method: "POST" })
  .validator((d: MissionDecompositionInput) => d)
  .handler(async ({ data }): Promise<MissionDecompositionResult> => {
    const userContent = `Mission intent: ${data.detectedIntent}
Extracted entities: ${JSON.stringify(data.extractedEntities, null, 2)}

Return:
{ "decomposed_elements": ["string", ...] }`;

    const { content } = await callLlmGateway(SYSTEM, userContent, { jsonMode: true });
    if (!content) return { ...mockDecomposition(data), mock: true };

    const parsed = parseDecompositionResponse(content);
    if (!parsed) return { ...mockDecomposition(data), mock: true };
    return { ...parsed, mock: false };
  });

function parseDecompositionResponse(raw: string): Omit<MissionDecompositionResult, "mock"> | null {
  try {
    const obj = JSON.parse(stripJsonFences(raw));
    if (!Array.isArray(obj.decomposed_elements)) return null;
    const decomposedElements = obj.decomposed_elements.filter(
      (e: unknown): e is string => typeof e === "string",
    );
    if (decomposedElements.length === 0) return null;
    return { decomposedElements };
  } catch {
    return null;
  }
}

function mockDecomposition(
  data: MissionDecompositionInput,
): Omit<MissionDecompositionResult, "mock"> {
  return {
    decomposedElements: [`Mock decomposition of intent: "${data.detectedIntent.slice(0, 80)}"`],
  };
}
