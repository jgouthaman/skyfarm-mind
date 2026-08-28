import { createFileRoute } from "@tanstack/react-router";
import {
  finalizeConcept,
  type FinalizeConceptRequest,
} from "@/lib/the-hangar/conceptAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// "Save as final" for a concept — a status flip on Hangar_concepts, not a
// new stage and not a new row. Mirrors process-mission.finalize.ts.
export const Route = createFileRoute("/api/hangar/process-concept/finalize")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const body: Omit<FinalizeConceptRequest, "userId"> = await request.json();
          const result = await finalizeConcept({ ...body, userId });
          return jsonResponse(result);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
