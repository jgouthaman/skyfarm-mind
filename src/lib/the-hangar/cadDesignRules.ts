// Bay 04 (CAD Agent) rules — mirrors aircraftDesignRules.ts's exact pattern
// (a flat rule table + evaluate function, no DB-backed rules engine). Two
// separate evaluators, matching CADAgent.md Section 4.2's framing:
//
// - evaluateCADDesignGate runs BEFORE any LLM call, on the upstream
//   geometry/components from Bay 03 — never proceed to model generation for
//   a design that's already known to be nothing (no dimensions, no
//   components).
// - evaluateCADDesignValidation runs AFTER the LLM call, on its own output
//   (BOM, mass properties). This is CADAgent.md's "Interference Checking /
//   Manufacturability Review / Tolerance Stack-up" — explicitly a rules
//   engine, not real geometry collision detection (no real CAD engine
//   exists here, same honesty Bay 03 applies to its own missing
//   OpenVSP/XFLR5 integration). interferenceClear is a simple derived flag
//   (true unless a DFM/tolerance rule fired), not a claim of real clash
//   detection.

export interface CADDesignGateContext {
  wingspan_m: number;
  fuselageLength_m: number;
  wingArea_m2: number;
  aspectRatio: number;
  vehicleClass: string;
  componentSelectionCount: number;
}

export interface CADDesignGateResult {
  eliminated: boolean;
  reasons: string[];
}

interface CADDesignGateRule {
  id: string;
  trigger: string;
  matches: (ctx: CADDesignGateContext) => boolean;
  reason: string;
}

const CAD_DESIGN_GATE_RULES: CADDesignGateRule[] = [
  {
    id: "CDR-001",
    trigger: "one or more geometry dimensions is non-positive",
    matches: (ctx) =>
      ctx.wingspan_m <= 0 ||
      ctx.fuselageLength_m <= 0 ||
      ctx.wingArea_m2 <= 0 ||
      ctx.aspectRatio <= 0,
    reason:
      "The upstream geometry has a non-positive dimension — there is nothing physically valid to build CAD around.",
  },
  {
    id: "CDR-002",
    trigger: "vehicleClass is empty",
    matches: (ctx) => ctx.vehicleClass.trim().length === 0,
    reason: "No vehicle class was carried over from the aircraft design — nothing to model.",
  },
  {
    id: "CDR-003",
    trigger: "no component selections were provided",
    matches: (ctx) => ctx.componentSelectionCount === 0,
    reason:
      "The upstream aircraft design has zero component selections — there is nothing to assemble or place in a BOM.",
  },
];

export function evaluateCADDesignGate(ctx: CADDesignGateContext): CADDesignGateResult {
  const reasons: string[] = [];
  for (const rule of CAD_DESIGN_GATE_RULES) {
    if (rule.matches(ctx)) reasons.push(`${rule.id}: ${rule.reason}`);
  }
  return { eliminated: reasons.length > 0, reasons };
}

export interface CADDesignValidationInput {
  bom: { part: string; qty: number; material: string }[];
  massProperties: { weightKg: number; cg: { x: number; y: number; z: number } };
  fuselageLength_m: number;
}

export interface CADDesignValidationResult {
  interferenceClear: boolean;
  dfmFlags: string[];
}

export function evaluateCADDesignValidation(
  input: CADDesignValidationInput,
): CADDesignValidationResult {
  const dfmFlags: string[] = [];

  input.bom.forEach((entry, i) => {
    if (entry.qty <= 0) {
      dfmFlags.push(
        `BOM entry ${i} ("${entry.part}") has qty <= 0 — not a manufacturable quantity.`,
      );
    }
    if (!entry.material || entry.material.trim().length === 0) {
      dfmFlags.push(`BOM entry ${i} ("${entry.part}") has no material specified.`);
    }
  });

  const bound = input.fuselageLength_m;
  const { x, y, z } = input.massProperties.cg;
  if (Math.abs(x) > bound || Math.abs(y) > bound || Math.abs(z) > bound) {
    dfmFlags.push(
      `Center of gravity (${x}, ${y}, ${z}) falls outside the fuselage length envelope (±${bound}m) — tolerance stack-up check failed.`,
    );
  }

  return { interferenceClear: dfmFlags.length === 0, dfmFlags };
}
