// Manual verification script for conceptUsage.ts — pure, deterministic.
// Mirrors missionUsage.manualtest.ts's aggregation checks, scoped to Concept
// Agent's two LLM stages. Run directly:
//
//   node src/lib/the-hangar/conceptUsage.manualtest.ts
import { aggregateConceptUsage, estimateCostUsd, formatCostInr, type ConceptUsageRunRow } from "./conceptUsage.ts";

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

const row = (r: Partial<ConceptUsageRunRow> & { concept_id: string; stage: string }): ConceptUsageRunRow => ({
  status: "success",
  usage: null,
  mock: false,
  ...r,
});

console.log("--- aggregateConceptUsage ---");

const full = aggregateConceptUsage([
  row({ concept_id: "c1", stage: "concept_ideation", usage: { inputTokens: 900, outputTokens: 400 } }),
  row({ concept_id: "c1", stage: "trade_off_reasoning", usage: { inputTokens: 1200, outputTokens: 600 } }),
]).get("c1")!;
check("requests = 1 + 1", full.requests, 2);
check("tokens summed across the two LLM stages", [full.inputTokens, full.outputTokens], [2100, 1000]);
check("cost computed from the summed tokens", Number(full.estimatedCostUsd.toFixed(6)), Number(estimateCostUsd(2100, 1000).toFixed(6)));
check("a fully-recorded concept is complete", full.complete, true);
check("only the two LLM stages appear", Object.keys(full.stages), ["concept_ideation", "trade_off_reasoning"]);

check(
  "Stage 3/4 (no LLM) and failed runs are ignored",
  aggregateConceptUsage([
    row({ concept_id: "c", stage: "ranking_scoring", usage: { inputTokens: 999, outputTokens: 999 } }),
    row({ concept_id: "c", stage: "output_interface", usage: { inputTokens: 999, outputTokens: 999 } }),
    row({ concept_id: "c", stage: "concept_ideation", status: "error", mock: null }),
  ]).size,
  0,
);

const rerun = aggregateConceptUsage([
  row({ concept_id: "c2", stage: "concept_ideation", usage: { inputTokens: 100, outputTokens: 50 }, mock: true }),
  row({ concept_id: "c2", stage: "concept_ideation", usage: { inputTokens: 200, outputTokens: 100 } }),
]).get("c2")!;
check(
  "a stage run twice (retry) is billed twice; mock is sticky",
  rerun.stages.concept_ideation,
  { requests: 2, inputTokens: 300, outputTokens: 150, mock: true },
);

check(
  "a mocked stage counts 0 requests/tokens, flagged mock",
  aggregateConceptUsage([row({ concept_id: "c3", stage: "concept_ideation", usage: null, mock: true })]).get("c3")!
    .stages.concept_ideation,
  { requests: 0, inputTokens: 0, outputTokens: 0, mock: true },
);

const legacy = aggregateConceptUsage([
  row({ concept_id: "c4", stage: "concept_ideation", usage: { inputTokens: 500, outputTokens: 100 } }),
  row({ concept_id: "c4", stage: "trade_off_reasoning", usage: null, mock: null }),
]).get("c4")!;
check("a stage logged before usage tracking existed marks the concept incomplete", legacy.complete, false);
check("...but the recorded stage is still counted", legacy.stages.concept_ideation?.requests, 1);

check(
  "rows are grouped per concept",
  [...aggregateConceptUsage([
    row({ concept_id: "a", stage: "concept_ideation", usage: { inputTokens: 1, outputTokens: 1 } }),
    row({ concept_id: "b", stage: "concept_ideation", usage: { inputTokens: 2, outputTokens: 2 } }),
  ]).keys()],
  ["a", "b"],
);

console.log("\n--- shared INR helpers re-exported correctly ---");
check("a typical concept's cost renders in rupees", formatCostInr(full.estimatedCostUsd).startsWith("₹"), true);

console.log(`\n${passCount} passed, ${failCount} failed`);
if (failCount > 0) process.exit(1);
