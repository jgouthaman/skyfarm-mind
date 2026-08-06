import { createServerFn } from "@tanstack/react-start";
import {
  assembleMissionSpecs,
  finalizeConstraints,
  finalizeKpis,
  type FinalizedConstraint,
  type FinalizedKpi,
  type MissionSpecsFields,
} from "./missionSpecAssembly.ts";
import { generateMissionSummary } from "./missionSummary.ts";
import { computeConfidenceScore } from "./confidenceScore.ts";
import type { TracedConstraint } from "./constraintIdentification.ts";
import type { DerivedKpi, PrioritizedTradeoff } from "./types/hangar-mission";

// Stage 2.3 orchestrator (MissionAgent.md Section 4.3.1) — wires Steps 1-5
// together in the order the doc requires:
//   1-3 (assembleMissionSpecs, finalizeConstraints, finalizeKpis) —
//       deterministic, can run in any order relative to EACH OTHER, but
//       Step 4 depends on all three being finished.
//   4 (generateMissionSummary) — MUST run after 1-3, never in parallel:
//       "it summarizes the finished record, not the raw reasoning behind
//       it." Enforced here by simple sequencing — 1-3 are computed and
//       awaited-in first, generateMissionSummary is only called once their
//       results already exist as plain values.
//   5 (computeConfidenceScore) — runs last, after everything else exists
//       to measure completeness against.

export interface Stage3Input {
  missionId: string;
  // From Stage 2.1 (ParsedMissionInput)
  detectedIntent: string;
  sourceTypesUsedCount: number;
  validationFlagCount: number;
  operatingEnvironment?: string | null;
  // From Stage 2.2 (MissionReasoningResult, with the traced-constraint variant)
  decomposedElements: string[];
  identifiedConstraints: TracedConstraint[];
  derivedKpis: DerivedKpi[];
  prioritizedTradeoffs: PrioritizedTradeoff[];
}

// Same fields as MissionSpec (Section 12.1) but with a concrete
// `missionSpecs: MissionSpecsFields` instead of MissionSpec's
// `Record<string, unknown>` — createServerFn's return-value serialization
// checker can't prove an `unknown`-valued index signature is serializable,
// and the concrete shape is more useful to callers anyway (real field
// types instead of `unknown` on every access).
export interface Stage3Output {
  missionId: string;
  missionSpecs: MissionSpecsFields;
  constraints: FinalizedConstraint[];
  kpis: FinalizedKpi[];
  summary: string;
  confidenceScore: number;
  /** True if the summary LLM call fell back to its mock (no LOVABLE_API_KEY, or the call failed). */
  mock: boolean;
}

export const runOutputGeneration = createServerFn({ method: "POST" })
  .validator((d: Stage3Input) => d)
  .handler(async ({ data }): Promise<Stage3Output> => {
    // Steps 1-3 — deterministic assembly, computed before Step 4 is even called.
    const missionSpecs = assembleMissionSpecs({
      detectedIntent: data.detectedIntent,
      decomposedElements: data.decomposedElements,
      operatingEnvironment: data.operatingEnvironment,
    });
    const constraints = finalizeConstraints(data.identifiedConstraints);
    const kpis = finalizeKpis(
      data.derivedKpis,
      data.prioritizedTradeoffs,
      data.identifiedConstraints,
    );

    // Step 4 — summary. Only reachable with 1-3's finished results in hand.
    const summaryResult = await generateMissionSummary({
      data: { missionSpecs, constraints, kpis },
    });

    // Step 5 — confidence score, last, deterministic.
    const confidenceScore = computeConfidenceScore({
      sourceTypesUsedCount: data.sourceTypesUsedCount,
      derivedKpis: data.derivedKpis,
      validationFlagCount: data.validationFlagCount,
    });

    return {
      missionId: data.missionId,
      missionSpecs,
      constraints,
      kpis,
      summary: summaryResult.summary,
      confidenceScore,
      mock: summaryResult.mock,
    };
  });
