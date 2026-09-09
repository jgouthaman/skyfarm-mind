import { createFileRoute } from "@tanstack/react-router";
import { listManufacturingsForUser } from "@/lib/the-hangar/manufacturingAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// "Your manufacturings" list -- mirrors api.hangar.materials.ts. A GET:
// read-only, never advances a manufacturing result's state.
export const Route = createFileRoute("/api/hangar/manufacturings")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const manufacturings = await listManufacturingsForUser(userId);
          return jsonResponse(manufacturings);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
