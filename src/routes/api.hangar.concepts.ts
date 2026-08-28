import { createFileRoute } from "@tanstack/react-router";
import { listConceptsForUser } from "@/lib/the-hangar/conceptAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// "Your concepts" list — mirrors api.hangar.missions.ts. A GET: read-only,
// never advances a concept's state.
export const Route = createFileRoute("/api/hangar/concepts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const concepts = await listConceptsForUser(userId);
          return jsonResponse(concepts);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
