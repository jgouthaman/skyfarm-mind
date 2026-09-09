// Bay 09 (Validation Agent) rules — mirrors optimizationRules.ts's exact
// pattern (flat rule table + evaluate function, no DB). Runs BEFORE any LLM
// call, on Bay 08's already-known output shape — never proceed to
// validation reasoning for an optimization result that's already known to
// be invalid, unfinished, or resting on an unsound structural result
// (ValidationAgent.md Section 9.1-9.2).
//
// Bay 09 fans in from ONE upstream source (Bay 08 only), unlike Bay 08's
// two-source fan-in — so there is no cross-source lineage check here.
// OPT-003 (do two sources trace back to the same CAD design?) has no
// single-source analog; it's replaced by VAL-002 (is the referenced
// optimization result actually finalized, not still draft/error?), which is
// the natural single-source equivalent: never validate a result that isn't
// done being produced yet.

export interface ValidationGateContext {
  optimizationScore: number | null;
  optimizationStatus: string;
  structuralSafetyFactor: number | null;
}

export interface ValidationGateResult {
  eliminated: boolean;
  reasons: string[];
}

interface ValidationGateRule {
  id: string;
  trigger: string;
  matches: (ctx: ValidationGateContext) => boolean;
  reason: string;
}

const VALIDATION_GATE_RULES: ValidationGateRule[] = [
  {
    id: "VAL-001",
    trigger: "Optimization overall score is null or non-positive",
    matches: (ctx) => ctx.optimizationScore === null || ctx.optimizationScore <= 0,
    reason:
      "The upstream optimization result has no valid overall score — there is nothing physically valid to validate against.",
  },
  {
    id: "VAL-002",
    trigger: "Referenced optimization result is not finalized",
    matches: (ctx) => ctx.optimizationStatus !== "finalized",
    reason:
      "The referenced Bay 08 result is still draft, processing, or errored — never validate a result that isn't finished being produced yet.",
  },
  {
    id: "VAL-003",
    trigger: "Structural safety factor carried through from Bay 07 is null or non-positive",
    matches: (ctx) => ctx.structuralSafetyFactor === null || ctx.structuralSafetyFactor <= 0,
    reason:
      "The structural safety factor carried through the chain from Bay 07 is invalid — the whole upstream chain must be sound before compliance checking runs.",
  },
];

export function evaluateValidationGate(ctx: ValidationGateContext): ValidationGateResult {
  const reasons: string[] = [];
  for (const rule of VALIDATION_GATE_RULES) {
    if (rule.matches(ctx)) reasons.push(`${rule.id}: ${rule.reason}`);
  }
  return { eliminated: reasons.length > 0, reasons };
}
