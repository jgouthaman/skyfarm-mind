import { createFileRoute } from "@tanstack/react-router";
import { listCertificationsForUser } from "@/lib/the-hangar/certificationAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// "Your certifications" list -- mirrors api.hangar.manufacturings.ts. A
// GET: read-only, never advances a certification result's state.
export const Route = createFileRoute("/api/hangar/certifications")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const certifications = await listCertificationsForUser(userId);
          return jsonResponse(certifications);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
