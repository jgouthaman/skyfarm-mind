// Manual verification script for missionSourceParsing.ts — pure,
// deterministic, no LLM. Run directly:
//
//   node src/lib/the-hangar/missionSourceParsing.manualtest.ts
import {
  finalizeSourceTypes,
  parseNaturalLanguageAndFormSources,
  readString,
  readStringList,
} from "./missionSourceParsing.ts";
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

console.log("\n--- a source only counts if it carries something ---");

const types = (sources: MissionSourceInput[]) => parseNaturalLanguageAndFormSources(sources).sourceTypesUsed;

check(
  "empty sources of every type count for nothing (they can't lift the confidence score)",
  types([
    { sourceType: "natural_language", rawInput: { text: "   " } },
    { sourceType: "document", rawInput: { extractedText: "" } },
    { sourceType: "requirements_form", rawInput: {} },
    { sourceType: "existing_project", rawInput: {} },
    { sourceType: "regulations", rawInput: { regulationCodes: [] } },
    { sourceType: "market_data", rawInput: { marketDataIds: [] } },
  ]),
  [],
);

check(
  "a requirements form whose fields are all blank counts for nothing",
  types([{ sourceType: "requirements_form", rawInput: { payload_kg: null, notes: "" } }]),
  [],
);

check(
  "a source with content counts",
  types([
    { sourceType: "natural_language", rawInput: { text: "a brief" } },
    { sourceType: "existing_project", rawInput: { importedMissionId: "m-1" } },
    { sourceType: "regulations", rawInput: { regulationCodes: ["FAR_107"] } },
    { sourceType: "market_data", rawInput: { marketDataIds: ["d-1"] } },
  ]),
  ["natural_language", "existing_project", "regulations", "market_data"],
);

check(
  "non-string entries in a code list are ignored, so a list of junk counts for nothing",
  types([{ sourceType: "regulations", rawInput: { regulationCodes: [1, null, {}, "  "] } }]),
  [],
);

check(
  "the same type twice is listed once",
  types([
    { sourceType: "natural_language", rawInput: { text: "one" } },
    { sourceType: "natural_language", rawInput: { text: "two" } },
  ]),
  ["natural_language"],
);

console.log("\n--- camelCase and snake_case keys are both read (Section 11 writes snake_case) ---");

check("regulationCodes", readStringList({ regulationCodes: ["A"] }, "regulationCodes", "regulation_codes"), ["A"]);
check("regulation_codes", readStringList({ regulation_codes: ["A"] }, "regulationCodes", "regulation_codes"), ["A"]);
check("camelCase wins when both are present", readStringList({ regulationCodes: ["A"], regulation_codes: ["B"] }, "regulationCodes", "regulation_codes"), ["A"]);
check("importedMissionId / imported_mission_id", [readString({ importedMissionId: "x" }, "importedMissionId", "imported_mission_id"), readString({ imported_mission_id: "y" }, "importedMissionId", "imported_mission_id")], ["x", "y"]);
check("a blank string is not a value", readString({ importedMissionId: "  " }, "importedMissionId"), null);
check("a missing key is null / []", [readString({}, "a"), readStringList({}, "a")], [null, []]);

console.log("\n--- finalizeSourceTypes: a reference only counts if it resolved ---");

const all = ["natural_language", "existing_project", "regulations", "market_data"] as const;
const none = { importedMissionResolved: false, regulationRowsFound: 0, marketRowsFound: 0 };

check(
  "nothing resolved: only the text-based types survive",
  finalizeSourceTypes([...all], none),
  ["natural_language"],
);
check(
  "everything resolved: all survive, in order",
  finalizeSourceTypes([...all], { importedMissionResolved: true, regulationRowsFound: 2, marketRowsFound: 1 }),
  ["natural_language", "existing_project", "regulations", "market_data"],
);
check(
  "an unknown regulation code (no catalog row) is dropped, the resolved import is kept",
  finalizeSourceTypes([...all], { importedMissionResolved: true, regulationRowsFound: 0, marketRowsFound: 0 }),
  ["natural_language", "existing_project"],
);
check(
  "the document and requirements-form types are never dropped by resolution",
  finalizeSourceTypes(["document", "requirements_form"], none),
  ["document", "requirements_form"],
);
check("empty in, empty out", finalizeSourceTypes([], none), []);

console.log(`\n${passCount} passed, ${failCount} failed`);
if (failCount > 0) process.exit(1);
