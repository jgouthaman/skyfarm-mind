import { createFileRoute } from "@tanstack/react-router";
import { getCFDRun, cfdRunErrorResponse } from "@/lib/the-hangar/cfdRunPipeline";
import { cfdRunUserClient } from "@/lib/the-hangar/cfdRunPersistence";
import { resolveUserId, jsonResponse } from "@/lib/the-hangar/apiAuth";

// Bay 06 (CFD Agent) one solver run -- status, progress, residuals,
// results. 404 when it doesn't exist or isn't the caller's (RLS hides it).
export const Route = createFileRoute("/api/hangar/cfd-runs/$runId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          await resolveUserId(request);
          const run = await getCFDRun(cfdRunUserClient(request), params.runId);
          if (!run) return jsonResponse({ error: "CFD run not found." }, 404);
          return jsonResponse(run);
        } catch (err) {
          return cfdRunErrorResponse(err);
        }
      },
    },
  },
});
