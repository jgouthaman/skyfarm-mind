// Manual verification script for pythonRunner.ts. Unlike most other
// manualtest files, this one DOES touch a real external process — it spawns
// the actual scripts/hangar-python/*.py files with a real Python interpreter,
// since that's the entire thing being tested (there's nothing pure to check
// in isolation; the whole point is "does Node -> Python actually work here").
// It needs a Python interpreter on PATH to pass (`py`, `python3` or
// `python`) — if none is available this suite will legitimately fail, which
// is itself useful information about whether "Trigger Sagush" can work on
// this machine. Run directly:
//
//   node src/lib/the-hangar/pythonRunner.manualtest.ts
import { runHangarPythonScript } from "./pythonRunner.ts";

let passCount = 0;
let failCount = 0;

function check(name: string, actual: unknown, expected: unknown): void {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
  if (!pass) {
    console.log(`      expected: ${JSON.stringify(expected)}`);
    console.log(`      actual:   ${JSON.stringify(actual)}`);
  }
  pass ? passCount++ : failCount++;
}

console.log("--- hello.py (step 1) ---");
{
  const r = await runHangarPythonScript("hello.py", ["concept-123", "CN-ABC"]);
  check("runs successfully", r.status, "ok");
  const data = r.data as Record<string, unknown>;
  check("message confirms the bridge works", typeof data?.message === "string" && data.message.includes("Hello, World!"), true);
  check("the concept id is echoed back", data?.conceptId, "concept-123");
  check("the concept code is echoed back", data?.conceptCode, "CN-ABC");
}
{
  const r = await runHangarPythonScript("hello.py", []);
  check("runs fine with no args (both fields come back null)", r.status, "ok");
  const data = r.data as Record<string, unknown>;
  check("missing args become null, not crashes", [data?.conceptId, data?.conceptCode], [null, null]);
}

console.log("\n--- aircraftdesign.py (step 2) ---");
{
  const r = await runHangarPythonScript("aircraftdesign.py", ["concept-123", "CN-ABC"]);
  check("runs successfully", r.status, "ok");
  const data = r.data as { conceptId: string; conceptCode: string; designSpec: Record<string, unknown> };
  check("the concept id/code are echoed back", [data.conceptId, data.conceptCode], ["concept-123", "CN-ABC"]);
  check("the design is for Sagush", data.designSpec?.aircraftName, "Sagush");
  check("the spec has numeric fields (not just placeholder strings)", [
    typeof data.designSpec?.wingspanM,
    typeof data.designSpec?.grossWeightKg,
  ], ["number", "number"]);
  check("the spec is honestly labelled as a placeholder, not a real result", /not a real computed result/i.test(String(data.designSpec?.notes)), true);
}

console.log("\n--- error handling ---");
{
  const r = await runHangarPythonScript("does-not-exist.py", ["x"]);
  check("a missing script file fails cleanly, not with a thrown exception", r.status, "failed");
  check("a reason is given", typeof r.reason === "string" && r.reason.length > 0, true);
}

console.log(`\n${passCount} passed, ${failCount} failed`);
if (failCount > 0) process.exit(1);
