// Bay 10 (Materials Agent) rules -- mirrors validationRules.ts's exact
// pattern (flat rule table + evaluate function, no DB). Runs BEFORE any LLM
// call, on Bay 09's already-known output shape -- never proceed to
// materials reasoning for a validation result that's already known to be
// invalid, unfinished, or hard-failed (MaterialsAgent.md Section 1, Gate
// logic).
//
// Bay 10 fans in from ONE upstream source (Bay 09 only), same single-source
// shape Bay 09 itself uses against Bay 08 -- so this mirrors Bay 09's own
// VAL-001/VAL-002 pattern, plus a verdict check (MAT-002) that has no
// direct Bay 09 analog, since Bay 09 is the first bay to produce a
// pass/fail/conditional verdict for a downstream bay to gate on.

export interface MaterialsGateContext {
  validationVerdict: "PASS" | "FAIL" | "CONDITIONAL";
  validationStatus: string;
  validationReadinessScore: number | null;
}

export interface MaterialsGateResult {
  eliminated: boolean;
  reasons: string[];
}

interface MaterialsGateRule {
  id: string;
  trigger: string;
  matches: (ctx: MaterialsGateContext) => boolean;
  reason: string;
}

const MATERIALS_GATE_RULES: MaterialsGateRule[] = [
  {
    id: "MAT-001",
    trigger: "Referenced validation result is not spec-ready",
    matches: (ctx) => ctx.validationStatus !== "spec_ready",
    reason:
      "The referenced Bay 09 result is still draft, processing, or errored -- never select materials for a result that isn't finished being produced yet.",
  },
  {
    id: "MAT-002",
    trigger: "Referenced validation verdict is FAIL",
    matches: (ctx) => ctx.validationVerdict === "FAIL",
    reason:
      "The referenced Bay 09 result hard-failed validation -- never select materials for a design that has already failed outright. CONDITIONAL still proceeds.",
  },
  {
    id: "MAT-003",
    trigger: "Validation readiness score is null or non-positive",
    matches: (ctx) => ctx.validationReadinessScore === null || ctx.validationReadinessScore <= 0,
    reason:
      "The upstream validation result has no valid readiness score -- there is nothing physically valid to select materials against.",
  },
];

export function evaluateMaterialsGate(ctx: MaterialsGateContext): MaterialsGateResult {
  const reasons: string[] = [];
  for (const rule of MATERIALS_GATE_RULES) {
    if (rule.matches(ctx)) reasons.push(`${rule.id}: ${rule.reason}`);
  }
  return { eliminated: reasons.length > 0, reasons };
}
