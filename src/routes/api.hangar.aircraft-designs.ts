import { createFileRoute } from "@tanstack/react-router";
import { listAircraftDesignsForUser } from "@/lib/the-hangar/aircraftDesignAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// "Your aircraft designs" list — mirrors api.hangar.concepts.ts. A GET:
// read-only, never advances a design's state.
export const Route = createFileRoute("/api/hangar/aircraft-designs")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const designs = await listAircraftDesignsForUser(userId);
          return jsonResponse(designs);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
