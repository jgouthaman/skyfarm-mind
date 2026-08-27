// Manual verification script for missionSourceParsing.ts — pure,
// deterministic, no LLM. Run directly:
//
//   node src/lib/the-hangar/missionSourceParsing.manualtest.ts
import { parseNaturalLanguageAndFormSources } from "./missionSourceParsing.ts";
import type { MissionSourceInput } from "./types/hangar-mission.ts";

let passCount = 0;
let failCount = 0;

function check(name: string, actual: unknown, expected: unknown): void {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
  console.log(`      expected: ${JSON.stringify(expected)}`);
  console.log(`      actual:   ${JSON.stringify(actual)}`);
  if (pass) passCount++;
  else failCount++;
}

const SOURCES: MissionSourceInput[] = [
  { sourceType: "natural_language", rawInput: { text: "Need a drone for crop monitoring." } },
  { sourceType: "document", rawInput: { extractedText: "Extracted brief text from a PDF." } },
  {
    sourceType: "requirements_form",
    rawInput: { payload_kg: 25, operating_environment: "Agricultural / rural" },
  },
  { sourceType: "regulations", rawInput: { regulation_codes: ["FAR_107"] } },
];

const result = parseNaturalLanguageAndFormSources(SOURCES);

check(
  "natural_language + document text combined with a blank line separator",
  result.rawTextCombined,
  "Need a drone for crop monitoring.\n\nExtracted brief text from a PDF.",
);

check("requirements_form raw_input passed through as structuredFields", result.structuredFields, {
  payload_kg: 25,
  operating_environment: "Agricultural / rural",
});

check(
  "sourceTypesUsed lists every distinct source type present, regulations included",
  result.sourceTypesUsed,
  ["natural_language", "document", "requirements_form", "regulations"],
);

check(
  "no natural_language/document/requirements_form sources -> empty text, empty fields",
  parseNaturalLanguageAndFormSources([
    { sourceType: "regulations", rawInput: { regulation_codes: ["FAR_107"] } },
  ]),
  { rawTextCombined: "", structuredFields: {}, sourceTypesUsed: ["regulations"] },
);

check(
  "later requirements_form source wins on key overlap (merge, last writer wins)",
  parseNaturalLanguageAndFormSources([
    { sourceType: "requirements_form", rawInput: { payload_kg: 25 } },
    { sourceType: "requirements_form", rawInput: { payload_kg: 30, budget_band: "Under ₹5L" } },
  ]).structuredFields,
  { payload_kg: 30, budget_band: "Under ₹5L" },
);

console.log(`\n${passCount} passed, ${failCount} failed`);
if (failCount > 0) process.exit(1);
