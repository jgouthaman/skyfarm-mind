import { getUsageForAircraftDesigns } from "./aircraftDesignPersistence.ts";
import type { GeometryParameters, ComponentSelection } from "./aircraftDesignTypes.ts";
import { assertConceptOwnership, assertMissionOwnership } from "./conceptAgentPipeline.ts";
import { bay3FilesBaseUrl, findDesignFiles } from "./designFileServer.ts";
import { getLatestBernoulliReviewForMission } from "./bernoulliPersistence.ts";
import {
  getAircraftDesign,
  listUserAircraftDesigns,
  getSpecsForAircraftDesigns,
  createAircraftDesign,
  findSavedPythonDesign,
  persistAircraftDesignSpec,
  logAircraftDesignStageRun,
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

// ── Save a design from the Python backend (Bay 03 v2) ────────────────────

export interface SaveVehicleDesignResult {
  aircraftDesignId: string;
  designCode: string;
  conceptId: string;
  conceptCode: string;
  missionId: string;
  missionCode: string;
  sourceDesignId: string;
  specVersion: number | null;
  alreadySaved: boolean;
  // Latest Bernoulli review of this exact design file, if one was run first.
  bernoulliVerdict: "PASS" | "WARN" | "FAIL" | null;
  bernoulliReviewCode: string | null;
}

// Saves the concept's current backend output as a design: Mission -> Concept
// -> Design, with the full JSON/.md on the spec row for Bay 04 (CAD). Re-reads
// the files from the GCP server itself -- never trusts JSON sent by a browser.
// Saving the same backend design_id again returns the existing design.
export async function saveVehicleDesign(request: { userId: string; conceptId: string }): Promise<SaveVehicleDesignResult> {
  const { userId, conceptId } = request;
  if (!conceptId) throw new InvalidAircraftDesignInputError("conceptId is required.");
  const concept = await assertConceptOwnership(conceptId, userId);
  if (concept.status !== "finalized") {
    throw new InvalidAircraftDesignInputError("Only a finalized concept's design can be saved.");
  }
  const mission = await assertMissionOwnership(concept.source_mission_id, userId);

  const found = await findDesignFiles(concept.concept_code, concept.id);
  if (!found) {
    throw new InvalidAircraftDesignInputError(
      `No design files for concept ${concept.concept_code} on the GCP server yet -- run Generate Design first.`,
    );
  }
  const out = found.design as unknown as PythonDesignOutput;
  const sourceDesignId = typeof out.design_id === "string" && out.design_id ? out.design_id : null;
  const wing = out.geometry?.wing;
  if (!sourceDesignId || !wing || typeof wing.span_m !== "number") {
    throw new InvalidAircraftDesignInputError("The design JSON is missing design_id or geometry.wing -- not a Vehicle Design output.");
  }

  const base = {
    conceptId: concept.id,
    conceptCode: concept.concept_code,
    missionId: mission.id,
    missionCode: mission.mission_code,
    sourceDesignId,
  };
  // Bernoulli advises, it doesn't block: the latest review of this same
  // design file (if any) is recorded with the design.
  const latestReview = await getLatestBernoulliReviewForMission(userId, mission.id, concept.id, "vehicle_design").catch(() => null);
  const review = latestReview && latestReview.review.design_ref === sourceDesignId ? latestReview : null;
  const bern = {
    bernoulliVerdict: review?.spec.verdict ?? null,
    bernoulliReviewCode: review?.review.review_code ?? null,
  };

  const existing = await findSavedPythonDesign(concept.id, sourceDesignId);
  if (existing) {
    return {
      ...base,
      aircraftDesignId: existing.id,
      designCode: existing.design_code,
      specVersion: null,
      alreadySaved: true,
      bernoulliVerdict: existing.bernoulli_verdict ?? bern.bernoulliVerdict,
      bernoulliReviewCode: bern.bernoulliReviewCode,
    };
  }

  const reqs = Array.isArray(out.requirement_traceability) ? out.requirement_traceability : [];
  // Share of mission requirements the design meets (all PASS = 1).
  const confidenceScore = reqs.length ? reqs.filter((r) => r.status === "PASS").length / reqs.length : 0;
  const design = await createAircraftDesign(userId, concept.id, {
    sourceMissionId: mission.id,
    sourceDesignId,
    designSource: "python_vm",
    status: "finalized",
    bernoulli: review ? { reviewId: review.review.id, verdict: review.spec.verdict } : null,
  });
  const start = Date.now();
  const location = `${bay3FilesBaseUrl()}/${found.folder}/${found.files[0]}`;
  const spec = await persistAircraftDesignSpec(design.id, {
    // v1 shape, so Bay 04 (CAD) and the designs list keep working unchanged.
    geometryParameters: {
      wingspan_m: wing.span_m,
      fuselageLength_m: out.geometry?.fuselage?.length_m ?? 0,
      wingArea_m2: wing.area_m2 ?? 0,
      aspectRatio: wing.aspect_ratio ?? 0,
      vehicleClass: out.aircraft_class ?? "",
    },
    componentSelections: (out.commercial_components ?? []).map((c) => ({
      category: c.category,
      selection: [c.manufacturer, c.model?.replace(`${c.manufacturer} `, "")].filter(Boolean).join(" "),
      rationale: `${c.role}${c.quantity ? ` × ${c.quantity}` : ""}`,
    })),
    designRationale: [out.configuration, out.validation_status?.flight_status_note].filter(Boolean).join(". "),
    confidenceScore,
    sourceWasMock: false,
    designOutput: found.design,
    designMarkdown: found.markdown,
    sourceLocation: location,
  });
  await logAircraftDesignStageRun(
    design.id,
    "output_interface",
    { conceptId: concept.id, missionId: mission.id, location },
    { saved: true, sourceDesignId, specVersion: spec.version },
    "success",
    Date.now() - start,
  );
  return { ...base, ...bern, aircraftDesignId: design.id, designCode: design.design_code, specVersion: spec.version, alreadySaved: false };
}

// Only the fields saveVehicleDesign reads; the whole object is stored.
interface PythonDesignOutput {
  design_id?: string;
  aircraft_class?: string;
  configuration?: string;
  geometry?: { wing?: { span_m?: number; area_m2?: number; aspect_ratio?: number }; fuselage?: { length_m?: number } };
  commercial_components?: { category: string; role: string; manufacturer?: string; model?: string; quantity?: number }[];
  requirement_traceability?: { status: string }[];
  validation_status?: { flight_status_note?: string };
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
  // Saved Python designs (design_source "python_vm"): the mission it traces
  // to, the backend's design_id, and its full output; null on v1 designs.
  designSource: "ai_v1" | "python_vm";
  sourceMissionId: string | null;
  sourceDesignId: string | null;
  designOutput: Record<string, unknown> | null;
  designMarkdown: string | null;
  sourceLocation: string | null;
  bernoulliVerdict: "PASS" | "WARN" | "FAIL" | null;
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
      designSource: d.design_source ?? "ai_v1",
      sourceMissionId: d.source_mission_id ?? null,
      sourceDesignId: d.source_design_id ?? null,
      designOutput: spec?.design_output ?? null,
      designMarkdown: spec?.design_markdown ?? null,
      sourceLocation: spec?.source_location ?? null,
      bernoulliVerdict: d.bernoulli_verdict ?? null,
    };
  });
}
