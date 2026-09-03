import { createFileRoute } from "@tanstack/react-router";
import { listStructuralsForUser } from "@/lib/the-hangar/structuralAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// "Your structural analyses" list — mirrors api.hangar.simulations.ts. A
// GET: read-only, never advances a structural analysis's state.
export const Route = createFileRoute("/api/hangar/structurals")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const structurals = await listStructuralsForUser(userId);
          return jsonResponse(structurals);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
