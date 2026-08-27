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

export function parseNaturalLanguageAndFormSources(
  sources: MissionSourceInput[],
): ParsedSourceInputs {
  const sourceTypesUsed = [...new Set(sources.map((s) => s.sourceType))];

  const textParts: string[] = [];
  for (const s of sources) {
    if (s.sourceType === "natural_language" && typeof s.rawInput.text === "string") {
      textParts.push(s.rawInput.text);
    }
    if (s.sourceType === "document" && typeof s.rawInput.extractedText === "string") {
      textParts.push(s.rawInput.extractedText);
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
