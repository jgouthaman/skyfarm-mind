// Bay 12 (Certification Agent) rules -- mirrors manufacturingRules.ts's
// exact pattern (flat rule table + evaluate function, no DB). Runs BEFORE
// any LLM call, on Bay 09's already-known output shape -- never proceed to
// certification reasoning for a validation result that's already known to
// be invalid, unfinished, or hard-failed (CertificationAgent.md Section 1,
// Gate logic).
//
// Bay 12 fans in from ONE upstream source (Bay 09 only), same single-source
// shape Bay 10/11 themselves use -- Bay 12 is a SIBLING of Bay 10/11/13,
// not downstream of any of them, so this is an independent mirror of their
// own CERT-equivalent pattern, not a reuse of it.

export interface CertificationGateContext {
  validationVerdict: "PASS" | "FAIL" | "CONDITIONAL";
  validationStatus: string;
  validationReadinessScore: number | null;
}

export interface CertificationGateResult {
  eliminated: boolean;
  reasons: string[];
}

interface CertificationGateRule {
  id: string;
  trigger: string;
  matches: (ctx: CertificationGateContext) => boolean;
  reason: string;
}

const CERTIFICATION_GATE_RULES: CertificationGateRule[] = [
  {
    id: "CERT-001",
    trigger: "Referenced validation result is not spec-ready",
    matches: (ctx) => ctx.validationStatus !== "spec_ready",
    reason:
      "The referenced Bay 09 result is still draft, processing, or errored -- never build a certification checklist against a result that isn't finished being produced yet.",
  },
  {
    id: "CERT-002",
    trigger: "Referenced validation verdict is FAIL",
    matches: (ctx) => ctx.validationVerdict === "FAIL",
    reason:
      "The referenced Bay 09 result hard-failed validation -- never build a certification checklist for a design that has already failed outright. CONDITIONAL still proceeds, since certification review can inform whether the condition is closeable.",
  },
  {
    id: "CERT-003",
    trigger: "Validation readiness score is null or non-positive",
    matches: (ctx) => ctx.validationReadinessScore === null || ctx.validationReadinessScore <= 0,
    reason:
      "The upstream validation result has no valid readiness score -- there is nothing physically valid to certify against.",
  },
];

export function evaluateCertificationGate(
  ctx: CertificationGateContext,
): CertificationGateResult {
  const reasons: string[] = [];
  for (const rule of CERTIFICATION_GATE_RULES) {
    if (rule.matches(ctx)) reasons.push(`${rule.id}: ${rule.reason}`);
  }
  return { eliminated: reasons.length > 0, reasons };
}
