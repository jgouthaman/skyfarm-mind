import { createFileRoute } from "@tanstack/react-router";
import {
  runOutputGenerationStage,
  type CFDAnalysisRequest,
} from "@/lib/the-hangar/cfdAnalysisAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// The only stage of the (Phase 1) CFD Agent flow — the one stage that
// creates the Hangar_CFDAnalyses row. Internal-only hand-off, same
// reasoning as CAD Agent's own model-generation route — request body is
// { cadDesignId, solverType?, turbulenceModel?, boundaryConditions? },
// echoed by the client from whatever it already holds (a spec-ready CAD
// design's id plus optional user-entered CFD settings, CFDAgent.md
// Section 2).
export const Route = createFileRoute("/api/hangar/process-cfd-analysis/output-generation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const body: Omit<CFDAnalysisRequest, "userId"> = await request.json();
          const result = await runOutputGenerationStage({ ...body, userId });
          return jsonResponse(result);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
