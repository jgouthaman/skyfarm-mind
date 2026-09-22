import { createFileRoute } from "@tanstack/react-router";
import { runHangarPythonScript } from "@/lib/the-hangar/pythonRunner";
import { assertConceptOwnership } from "@/lib/the-hangar/conceptAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Bay 03 prototype — "Trigger Sagush" button, step 1 of 2. Runs
// scripts/hangar-python/hello.py as a real local child process to prove the
// Node -> Python bridge works before step 2 (aircraftdesign.py) runs.
//
// LOCAL DEV ONLY — see pythonRunner.ts. There is no Python interpreter
// available once this is deployed to Vercel, so this route will fail there
// (cleanly — "no working Python interpreter found" — not by crashing) until
// it's replaced with a real Python Vercel Function or an external service.
export const Route = createFileRoute("/api/hangar/sagush-hello")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const body: { conceptId?: string } = await request.json();
          if (!body.conceptId) {
            return jsonResponse({ error: "Request must include `conceptId`" }, 400);
          }
          const concept = await assertConceptOwnership(body.conceptId, userId);
          const result = await runHangarPythonScript("hello.py", [concept.id, concept.concept_code]);
          if (result.status !== "ok") {
            return jsonResponse({ error: result.reason ?? "The Python script failed" }, 500);
          }
          return jsonResponse(result.data);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
