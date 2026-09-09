// Bay 08 (Optimization Agent) rules — mirrors cfdAnalysisRules.ts's/
// structuralRules.ts's exact pattern (flat rule table + evaluate function,
// no DB). Runs BEFORE any LLM call, on Bay 06's and Bay 07's already-known
// output shapes — never proceed to optimization reasoning for a CFD or
// structural result that's already known to be invalid, or for two results
// that don't even trace back to the same CAD design (OptimizationAgent.md
// Section 4).

export interface OptimizationGateContext {
  cfdCd: number;
  structuralSafetyFactor: number | null;
  cfdSourceCadDesignId: string;
  structuralSourceCadDesignId: string;
}

export interface OptimizationGateResult {
  eliminated: boolean;
  reasons: string[];
}

interface OptimizationGateRule {
  id: string;
  trigger: string;
  matches: (ctx: OptimizationGateContext) => boolean;
  reason: string;
}

const OPTIMIZATION_GATE_RULES: OptimizationGateRule[] = [
  {
    id: "OPT-001",
    trigger: "Structural safety factor is null or non-positive",
    matches: (ctx) => ctx.structuralSafetyFactor === null || ctx.structuralSafetyFactor <= 0,
    reason:
      "The upstream structural result has no valid safety factor — there is nothing physically valid to optimize against.",
  },
  {
    id: "OPT-002",
    trigger: "CFD drag coefficient is non-positive",
    matches: (ctx) => ctx.cfdCd <= 0,
    reason:
      "The upstream CFD result has a non-positive drag coefficient — there is no physically valid CFD result to optimize against.",
  },
  {
    id: "OPT-003",
    trigger: "CFD analysis and structural analysis reference different CAD designs",
    matches: (ctx) => ctx.cfdSourceCadDesignId !== ctx.structuralSourceCadDesignId,
    reason:
      "The selected CFD analysis and structural analysis trace back to different CAD designs — never jointly optimize results from two unrelated designs.",
  },
];

export function evaluateOptimizationGate(ctx: OptimizationGateContext): OptimizationGateResult {
  const reasons: string[] = [];
  for (const rule of OPTIMIZATION_GATE_RULES) {
    if (rule.matches(ctx)) reasons.push(`${rule.id}: ${rule.reason}`);
  }
  return { eliminated: reasons.length > 0, reasons };
}
