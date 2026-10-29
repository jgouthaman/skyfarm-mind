import { createFileRoute } from "@tanstack/react-router";
import { selectConcept } from "@/lib/the-hangar/conceptAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Save which of a Concept Ready run's ranked concepts carries forward to
// Vehicle Design (Bay 03): any concept with a fit score of 8 or above, or the
// rank-1 concept (which clears the choice back to the default).
//   POST { conceptId, conceptName } -> { conceptId, selectedConceptName }
export const Route = createFileRoute("/api/hangar/process-concept/select")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const body = await request.json();
          const result = await selectConcept({
            userId,
            conceptId: String(body.conceptId ?? ""),
            conceptName: String(body.conceptName ?? ""),
          });
          return jsonResponse(result);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
