import { getCFDAnalysis } from "./cfdAnalysisPersistence.ts";
import { getCADDesign, getSpecsForCADDesigns } from "./cadDesignPersistence.ts";
import { getAircraftDesign } from "./aircraftDesignPersistence.ts";
import { getConcept } from "./conceptPersistence.ts";
import { getSpecsForMissions } from "./missionPersistence.ts";
import { evaluateCFDRunGate, type CFDRunGateResult } from "./cfdRunRules.ts";
import { buildCFDCaseSetup, type CFDCaseSetupResult } from "./cfdCaseSetup.ts";
import {
  CFDRunDbError,
  createRun,
  getRun,
  listRunsForCfd,
  type CFDRunUserClient,
  type HangarCFDRunRow,
} from "./cfdRunPersistence.ts";
import { dispatchCFDRun, type CFDDispatchResult } from "./cfdDispatch.ts";
import { jsonResponse, errorResponse } from "./apiAuth.ts";

// Bay 06 (CFD Agent) "start a solver run" orchestrator: gate -> case setup
// (LLM picks settings only) -> Hangar_CFD_runs row -> dispatch to GCP.
// Separate from cfdAnalysisAgentPipeline.ts (the Phase 1 LLM estimate),
// which is unchanged. Gate and parent reads use the service-role getters,
// like every other bay's ownership check, so CFDRUN-001 can tell "missing"
// from "not yours"; the run row itself is read and written as the caller
// (cfdRunPersistence.ts).

export class InvalidCFDRunInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCFDRunInputError";
  }
}

export class CFDRunGateError extends Error {
  constructor(public readonly gate: CFDRunGateResult) {
    super(
      `CFD run blocked by ${gate.failedRuleIds.join(", ")}: ${gate.results
        .filter((r) => !r.passed)
        .map((r) => r.message)
        .join(" ")}`,
    );
    this.name = "CFDRunGateError";
  }

  // 404 missing/not yours, 409 already running, 422 no model file.
  get httpStatus(): number {
    const first = this.gate.failedRuleIds[0];
    if (first === "CFDRUN-001") return 404;
    if (first === "CFDRUN-003") return 409;
    return 422;
  }
}

// The /api/hangar/cfd-runs routes' error mapping: gate failures as 4xx with
// the rule IDs, bad input as 400, everything else via apiAuth's errorResponse.
export function cfdRunErrorResponse(err: unknown): Response {
  if (err instanceof CFDRunGateError) {
    return jsonResponse(
      { error: err.message, failedRuleIds: err.gate.failedRuleIds, gateResults: err.gate },
      err.httpStatus,
    );
  }
  if (err instanceof InvalidCFDRunInputError) return jsonResponse({ error: err.message }, 400);
  return errorResponse(err);
}

// The gate result with CFDRUN-003 flipped to failed, for an insert the
// active-run unique index rejected after the gate itself had passed.
function activeRunConflict(gate: CFDRunGateResult): CFDRunGateResult {
  const results = gate.results.map((r) =>
    r.id === "CFDRUN-003"
      ? {
          ...r,
          passed: false,
          message:
            "Another run for this CFD analysis started at the same time -- only one active run per CFD analysis.",
        }
      : r,
  );
  return { passed: false, results, failedRuleIds: ["CFDRUN-003"] };
}

// STL first (the solver meshes it directly), then STEP.
function modelFilePathOf(modelFiles: Record<string, unknown> | null | undefined): string | null {
  for (const key of ["stl", "step"]) {
    const v = modelFiles?.[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

// CAD design -> vehicle design -> mission (directly, or via the concept),
// then that mission's latest constraints/KPIs. Best-effort: any missing
// link just leaves the case setup without mission context.
async function missionContextFor(
  sourceAircraftDesignId: string,
): Promise<{ constraints: unknown[]; kpis: unknown[] }> {
  try {
    const aircraft = await getAircraftDesign(sourceAircraftDesignId);
    if (!aircraft) return { constraints: [], kpis: [] };
    const missionId =
      aircraft.source_mission_id ??
      (await getConcept(aircraft.source_concept_id))?.source_mission_id ??
      null;
    if (!missionId) return { constraints: [], kpis: [] };
    const [spec] = await getSpecsForMissions([missionId]);
    return { constraints: spec?.constraints ?? [], kpis: spec?.kpis ?? [] };
  } catch {
    return { constraints: [], kpis: [] };
  }
}

export interface StartCFDRunResult {
  runId: string;
  status: HangarCFDRunRow["status"];
  gateResults: CFDRunGateResult;
  caseSetup: CFDCaseSetupResult;
  dispatched: boolean;
  dispatch: CFDDispatchResult;
}

export async function startCFDRun(
  client: CFDRunUserClient,
  userId: string,
  cfdId: string | undefined,
): Promise<StartCFDRunResult> {
  if (!cfdId || typeof cfdId !== "string") {
    throw new InvalidCFDRunInputError("cfdId is required.");
  }

  const cfd = await getCFDAnalysis(cfdId);
  const owned = cfd && cfd.user_id === userId ? cfd : null;
  const cadDesign = owned ? await getCADDesign(owned.source_cad_design_id) : null;
  const [cadSpec] = cadDesign ? await getSpecsForCADDesigns([cadDesign.id]) : [];
  const modelFilePath = modelFilePathOf(cadSpec?.model_files);
  const existingRuns = owned ? await listRunsForCfd(client, cfdId) : [];

  const gate = evaluateCFDRunGate({
    userId,
    cfdRecord: cfd ? { id: cfd.id, user_id: cfd.user_id } : null,
    modelFilePath,
    existingRuns,
  });
  if (!gate.passed || !owned || !cadDesign) throw new CFDRunGateError(gate);

  const mission = await missionContextFor(cadDesign.source_aircraft_design_id);
  const caseSetup = await buildCFDCaseSetup({
    missionConstraints: mission.constraints,
    missionKpis: mission.kpis,
    cad: {
      cadCode: cadDesign.cad_code,
      modelFilePath,
      massProperties: cadSpec?.mass_properties ?? null,
      bom: cadSpec?.bom ?? [],
      designRationale: cadSpec?.design_rationale ?? null,
    },
  });

  let run: HangarCFDRunRow;
  try {
    run = await createRun(client, {
      cfdId,
      userId,
      caseSetup: {
        ...caseSetup.caseSetup,
        model_file_path: modelFilePath,
        defaulted_fields: caseSetup.defaultedFields,
        clamped_fields: caseSetup.clampedFields,
        setup_source: caseSetup.mock ? "defaults" : caseSetup.provider,
      },
      solver: caseSetup.caseSetup.solver,
      turbulenceModel: caseSetup.caseSetup.turbulence_model,
      isStub: false,
    });
  } catch (err) {
    // 23505: the partial unique index on active runs per cfd_id caught a
    // run started between the CFDRUN-003 check and this insert. Same 409
    // as CFDRUN-003.
    if (err instanceof CFDRunDbError && err.code === "23505") {
      throw new CFDRunGateError(activeRunConflict(gate));
    }
    throw err;
  }

  const dispatch = await dispatchCFDRun(run.id);
  return {
    runId: run.id,
    status: dispatch.status,
    gateResults: gate,
    caseSetup,
    dispatched: dispatch.dispatched,
    dispatch,
  };
}

export async function getCFDRun(
  client: CFDRunUserClient,
  runId: string,
): Promise<HangarCFDRunRow | null> {
  return getRun(client, runId);
}

export async function listCFDRuns(
  client: CFDRunUserClient,
  cfdId: string | null,
): Promise<HangarCFDRunRow[]> {
  if (!cfdId) throw new InvalidCFDRunInputError("cfdId query parameter is required.");
  return listRunsForCfd(client, cfdId);
}
