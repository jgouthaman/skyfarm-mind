// Manual verification script for missionUsage.ts — pure, deterministic. Covers
// the usage rebuilt from Hangar_agent_runs rows, the list-price estimate, and
// the INR display. INR expectations are written against USD_TO_INR (not a
// hard-coded ₹96), so updating the rate doesn't break this test. Run directly:
//
//   node src/lib/the-hangar/missionUsage.manualtest.ts
import {
  USD_TO_INR,
  aggregateMissionUsage,
  describeInrCost,
  estimateCostUsd,
  formatCostInr,
  formatCostUsd,
  usdToInr,
  type UsageRunRow,
} from "./missionUsage.ts";

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

const row = (r: Partial<UsageRunRow> & { mission_id: string; stage: string }): UsageRunRow => ({
  status: "success",
  usage: null,
  request_count: null,
  mock: false,
  ...r,
});

console.log("--- estimateCostUsd (Sonnet 5 list price: $2 in / $10 out per 1M) ---");

check("1M in + 1M out = $12", estimateCostUsd(1_000_000, 1_000_000), 12);
check("input only", estimateCostUsd(500_000, 0), 1);
check("output only", estimateCostUsd(0, 500_000), 5);
check("zero tokens = $0", estimateCostUsd(0, 0), 0);
check("an unpriced model estimates $0 rather than guessing", estimateCostUsd(1000, 1000, "unknown"), 0);

console.log("\n--- aggregateMissionUsage ---");

const full = aggregateMissionUsage([
  row({ mission_id: "m1", stage: "input_processing", usage: { inputTokens: 1000, outputTokens: 200 } }),
  row({
    mission_id: "m1",
    stage: "reasoning_planning",
    usage: { inputTokens: 3000, outputTokens: 1500 },
    request_count: 2,
  }),
  row({ mission_id: "m1", stage: "output_generation", usage: { inputTokens: 800, outputTokens: 300 } }),
]).get("m1")!;

check("requests = 1 + 2 + 1", full.requests, 4);
check("input tokens are summed across stages", full.inputTokens, 4800);
check("output tokens are summed across stages", full.outputTokens, 2000);
check(
  "cost is computed from the summed tokens",
  Number(full.estimatedCostUsd.toFixed(6)),
  Number(estimateCostUsd(4800, 2000).toFixed(6)),
);
check("a fully-recorded mission is complete", full.complete, true);
check("only the three LLM stages appear", Object.keys(full.stages), [
  "input_processing",
  "reasoning_planning",
  "output_generation",
]);

check(
  "Stage 4 (no LLM) and failed runs are ignored",
  aggregateMissionUsage([
    row({ mission_id: "m", stage: "output_interface", usage: { inputTokens: 999, outputTokens: 999 } }),
    row({ mission_id: "m", stage: "input_processing", status: "error", mock: null }),
  ]).size,
  0,
);

const rerun = aggregateMissionUsage([
  row({ mission_id: "m2", stage: "reasoning_planning", usage: { inputTokens: 100, outputTokens: 50 }, request_count: 1, mock: true }),
  row({ mission_id: "m2", stage: "reasoning_planning", usage: { inputTokens: 200, outputTokens: 100 }, request_count: 2 }),
]).get("m2")!;
check(
  "a stage run twice is billed twice: both runs are summed, and mock is sticky",
  rerun.stages.reasoning_planning,
  { requests: 3, inputTokens: 300, outputTokens: 150, mock: true },
);

check(
  "a mocked stage counts 0 requests and 0 tokens, flagged mock",
  aggregateMissionUsage([row({ mission_id: "m3", stage: "input_processing", usage: null, mock: true })]).get("m3")!.stages
    .input_processing,
  { requests: 0, inputTokens: 0, outputTokens: 0, mock: true },
);

const legacy = aggregateMissionUsage([
  row({ mission_id: "m4", stage: "input_processing", usage: { inputTokens: 500, outputTokens: 100 } }),
  row({ mission_id: "m4", stage: "reasoning_planning", usage: null, request_count: null, mock: null }),
]).get("m4")!;
check("a stage logged before usage tracking existed marks the mission incomplete", legacy.complete, false);
check("...but the recorded stage is still counted", legacy.stages.input_processing?.requests, 1);

check(
  "rows are grouped per mission",
  [
    ...aggregateMissionUsage([
      row({ mission_id: "a", stage: "input_processing", usage: { inputTokens: 1, outputTokens: 1 } }),
      row({ mission_id: "b", stage: "input_processing", usage: { inputTokens: 2, outputTokens: 2 } }),
    ]).keys(),
  ],
  ["a", "b"],
);

console.log("\n--- USD display ---");

check("zero", formatCostUsd(0), "$0");
check("sub-cent keeps 4 decimals", formatCostUsd(0.00423), "$0.0042");
check("normal amounts use 2 decimals", formatCostUsd(1.5), "$1.50");

console.log("\n--- INR display (relative to USD_TO_INR) ---");

check("usdToInr multiplies by the rate", usdToInr(2), 2 * USD_TO_INR);
check("$1/rate is exactly ₹1.00", formatCostInr(1 / USD_TO_INR), "₹1.00");
check("zero", formatCostInr(0), "₹0");
check("under a paisa reads <₹0.01, never ₹0.00", formatCostInr(0.001 / USD_TO_INR), "<₹0.01");
check(
  "Indian digit grouping: ₹10,00,000.00 (not 1,000,000.00)",
  formatCostInr(1_000_000 / USD_TO_INR),
  "₹10,00,000.00",
);
check("two decimals for a typical mission", formatCostInr(2.5 / USD_TO_INR), "₹2.50");
check(
  "the tooltip states the exact USD figure and the rate used",
  describeInrCost(1),
  `≈ $1.00 at ₹${USD_TO_INR}/USD (list price, fixed rate — not a bill)`,
);

console.log(`\n${passCount} passed, ${failCount} failed`);
if (failCount > 0) process.exit(1);
