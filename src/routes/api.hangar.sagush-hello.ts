import { createFileRoute } from "@tanstack/react-router";
import { runSagushStep } from "@/lib/the-hangar/pythonRunner";
import { assertConceptOwnership } from "@/lib/the-hangar/conceptAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Bay 03 prototype — "Trigger Sagush" button, step 1 of 2. Proves the
// Node -> Python bridge works before step 2 (aircraftdesign.py) runs.
//
// Runs locally (a real local Python child process) when SAGUSH_SERVICE_URL
// isn't set — dev only. In Production/Preview it calls the separate
// python-service Vercel project instead (see pythonRunner.ts's
// runSagushStep and python-service/README.md for why that's a second
// project, not a file in this one).
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
          const result = await runSagushStep("hello", {
            conceptId: concept.id,
            conceptCode: concept.concept_code,
          });
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
