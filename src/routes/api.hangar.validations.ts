import { createFileRoute } from "@tanstack/react-router";
import { listValidationsForUser } from "@/lib/the-hangar/validationAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// "Your validations" list -- mirrors api.hangar.optimizations.ts. A GET:
// read-only, never advances a validation's state.
export const Route = createFileRoute("/api/hangar/validations")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const validations = await listValidationsForUser(userId);
          return jsonResponse(validations);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
