import { createFileRoute } from "@tanstack/react-router";
import { listMaterialsForUser } from "@/lib/the-hangar/materialsAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// "Your materials" list -- mirrors api.hangar.validations.ts. A GET:
// read-only, never advances a materials result's state.
export const Route = createFileRoute("/api/hangar/materials")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const materials = await listMaterialsForUser(userId);
          return jsonResponse(materials);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
