import type { MassProperties } from "./cadDesignGeneration.ts";

// Bay 07 (Structural Agent) rules. The gate below mirrors
// simDesignRules.ts's exact pattern (flat rule table + evaluate function,
// no DB) — it runs BEFORE any LLM call, on Bay 04's already-known output
// shape (MassProperties + its own interference/DFM validation), and never
// proceeds to structural assessment for a CAD design already known to be
// nothing or already flagged as physically inconsistent. Same two signals
// simDesignRules.ts's own gate checks, for the same reason.
//
// No design_rules threshold lookup here, unlike simDesignRules.ts's
// loadPerformanceThresholds — that lookup was Bay 05-specific
// (SimulationOrchestratorAgent.md Section 1 names design_rules as the
// source of vertical performance thresholds; StructuralAgent.md carries no
// equivalent instruction, per the task's own Input scope note). Not added
// here on spec.
//
// Materials DB gap (StructuralAgent.md Section 5): "Material Properties"
// is listed as a Read input sourced from a Materials DB, but no such table
// exists anywhere in this codebase (confirmed: no tracked migration, no
// reference) — the same gap cadDesignPersistence.ts already documents for
// Hangar_Projects. There is therefore no real per-material allowable-stress
// lookup available to gate or score against. structuralGeneration.ts's
// system prompt instructs the LLM to reason using general/approximated
// aerospace material allowables (e.g. typical aluminum/composite yield
// figures) rather than a real database lookup — this is a disclosed,
// honest stopgap, not a claim that a Materials DB was consulted. Flagged
// here (the file where such a lookup would live if a real Materials DB
// existed) per the standing instruction to disclose gaps rather than
// invent placeholder data, same as simDesignRules.ts's own two documented
// design_rules gaps (payload/range curve, stability margin).

export interface StructuralGateContext {
  massProperties: MassProperties;
  interferenceClear: boolean;
}

export interface StructuralGateResult {
  eliminated: boolean;
  reasons: string[];
}

interface StructuralGateRule {
  id: string;
  trigger: string;
  matches: (ctx: StructuralGateContext) => boolean;
  reason: string;
}

const STRUCTURAL_GATE_RULES: StructuralGateRule[] = [
  {
    id: "STR-001",
    trigger: "CAD model weight is non-positive",
    matches: (ctx) => ctx.massProperties.weightKg <= 0,
    reason:
      "The upstream CAD model has a non-positive weight — there is nothing physically valid to run a structural assessment for.",
  },
  {
    id: "STR-002",
    trigger: "CAD design's own interference check did not clear",
    matches: (ctx) => !ctx.interferenceClear,
    reason:
      "The upstream CAD design's own interference/DFM validation did not clear — never proceed to structural assessment for a design already flagged as physically inconsistent.",
  },
];

export function evaluateStructuralGate(ctx: StructuralGateContext): StructuralGateResult {
  const reasons: string[] = [];
  for (const rule of STRUCTURAL_GATE_RULES) {
    if (rule.matches(ctx)) reasons.push(`${rule.id}: ${rule.reason}`);
  }
  return { eliminated: reasons.length > 0, reasons };
}
