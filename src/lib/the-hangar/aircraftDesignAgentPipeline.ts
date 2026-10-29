import { getUsageForAircraftDesigns } from "./aircraftDesignPersistence.ts";
import type { GeometryParameters, ComponentSelection } from "./aircraftDesignTypes.ts";
import {
  getAircraftDesign,
  listUserAircraftDesigns,
  getSpecsForAircraftDesigns,
  type AircraftDesignRunStage,
  type AircraftDesignStatus,
  type HangarAircraftDesignRow,
} from "./aircraftDesignPersistence.ts";

// v1's Stage 1 (gate + one AI call) now lives in
// archive/vehicle-design-v1/geometryGenerationStage.ts, unwired, while the
// new Vehicle Design logic is built. This file keeps what is still live:
// ownership checks for Bay 04 and the "Your vehicle designs" list.
//
// Aircraft Design Agent (Bay 03) orchestrator — mirrors
// conceptAgentPipeline.ts's structure/style. This pass implements only
// Stage 1 (Geometry Generation, AircraftDesignAgent.md Section 4.1) as one
// complete vertical slice — prerequisite checks, the deterministic gate,
// the one LLM call, and persistence all happen here, since Stages 2-4
// don't exist yet to hand off to. The UI is not wired this pass.

export class AircraftDesignAgentError extends Error {
  constructor(
    message: string,
    public readonly aircraftDesignId: string,
    public readonly stage: AircraftDesignRunStage,
  ) {
    super(message);
    this.name = "AircraftDesignAgentError";
  }
}

export class InvalidAircraftDesignInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAircraftDesignInputError";
  }
}

// New with Bay 04 — Bay 03 itself never needed this: Stage 1 always creates
// a fresh Hangar_aircraft_designs row, so there was nothing pre-existing to
// check ownership on. Bay 04 is the first bay that reads an *existing*
// aircraft design by a client-supplied id, so it needs the same
// never-trust-a-client-supplied-id check assertConceptOwnership already
// applies for concepts.
export async function assertAircraftDesignOwnership(
  aircraftDesignId: string,
  userId: string,
): Promise<HangarAircraftDesignRow> {
  const design = await getAircraftDesign(aircraftDesignId);
  if (!design) {
    throw new Error(
      `No Hangar_aircraft_designs row found for aircraftDesignId "${aircraftDesignId}"`,
    );
  }
  if (design.user_id !== userId) {
    throw new Error(`Aircraft design "${design.id}" does not belong to user "${userId}"`);
  }
  return design;
}

// ── Stage 01 — Geometry Generation ───────────────────────────────────────

export interface Stage1Request {
  userId: string;
  conceptId: string;
}

export interface Stage1Result {
  aircraftDesignId: string;
  designCode: string;
  geometryParameters: GeometryParameters;
  componentSelections: ComponentSelection[];
  designRationale: string;
  sourceWasMock: boolean;
  confidenceScore: number;
  specVersion: number;
  // Requests & tokens for this run (one AI call), and how long it took.
  usage: AircraftDesignUsage | null;
  durationMs: number;
}

// One stage, one AI call -- same requests/tokens/cost shape the Bay 01/02
// pages use. null when the call fell back to mock output (nothing billed).
export interface AircraftDesignUsage {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  provider: "anthropic" | "groq" | null;
}

// ── "Your aircraft designs" list ─────────────────────────────────────────

export interface AircraftDesignListEntry {
  aircraftDesignId: string;
  designCode: string;
  sourceConceptId: string;
  status: AircraftDesignStatus;
  createdAt: string;
  geometryParameters: GeometryParameters | null;
  componentSelections: ComponentSelection[] | null;
  designRationale: string | null;
  confidenceScore: number | null;
  sourceWasMock: boolean | null;
  // Rebuilt from the run log (output_snapshot.generation.usage), summed over
  // every successful run of this design. null when nothing was recorded --
  // designs generated before usage was kept, or mock-only runs.
  usage: AircraftDesignUsage | null;
}

export async function listAircraftDesignsForUser(
  userId: string,
): Promise<AircraftDesignListEntry[]> {
  const designs = await listUserAircraftDesigns(userId);
  const ids = designs.map((d) => d.id);
  const [specs, usageByDesign] = await Promise.all([
    getSpecsForAircraftDesigns(ids),
    getUsageForAircraftDesigns(ids),
  ]);
  const specsByDesign = new Map(specs.map((s) => [s.aircraft_design_id, s]));
  return designs.map((d): AircraftDesignListEntry => {
    const spec = specsByDesign.get(d.id);
    return {
      aircraftDesignId: d.id,
      designCode: d.design_code,
      sourceConceptId: d.source_concept_id,
      status: d.status,
      createdAt: d.created_at,
      geometryParameters: spec ? (spec.geometry_parameters as unknown as GeometryParameters) : null,
      componentSelections: spec
        ? (spec.component_selections as unknown as ComponentSelection[])
        : null,
      designRationale: spec?.design_rationale ?? null,
      confidenceScore: spec?.confidence_score ?? null,
      sourceWasMock: spec?.source_was_mock ?? null,
      usage: usageByDesign.get(d.id) ?? null,
    };
  });
}
