import type { MissionSourceInput, SourceType } from "./hangar-mission";
import type { Stage4Result } from "../missionAgentPipeline.ts";

// The two public-boundary wire mappers for the 4-stage Mission Agent API.
// Everything else — the 3 hand-offs between stages 1->2, 2->3, 3->4 — is
// internal-only plumbing for this one UI and is passed as plain camelCase
// JSON, un-mapped (see Stage2Request/Stage2Result/Stage3Request/Stage3Output
// in missionAgentPipeline.ts / stage3Orchestrator.ts — those interfaces
// *are* the wire contract for those 3 calls). Only Stage 1's request and
// Stage 4's response match MissionAgent.md Section 11's documented public
// schema (snake_case), since those are the two boundaries a future non-UI
// caller would actually rely on.

interface WireMissionSource {
  source_type: SourceType;
  raw_input: Record<string, unknown>;
}

export interface Stage1PublicRequest {
  sources: WireMissionSource[];
}

export function toMissionSourceInputs(body: Stage1PublicRequest): MissionSourceInput[] {
  return body.sources.map((s) => ({ sourceType: s.source_type, rawInput: s.raw_input }));
}

export interface FinalMissionResponse {
  mission_id: string;
  mission_code: string;
  mission_specs: Record<string, unknown>;
  constraints: unknown[];
  kpis: unknown[];
  summary: string;
  confidence_score: number;
  validation_flags: string[];
}

// validationFlags comes from the caller's already-held Stage 1 result —
// Stage 4's own persistence/status/stub logic never touches them, so
// there's no reason to thread them back through stages 2-4 just to echo
// them out here.
export function toFinalMissionResponse(
  stage4: Stage4Result,
  validationFlags: string[],
): FinalMissionResponse {
  return {
    mission_id: stage4.missionId,
    mission_code: stage4.missionCode,
    mission_specs: stage4.missionSpecs as unknown as Record<string, unknown>,
    constraints: stage4.constraints,
    kpis: stage4.kpis,
    summary: stage4.summary,
    confidence_score: stage4.confidenceScore,
    validation_flags: validationFlags,
  };
}
