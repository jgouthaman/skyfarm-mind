// Bay 13 (Documentation Agent) rules -- mirrors certificationRules.ts's
// exact pattern (flat rule table + evaluate function, no DB). Runs BEFORE
// any LLM call, on Bay 09's already-known output shape.
//
// Bay 13 fans in from ONE upstream source (Bay 09 only), same single-source
// shape Bay 10/11/12 themselves use. Bay 13 is a SIBLING of Bay 10/11/12,
// not downstream of any of them.
//
// Unlike Bay 10/11/12, Bay 13 does NOT gate on verdict FAIL --
// DocumentationAgent.md's own DOC-002 rule is explicit: a failed design
// still needs a documented record of why it failed, so FAIL results are
// allowed through and the report reflects that outcome honestly. Only two
// rules here, not three.

export interface DocumentationGateContext {
  validationStatus: string;
  validationReadinessScore: number | null;
}

export interface DocumentationGateResult {
  eliminated: boolean;
  reasons: string[];
}

interface DocumentationGateRule {
  id: string;
  trigger: string;
  matches: (ctx: DocumentationGateContext) => boolean;
  reason: string;
}

const DOCUMENTATION_GATE_RULES: DocumentationGateRule[] = [
  {
    id: "DOC-001",
    trigger: "Referenced validation result is not spec-ready",
    matches: (ctx) => ctx.validationStatus !== "spec_ready",
    reason:
      "The referenced Bay 09 result is still draft, processing, or errored -- never compile a report against a result that isn't finished being produced yet.",
  },
  {
    id: "DOC-002",
    trigger: "Validation readiness score is null or non-positive",
    matches: (ctx) => ctx.validationReadinessScore === null || ctx.validationReadinessScore <= 0,
    reason:
      "The upstream validation result has no valid readiness score -- there is nothing physically valid to document yet. Note: unlike Bay 10/11/12, this gate does NOT check verdict -- a FAIL result still gets documented honestly.",
  },
];

export function evaluateDocumentationGate(
  ctx: DocumentationGateContext,
): DocumentationGateResult {
  const reasons: string[] = [];
  for (const rule of DOCUMENTATION_GATE_RULES) {
    if (rule.matches(ctx)) reasons.push(`${rule.id}: ${rule.reason}`);
  }
  return { eliminated: reasons.length > 0, reasons };
}
