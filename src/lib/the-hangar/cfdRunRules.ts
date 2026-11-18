// Bay 06 (CFD Agent) "start a solver run" gate -- same flat rule table +
// evaluate function as cfdAnalysisRules.ts and the other bays' *Rules.ts (no
// DB, no LLM). Runs before a Hangar_CFD_runs row is created or anything is
// dispatched to GCP. Unlike the generation gates, which only report the
// rules that tripped, this returns every rule's pass/fail so the route can
// hand the caller the full checklist (and a 4xx with the failing rule IDs).

// Statuses that mean a run is still in flight (Hangar_CFD_runs.status).
export const ACTIVE_CFD_RUN_STATUSES = [
  "queued",
  "dispatched",
  "meshing",
  "solving",
  "postprocessing",
] as const;

export interface CFDRunGateContext {
  userId: string;
  // The parent Hangar_CFDAnalyses row, or null when no row has that id.
  cfdRecord: { id: string; user_id: string } | null;
  // STEP/STL path resolved for the record's CAD design, or null.
  modelFilePath: string | null;
  // Other runs for the same cfd_id (any status); only active ones block.
  existingRuns: { id: string; status: string }[];
}

export interface CFDRunGateRuleResult {
  id: string;
  passed: boolean;
  message: string;
}

export interface CFDRunGateResult {
  passed: boolean;
  results: CFDRunGateRuleResult[];
  failedRuleIds: string[];
}

const MODEL_FILE_EXT = /\.(step|stp|stl)$/i;

interface CFDRunGateRule {
  id: string;
  check: (ctx: CFDRunGateContext) => { passed: boolean; message: string };
}

const CFD_RUN_GATE_RULES: CFDRunGateRule[] = [
  {
    id: "CFDRUN-001",
    check: (ctx) => {
      if (!ctx.cfdRecord) return { passed: false, message: "No CFD analysis exists with this id." };
      if (ctx.cfdRecord.user_id !== ctx.userId) {
        return { passed: false, message: "This CFD analysis belongs to another user." };
      }
      return { passed: true, message: "CFD analysis found and owned by you." };
    },
  },
  {
    id: "CFDRUN-002",
    check: (ctx) => {
      const path = ctx.modelFilePath?.trim();
      if (!path) {
        return {
          passed: false,
          message:
            "No CAD model file (STEP or STL) is available for this CFD analysis's CAD design.",
        };
      }
      if (!MODEL_FILE_EXT.test(path)) {
        return {
          passed: false,
          message: `The CAD model file "${path}" is not a STEP or STL file.`,
        };
      }
      return { passed: true, message: `CAD model file available: ${path}` };
    },
  },
  {
    id: "CFDRUN-003",
    check: (ctx) => {
      const active = ctx.existingRuns.filter((r) =>
        (ACTIVE_CFD_RUN_STATUSES as readonly string[]).includes(r.status),
      );
      if (active.length > 0) {
        return {
          passed: false,
          message: `Run ${active[0].id} is still ${active[0].status} -- only one active run per CFD analysis.`,
        };
      }
      return { passed: true, message: "No other run is active for this CFD analysis." };
    },
  },
];

export function evaluateCFDRunGate(ctx: CFDRunGateContext): CFDRunGateResult {
  const results = CFD_RUN_GATE_RULES.map((rule) => ({ id: rule.id, ...rule.check(ctx) }));
  const failedRuleIds = results.filter((r) => !r.passed).map((r) => r.id);
  return { passed: failedRuleIds.length === 0, results, failedRuleIds };
}
