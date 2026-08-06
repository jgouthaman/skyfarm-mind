// Verbatim from MissionAgent.md Section 12.1 ("types/hangar-mission.ts").
// Path adapted from the doc's bare `types/hangar-mission.ts` to live under
// src/lib/the-hangar/types/ — this repo has no top-level types/ folder,
// everything is colocated per-feature under src/ (see src/lib/design-studio/types.ts).

export type SourceType =
  | "natural_language"
  | "document"
  | "requirements_form"
  | "existing_project"
  | "regulations"
  | "market_data";

export interface MissionSourceInput {
  sourceType: SourceType;
  rawInput: Record<string, unknown>;
}

export interface ParsedMissionInput {
  rawTextCombined: string;
  sourceTypesUsed: SourceType[];
  detectedIntent: string;
  extractedEntities: {
    payloadHint: string | null;
    rangeHint: string | null;
    enduranceHint: string | null;
    constraintHints: string[];
  };
  attachedRegulations: string[];
  importedMissionRef: string | null;
  validationFlags: string[];
}

export interface MissionReasoningResult {
  decomposedElements: string[];
  identifiedConstraints: {
    name: string;
    value: string;
    source: "user" | "regulation" | "inferred";
  }[];
  derivedKpis: { name: string; target: string; unit: string }[];
  prioritizedTradeoffs: { item: string; rationale: string }[];
}

export interface MissionSpec {
  missionId: string;
  missionSpecs: Record<string, unknown>;
  constraints: { name: string; value: string; sources: string[] }[];
  kpis: { name: string; target: string; unit: string; priority: "critical" | number }[];
  summary: string;
  confidenceScore: number;
}
