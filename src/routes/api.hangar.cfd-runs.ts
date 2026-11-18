import { createFileRoute } from "@tanstack/react-router";
import { startCFDRun, listCFDRuns, cfdRunErrorResponse } from "@/lib/the-hangar/cfdRunPipeline";
import { cfdRunUserClient } from "@/lib/the-hangar/cfdRunPersistence";
import { resolveUserId, jsonResponse } from "@/lib/the-hangar/apiAuth";

// Bay 06 (CFD Agent) solver runs (Hangar_CFD_runs).
//   POST { cfdId }  gate checks -> case setup -> new run -> dispatch to GCP.
//                   200 { runId, status, gateResults, caseSetup, dispatched, dispatch };
//                   404/409/422 { error, failedRuleIds, gateResults } when a gate fails.
//   GET ?cfdId=     the caller's runs for that CFD analysis, newest first.

export const Route = createFileRoute("/api/hangar/cfd-runs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const body = (await request.json().catch(() => ({}))) as { cfdId?: string };
          const result = await startCFDRun(cfdRunUserClient(request), userId, body.cfdId);
          return jsonResponse(result);
        } catch (err) {
          return cfdRunErrorResponse(err);
        }
      },
      GET: async ({ request }) => {
        try {
          await resolveUserId(request);
          const cfdId = new URL(request.url).searchParams.get("cfdId");
          return jsonResponse(await listCFDRuns(cfdRunUserClient(request), cfdId));
        } catch (err) {
          return cfdRunErrorResponse(err);
        }
      },
    },
  },
});
