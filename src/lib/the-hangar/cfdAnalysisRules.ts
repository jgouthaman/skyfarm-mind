import type { MassProperties } from "./cadDesignGeneration.ts";

// Bay 06 (CFD Agent) rules — mirrors cadDesignRules.ts/simDesignRules.ts's
// pattern (flat rule table + evaluate function, no DB). Runs BEFORE any LLM
// call, on Bay 04's already-known output shape (MassProperties + its own
// interference/DFM validation) — the same two signals Bay 05's own gate
// checks, for the same reason: never proceed to a downstream assessment for
// a CAD design already known to be nothing or already flagged as
// physically inconsistent. CFDAgent.md doesn't spell out gate conditions
// explicitly, but Section 1's "same pattern as Bays 01-04" directive and
// the established gate-before-generate convention every prior bay follows
// both point to mirroring Bay 05's exact gate here, on the same available
// signals.

export interface CFDAnalysisGateContext {
  massProperties: MassProperties;
  interferenceClear: boolean;
}

export interface CFDAnalysisGateResult {
  eliminated: boolean;
  reasons: string[];
}

interface CFDAnalysisGateRule {
  id: string;
  trigger: string;
  matches: (ctx: CFDAnalysisGateContext) => boolean;
  reason: string;
}

const CFD_ANALYSIS_GATE_RULES: CFDAnalysisGateRule[] = [
  {
    id: "CFR-001",
    trigger: "CAD model weight is non-positive",
    matches: (ctx) => ctx.massProperties.weightKg <= 0,
    reason:
      "The upstream CAD model has a non-positive weight — there is nothing physically valid to run a CFD analysis against.",
  },
  {
    id: "CFR-002",
    trigger: "CAD design's own interference check did not clear",
    matches: (ctx) => !ctx.interferenceClear,
    reason:
      "The upstream CAD design's own interference/DFM validation did not clear — never proceed to CFD analysis for a design already flagged as physically inconsistent.",
  },
];

export function evaluateCFDAnalysisGate(ctx: CFDAnalysisGateContext): CFDAnalysisGateResult {
  const reasons: string[] = [];
  for (const rule of CFD_ANALYSIS_GATE_RULES) {
    if (rule.matches(ctx)) reasons.push(`${rule.id}: ${rule.reason}`);
  }
  return { eliminated: reasons.length > 0, reasons };
}
