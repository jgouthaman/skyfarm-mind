import { createServerFn } from "@tanstack/react-start";
import { callLlmGateway, stripJsonFences } from "./llmGateway.ts";
import type {
  FinalizedConstraint,
  FinalizedKpi,
  MissionSpecsFields,
} from "./missionSpecAssembly.ts";

// Stage 2.3, Step 4 (MissionAgent.md Section 4.3.1) — Mission Summary. LLM
// call #3 overall. Prompt is verbatim from the doc plus one added sentence
// (last one, below) — nothing else to adapt here, unlike Stage 2.1's
// intent/entity step which had no literal template.
//
// MUST run after Steps 1-3 (missionSpecAssembly.ts) are finalized, never in
// parallel with them: "it summarizes the finished record, not the raw
// reasoning behind it." Enforced by stage3Orchestrator.ts's call order, not
// by anything in this file — this file only takes the already-finished
// shapes as input, so it has no way to run any earlier even by mistake.
//
// Why the last sentence exists: "do not introduce information not present"
// already covered new facts, but not paraphrase drift on facts that WERE
// present — confirmed live, a KPI target that was deterministically correct
// in the structured input (constraintIdentification.ts's structured-field
// override) still came out re-rounded/changed in the prose summary, since
// turning a JSON number into a sentence is its own LLM call with its own
// chance to drift, not a copy operation. Numeric fidelity is called out
// explicitly because that's the failure mode that actually happened, not a
// hypothetical one.
const SYSTEM = `Write a concise, plain-language summary of this mission for a human reviewer to confirm before it's saved. 3-5 sentences. State the mission type, the platform class, the top 2-3 constraints, and the primary KPI targets. Do not introduce any information not present in the structured input below — this is a summary, not a new inference. Every number you state (KPI targets, quantities, units) must match the structured input exactly, character-for-character — never round, convert units, or restate a target from memory or context.`;

export interface MissionSummaryInput {
  missionSpecs: MissionSpecsFields;
  constraints: FinalizedConstraint[];
  kpis: FinalizedKpi[];
}

export interface MissionSummaryResult {
  summary: string;
  mock: boolean;
}

export const generateMissionSummary = createServerFn({ method: "POST" })
  .validator((d: MissionSummaryInput) => d)
  .handler(async ({ data }): Promise<MissionSummaryResult> => {
    const userContent = `Mission specification: ${JSON.stringify(data.missionSpecs, null, 2)}
Constraints: ${JSON.stringify(data.constraints, null, 2)}
KPIs: ${JSON.stringify(data.kpis, null, 2)}

Return: { "summary": "string" }`;

    const { content } = await callLlmGateway(SYSTEM, userContent, { jsonMode: true });
    if (!content) return { summary: mockSummary(data), mock: true };

    const parsed = parseSummaryResponse(content);
    if (!parsed) return { summary: mockSummary(data), mock: true };
    return { summary: parsed, mock: false };
  });

function parseSummaryResponse(raw: string): string | null {
  try {
    const obj = JSON.parse(stripJsonFences(raw));
    return typeof obj.summary === "string" ? obj.summary : null;
  } catch {
    return null;
  }
}

function mockSummary(data: MissionSummaryInput): string {
  const topConstraints = data.constraints
    .slice(0, 2)
    .map((c) => `${c.name}: ${c.value}`)
    .join("; ");
  const topKpis = data.kpis
    .slice(0, 2)
    .map((k) => `${k.name} ${k.target}${k.unit}`)
    .join(", ");
  return `Mock summary — ${data.missionSpecs.missionType}. Key constraints: ${topConstraints || "none"}. Targets: ${topKpis || "none"}.`;
}
