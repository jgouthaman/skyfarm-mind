import { validateRange, flagMissingRequired, KPI_BOUNDS } from "./rulesEngine.ts";

// Stage 2.1, Step 4 (MissionAgent.md Section 4.1.1) — wires rulesEngine.ts's
// pure functions against the actual pipeline. Two separate checks, at two
// different points in the pipeline:
//
// hasUsableContent — Section 12.1's own design rule: "Validate before
// calling the LLM, not after ... so a bad submission fails fast without
// burning an API call." Checked against the parsed sources, before Stage
// 2.1's extraction call runs at all.
//
// computeValidationFlags — Section 4.1.1 Step 4 proper: runs AFTER
// extraction, against the merged entities (explicit structured fields
// always win over LLM hints — same merge rule as everywhere else in this
// pipeline). Output feeds the input_processing Hangar_agent_runs row and
// Stage 2.3's confidence_score. Deliberately never rejects the mission on
// its own — Section 4.3.1's formula treats validation_flag_count as a
// penalty (-0.05 each), not a gate; only hasUsableContent's "nothing here
// at all" case is a hard reject.

export function hasUsableContent(
  rawTextCombined: string,
  structuredFields: Record<string, unknown>,
): boolean {
  return rawTextCombined.trim().length > 0 || Object.keys(structuredFields).length > 0;
}

function parseLeadingNumber(text: string | null | undefined): number | null {
  if (!text) return null;
  const match = text.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

// Judgment call: structuredFields key names for range/endurance aren't
// given a Section 11 example the way payload_kg/endurance_min are
// (endurance_min is confirmed verbatim in the doc's example; payload_kg
// too). range_km follows the same unit-suffixed snake_case convention as
// those two confirmed names — not itself verified against the doc.
const CORE_FIELDS = [
  { boundsKey: "payload", structuredKey: "payload_kg", hintKey: "payloadHint" },
  { boundsKey: "range", structuredKey: "range_km", hintKey: "rangeHint" },
  { boundsKey: "endurance", structuredKey: "endurance_min", hintKey: "enduranceHint" },
] as const;

export interface ExtractedCoreFields {
  payloadHint: string | null;
  rangeHint: string | null;
  enduranceHint: string | null;
}

export function computeValidationFlags(
  extractedEntities: ExtractedCoreFields,
  structuredFields: Record<string, unknown>,
): string[] {
  const flags: string[] = [];
  const mergedValues: Record<string, number | null> = {};

  for (const { boundsKey, structuredKey, hintKey } of CORE_FIELDS) {
    const structuredValue = structuredFields[structuredKey];
    const value =
      typeof structuredValue === "number"
        ? structuredValue
        : parseLeadingNumber(extractedEntities[hintKey]);
    mergedValues[boundsKey] = value;

    if (value !== null) {
      const bounds = KPI_BOUNDS[boundsKey];
      const result = validateRange(value, bounds.min, bounds.max, boundsKey);
      if (!result.pass) flags.push(result.reason);
    }
  }

  const missing = flagMissingRequired(mergedValues, ["payload", "range", "endurance"]);
  flags.push(...missing.map((field) => `${field}: no value extracted or provided`));

  return flags;
}
