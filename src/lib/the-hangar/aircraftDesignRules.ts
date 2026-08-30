import type { ConstraintFit } from "./tradeoffReasoning.ts";

// Bay 03 Stage 1's hard-constraint gate (AircraftDesignAgent.md Section
// 3.d / 4.1) — deterministic, no LLM, evaluated before any geometry is
// generated. Mirrors domainRules.ts's exact pattern (a flat rule table +
// one evaluate function). There is no Hangar_design_rules database table
// (confirmed: none exists live) — Bay 01's own domain rules aren't a DB
// table either; this follows that established convention rather than
// inventing a DB-backed rules engine this codebase doesn't otherwise use.
//
// No real airfoil database or OpenVSP/XFLR5 integration exists yet
// (AircraftDesignAgent.md Section 2) — these rules are intentionally
// minimal and honest about that. The primary, meaningful gate is
// constraintFit (Concept Agent's own Stage 2 output, per Section 3.d's
// explicit refuse/warn/refuse framing) — not a claim of real aerospace
// engineering rigor.

export interface AircraftDesignGateContext {
  vehicleClass: string;
  constraintFit: ConstraintFit;
}

export interface AircraftDesignGateResult {
  eliminated: boolean;
  reasons: string[];
}

export interface AircraftDesignRule {
  id: string;
  trigger: string;
  matches: (ctx: AircraftDesignGateContext) => boolean;
  reason: string;
}

export const AIRCRAFT_DESIGN_RULES: AircraftDesignRule[] = [
  {
    id: "ADR-001",
    trigger: "Concept's own trade-off reasoning already flagged it as failing a hard constraint",
    matches: (ctx) => ctx.constraintFit === "fail",
    reason:
      'Trade-off reasoning (Bay 02, Stage 2) rated this concept constraintFit: "fail" — a hard constraint was violated. Never proceed to geometry generation for a concept in this state.',
  },
  {
    id: "ADR-002",
    trigger: "vehicleClass is empty",
    matches: (ctx) => ctx.vehicleClass.trim().length === 0,
    reason:
      "No vehicle class was specified for this concept — there is nothing to generate geometry against.",
  },
];

export function evaluateAircraftDesignGate(
  ctx: AircraftDesignGateContext,
): AircraftDesignGateResult {
  const reasons: string[] = [];
  for (const rule of AIRCRAFT_DESIGN_RULES) {
    if (rule.matches(ctx)) reasons.push(`${rule.id}: ${rule.reason}`);
  }
  return { eliminated: reasons.length > 0, reasons };
}
