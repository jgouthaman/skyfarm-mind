import { createFileRoute } from "@tanstack/react-router";
import { listCADDesignsForUser } from "@/lib/the-hangar/cadDesignAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// "Your CAD designs" list — mirrors api.hangar.aircraft-designs.ts. A GET:
// read-only, never advances a design's state.
export const Route = createFileRoute("/api/hangar/cad-designs")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const designs = await listCADDesignsForUser(userId);
          return jsonResponse(designs);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
