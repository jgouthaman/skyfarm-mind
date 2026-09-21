// Manual verification script for missionEvents.ts — pure, deterministic. The
// database insert itself (missionPersistence.ts's publishMissionEvent) needs a
// live Supabase, so what's pinned down here is everything around it: the event
// row Stage 4 builds, and how an insert error is classified (a repeated
// publish of the same spec version must read as "duplicate", not "failed").
// Run directly:
//
//   node src/lib/the-hangar/missionEvents.manualtest.ts
import { MISSION_SPEC_READY, buildSpecReadyEvent, classifyPublishError } from "./missionEvents.ts";

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

console.log("--- buildSpecReadyEvent ---");

check("the event type is the spec's dot-namespaced name", MISSION_SPEC_READY, "mission.spec_ready");

check(
  "the row is minimal: type + {mission_id, version} only",
  buildSpecReadyEvent("b7e4a1c2-9f3d-4e21-8a6b-5c9d2f1e8a4b", 3),
  {
    event_type: "mission.spec_ready",
    payload: { mission_id: "b7e4a1c2-9f3d-4e21-8a6b-5c9d2f1e8a4b", version: 3 },
  },
);

check(
  "the full spec is NOT embedded (a second copy could drift from Hangar_mission_specs)",
  Object.keys(buildSpecReadyEvent("m", 1).payload).sort(),
  ["mission_id", "version"],
);

check(
  "the version is a number, so the table's payload->>'version' dedupe index has a value",
  typeof buildSpecReadyEvent("m", 1).payload.version,
  "number",
);

check(
  "two versions of the same mission are different events",
  JSON.stringify(buildSpecReadyEvent("m", 1)) === JSON.stringify(buildSpecReadyEvent("m", 2)),
  false,
);

console.log("\n--- classifyPublishError ---");

check(
  "Postgres unique_violation (code 23505) -> duplicate, not a failure",
  classifyPublishError({ message: "anything", code: "23505" }),
  "duplicate",
);

check(
  "the same, recognised by message when a wrapper drops the code",
  classifyPublishError({
    message: 'duplicate key value violates unique constraint "Hangar_events_dedupe_idx"',
  }),
  "duplicate",
);

check(
  "a 'unique constraint' message alone also counts",
  classifyPublishError({ message: "violates UNIQUE CONSTRAINT foo" }),
  "duplicate",
);

check(
  "a missing table (migration not applied yet) is a real failure",
  classifyPublishError({ message: 'relation "public.Hangar_events" does not exist', code: "42P01" }),
  "failed",
);

check(
  "a foreign-key violation (unknown mission) is a real failure",
  classifyPublishError({ message: "violates foreign key constraint", code: "23503" }),
  "failed",
);

check(
  "a network error is a real failure",
  classifyPublishError({ message: "fetch failed" }),
  "failed",
);

check(
  "a check-constraint violation (payload without a version) is a real failure",
  classifyPublishError({ message: "violates check constraint", code: "23514" }),
  "failed",
);

console.log(`\n${passCount} passed, ${failCount} failed`);
if (failCount > 0) process.exit(1);
