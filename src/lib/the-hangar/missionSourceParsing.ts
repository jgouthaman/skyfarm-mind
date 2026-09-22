import type { MissionSourceInput, SourceType } from "./types/hangar-mission";

// Stage 2.1, Step 0 (MissionAgent.md Section 4.1.1) — "Group by source
// type. All Hangar_mission_sources rows for the mission are grouped by
// source_type. Plain DB read, no processing yet." This is the sources
// 1/2/3 half of that grouping (Natural Language, Document, Requirements
// form) — sources 4/5/6 (Existing Projects, Regulations, Market Data) are
// directReferenceResolver.ts's job, not this file's. No LLM, deterministic.
//
// Judgment call: source_type "document"'s raw_input shape isn't given an
// example anywhere in the doc (only natural_language, requirements_form,
// and regulations have Section 11 examples). Section 6.1 says extracted
// document text feeds Hangar_mission_documents.extracted_text into
// raw_text_combined — `rawInput.extractedText` here mirrors that column
// name, camelCased to match this repo's rawInput field convention elsewhere.

export interface ParsedSourceInputs {
  rawTextCombined: string;
  structuredFields: Record<string, unknown>;
  sourceTypesUsed: SourceType[];
}

// Section 11's example writes these keys snake_case (`regulation_codes`);
// this repo's convention is camelCase (`regulationCodes`). Both are accepted
// so a caller following the spec isn't silently ignored.
export function readRawKey(rawInput: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (rawInput[key] !== undefined) return rawInput[key];
  }
  return undefined;
}

export function readStringList(rawInput: Record<string, unknown>, ...keys: string[]): string[] {
  const value = readRawKey(rawInput, ...keys);
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : [];
}

export function readString(rawInput: Record<string, unknown>, ...keys: string[]): string | null {
  const value = readRawKey(rawInput, ...keys);
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

// Does this source actually carry anything? A source counts toward
// source_types_used — and so toward the confidence score's source
// completeness (confidenceScore.ts) — only if it does. Without this, a caller
// could add empty sources of three different types and lift the score without
// providing any information.
function hasContent(s: MissionSourceInput): boolean {
  const raw = s.rawInput ?? {};
  switch (s.sourceType) {
    case "natural_language":
      return readString(raw, "text") !== null;
    case "document":
      return readString(raw, "extractedText", "extracted_text") !== null;
    case "requirements_form":
      return Object.values(raw).some((v) => v !== null && v !== undefined && v !== "");
    case "existing_project":
      return readString(raw, "importedMissionId", "imported_mission_id") !== null;
    case "regulations":
      return readStringList(raw, "regulationCodes", "regulation_codes").length > 0;
    case "market_data":
      return readStringList(raw, "marketDataIds", "market_data_ids").length > 0;
    default:
      return false;
  }
}

export function parseNaturalLanguageAndFormSources(
  sources: MissionSourceInput[],
): ParsedSourceInputs {
  const sourceTypesUsed = [
    ...new Set(sources.filter(hasContent).map((s) => s.sourceType)),
  ];

  const textParts: string[] = [];
  for (const s of sources) {
    if (s.sourceType === "natural_language" && typeof s.rawInput.text === "string") {
      textParts.push(s.rawInput.text);
    }
    if (s.sourceType === "document") {
      const text = readString(s.rawInput, "extractedText", "extracted_text");
      if (text !== null) textParts.push(text);
    }
  }

  // Section 3: "Sources are additive" — multiple requirements_form sources
  // aren't really meaningful (the intake UI has one Requirements panel),
  // but merge rather than pick-first just in case, later entries winning.
  const structuredFields = sources
    .filter((s) => s.sourceType === "requirements_form")
    .reduce<Record<string, unknown>>((merged, s) => ({ ...merged, ...s.rawInput }), {});

  return {
    rawTextCombined: textParts.join("\n\n"),
    structuredFields,
    sourceTypesUsed,
  };
}

// The source types that survive once the selections have been looked up.
// Sources 4-6 are references, and a reference only counts if it resolved: a
// regulation code the catalog doesn't know, or an imported mission that has
// no spec, contributed nothing to the run.
export function finalizeSourceTypes(
  structuralTypes: SourceType[],
  resolved: { importedMissionResolved: boolean; regulationRowsFound: number; marketRowsFound: number },
): SourceType[] {
  return structuralTypes.filter((t) => {
    if (t === "existing_project") return resolved.importedMissionResolved;
    if (t === "regulations") return resolved.regulationRowsFound > 0;
    if (t === "market_data") return resolved.marketRowsFound > 0;
    return true;
  });
}
