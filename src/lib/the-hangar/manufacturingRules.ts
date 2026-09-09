// Bay 11 (Manufacturing Agent) rules -- mirrors materialsRules.ts's exact
// pattern (flat rule table + evaluate function, no DB). Runs BEFORE any LLM
// call, on Bay 09's already-known output shape -- never proceed to
// manufacturing reasoning for a validation result that's already known to
// be invalid, unfinished, or hard-failed (ManufacturingAgent.md Section 1,
// Gate logic).
//
// Bay 11 fans in from ONE upstream source (Bay 09 only), same single-source
// shape Bay 10 (Materials) itself uses -- Bay 11 is a SIBLING of Bay 10,
// not downstream of it, so this is an independent mirror of Bay 10's own
// MAT-001/MAT-002/MAT-003 pattern, not a reuse of it.

export interface ManufacturingGateContext {
  validationVerdict: "PASS" | "FAIL" | "CONDITIONAL";
  validationStatus: string;
  validationReadinessScore: number | null;
}

export interface ManufacturingGateResult {
  eliminated: boolean;
  reasons: string[];
}

interface ManufacturingGateRule {
  id: string;
  trigger: string;
  matches: (ctx: ManufacturingGateContext) => boolean;
  reason: string;
}

const MANUFACTURING_GATE_RULES: ManufacturingGateRule[] = [
  {
    id: "MFG-001",
    trigger: "Referenced validation result is not spec-ready",
    matches: (ctx) => ctx.validationStatus !== "spec_ready",
    reason:
      "The referenced Bay 09 result is still draft, processing, or errored -- never plan manufacturing for a result that isn't finished being produced yet.",
  },
  {
    id: "MFG-002",
    trigger: "Referenced validation verdict is FAIL",
    matches: (ctx) => ctx.validationVerdict === "FAIL",
    reason:
      "The referenced Bay 09 result hard-failed validation -- never plan manufacturing for a design that has already failed outright. CONDITIONAL still proceeds.",
  },
  {
    id: "MFG-003",
    trigger: "Validation readiness score is null or non-positive",
    matches: (ctx) => ctx.validationReadinessScore === null || ctx.validationReadinessScore <= 0,
    reason:
      "The upstream validation result has no valid readiness score -- there is nothing physically valid to plan manufacturing against.",
  },
];

export function evaluateManufacturingGate(
  ctx: ManufacturingGateContext,
): ManufacturingGateResult {
  const reasons: string[] = [];
  for (const rule of MANUFACTURING_GATE_RULES) {
    if (rule.matches(ctx)) reasons.push(`${rule.id}: ${rule.reason}`);
  }
  return { eliminated: reasons.length > 0, reasons };
}
