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
import { runHangarPythonScript, runSagushStep } from "./pythonRunner.ts";

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

console.log("\n--- runSagushStep: local mode (SAGUSH_SERVICE_URL unset) ---");
{
  delete process.env.SAGUSH_SERVICE_URL;
  delete process.env.SAGUSH_SERVICE_KEY;
  const r = await runSagushStep("hello", { conceptId: "c-1", conceptCode: "CN-1" });
  check("dispatches to the local script when no remote is configured", r.status, "ok");
  const data = r.data as Record<string, unknown>;
  check("no 'source' field — this came from the local script, not the remote service", data?.source, undefined);
}

// The deployed Vercel Python service (python-service/), created for exactly
// this feature and returning only non-sensitive placeholder data — safe to
// call for real from this test. If these fail, either the deployment or its
// SAGUSH_SERVICE_KEY has changed; re-check both before assuming the code is wrong.
console.log("\n--- runSagushStep: remote mode (real deployed python-service) ---");
{
  process.env.SAGUSH_SERVICE_URL = "https://sagush-python-service.vercel.app";
  process.env.SAGUSH_SERVICE_KEY = "2f4189ca96d33fd3e241d60b818334bb1c852bff335f23fd3f6277c9a64b0c33";

  const hello = await runSagushStep("hello", { conceptId: "c-9", conceptCode: "CN-9" });
  check("hello step reaches the real Vercel Python function", hello.status, "ok");
  const helloData = hello.data as Record<string, unknown>;
  check("response is genuinely from the remote service", helloData?.source, "vercel-python");
  check("the concept is echoed back correctly", [helloData?.conceptId, helloData?.conceptCode], ["c-9", "CN-9"]);

  const design = await runSagushStep("design", { conceptId: "c-9", conceptCode: "CN-9" });
  check("design step reaches the real Vercel Python function", design.status, "ok");
  const designData = design.data as { source: string; designSpec: { aircraftName: string } };
  check("response is genuinely from the remote service", designData.source, "vercel-python");
  check("the design is for Sagush", designData.designSpec?.aircraftName, "Sagush");

  process.env.SAGUSH_SERVICE_KEY = "the-wrong-key";
  const wrongKey = await runSagushStep("hello", { conceptId: "c-9", conceptCode: "CN-9" });
  check("a wrong shared secret is refused, not silently accepted", wrongKey.status, "failed");

  delete process.env.SAGUSH_SERVICE_URL;
  delete process.env.SAGUSH_SERVICE_KEY;
}

console.log(`\n${passCount} passed, ${failCount} failed`);
if (failCount > 0) process.exit(1);
