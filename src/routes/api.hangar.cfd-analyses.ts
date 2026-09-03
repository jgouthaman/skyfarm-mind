import { createFileRoute } from "@tanstack/react-router";
import { listCFDAnalysesForUser } from "@/lib/the-hangar/cfdAnalysisAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// "Your CFD analyses" list — mirrors api.hangar.cad-designs.ts. A GET:
// read-only, never advances an analysis's state.
export const Route = createFileRoute("/api/hangar/cfd-analyses")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const analyses = await listCFDAnalysesForUser(userId);
          return jsonResponse(analyses);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
