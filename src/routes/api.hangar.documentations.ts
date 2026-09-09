import { createFileRoute } from "@tanstack/react-router";
import { listDocumentationsForUser } from "@/lib/the-hangar/documentationAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// "Your documentations" list -- mirrors api.hangar.certifications.ts. A
// GET: read-only, never advances a documentation result's state.
export const Route = createFileRoute("/api/hangar/documentations")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const documentations = await listDocumentationsForUser(userId);
          return jsonResponse(documentations);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
