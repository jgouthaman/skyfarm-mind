import { createFileRoute } from "@tanstack/react-router";
import { listOptimizationsForUser } from "@/lib/the-hangar/optimizationAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// "Your optimizations" list — mirrors api.hangar.structurals.ts. A GET:
// read-only, never advances an optimization's state.
export const Route = createFileRoute("/api/hangar/optimizations")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const optimizations = await listOptimizationsForUser(userId);
          return jsonResponse(optimizations);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
