import { createFileRoute } from "@tanstack/react-router";
import { listSimulationsForUser } from "@/lib/the-hangar/simDesignAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// "Your simulations" list — mirrors api.hangar.cad-designs.ts. A GET:
// read-only, never advances a simulation's state.
export const Route = createFileRoute("/api/hangar/simulations")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const simulations = await listSimulationsForUser(userId);
          return jsonResponse(simulations);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
