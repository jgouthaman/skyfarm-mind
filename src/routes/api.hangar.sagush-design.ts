import { createFileRoute } from "@tanstack/react-router";
import { runSagushStep } from "@/lib/the-hangar/pythonRunner";
import { assertConceptOwnership } from "@/lib/the-hangar/conceptAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Bay 03 prototype — "Trigger Sagush" button, step 2 of 2, run only after the
// user confirms on the step-1 popup. Same local-vs-remote split as
// sagush-hello.ts — see pythonRunner.ts's runSagushStep.
export const Route = createFileRoute("/api/hangar/sagush-design")({
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
          const result = await runSagushStep("design", {
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
