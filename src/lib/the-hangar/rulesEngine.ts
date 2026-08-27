// Rules engine for Mission Agent Stage 2.1, Step 4 (MissionAgent.md Section
// 4.1.1) — pure deterministic TypeScript, no LLM, no network calls. Same
// "gate-then-score" philosophy as the rest of the platform (Section 4.2.1):
// hard rules first, nothing left to a model's judgment when a deterministic
// answer exists. See rulesEngine.manualtest.ts for runnable checks.

export interface RangeValidationResult {
  pass: boolean;
  reason: string;
}

// Section 4.2.1's KPI value ranges table — used both as sanity bounds on
// derived/copied KPI values in Stage 2.2, and here in Stage 2.1's validateRange.
export const KPI_BOUNDS: Record<string, { unit: string; min: number; max: number }> = {
  payload: { unit: "kg", min: 0.1, max: 150 },
  range: { unit: "km", min: 1, max: 500 },
  endurance: { unit: "min", min: 5, max: 480 },
  altitude_ceiling: { unit: "m", min: 10, max: 6000 },
  budget: { unit: "₹", min: 50000, max: 500000000 },
};

// Conversion factors into a per-dimension base unit (meters / kilograms /
// minutes), so normalizeUnits can convert between any two units sharing a
// dimension. Extend this table as new aerospace units come up.
const UNIT_TO_BASE: Record<string, { dimension: string; factor: number }> = {
  m: { dimension: "length", factor: 1 },
  km: { dimension: "length", factor: 1000 },
  mi: { dimension: "length", factor: 1609.344 },
  ft: { dimension: "length", factor: 0.3048 },
  kg: { dimension: "mass", factor: 1 },
  lb: { dimension: "mass", factor: 0.45359237 },
  g: { dimension: "mass", factor: 0.001 },
  min: { dimension: "time", factor: 1 },
  hr: { dimension: "time", factor: 60 },
  s: { dimension: "time", factor: 1 / 60 },
};

// Collapses common aerospace unit phrasings (km/mi, kg/lb, m/ft, min/hr, ...)
// into a single target unit — Section 5.1's Calculator tool, feeding
// validation and downstream KPI derivation.
export function normalizeUnits(value: number, fromUnit: string, toUnit: string): number {
  const from = UNIT_TO_BASE[fromUnit];
  const to = UNIT_TO_BASE[toUnit];
  if (!from || !to) {
    throw new Error(`normalizeUnits: unsupported unit "${!from ? fromUnit : toUnit}"`);
  }
  if (from.dimension !== to.dimension) {
    throw new Error(
      `normalizeUnits: incompatible unit types "${fromUnit}" (${from.dimension}) -> "${toUnit}" (${to.dimension})`,
    );
  }
  return (value * from.factor) / to.factor;
}

// Catches LLM hallucinations (e.g. a payload_hint of 500000kg) — Section
// 4.2.1's KPI bounds table is the canonical source of min/max per field.
export function validateRange(
  value: number,
  min: number,
  max: number,
  field: string,
): RangeValidationResult {
  if (Number.isNaN(value)) {
    return { pass: false, reason: `${field}: value is not a number` };
  }
  if (value < min) {
    return { pass: false, reason: `${field}: ${value} is below the minimum allowed (${min})` };
  }
  if (value > max) {
    return {
      pass: false,
      reason: `${field}: ${value} exceeds the maximum allowed (${max}) — possible hallucination`,
    };
  }
  return { pass: true, reason: `${field}: ${value} is within range [${min}, ${max}]` };
}

// Section 4.1.1 Step 4 — "surface what's absent that should probably be
// asked about". Generalized to any input object + caller-supplied required
// field list, rather than hardcoded to ParsedMissionInput.
export function flagMissingRequired(
  input: Record<string, unknown>,
  requiredFields: string[],
): string[] {
  return requiredFields.filter((field) => {
    const value = input[field];
    return value === undefined || value === null || value === "";
  });
}
