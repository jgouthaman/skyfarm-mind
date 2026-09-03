import { createFileRoute } from "@tanstack/react-router";
import {
  runStructuralAssessmentStage,
  type Stage1Request,
} from "@/lib/the-hangar/structuralAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// The only stage of the (currently one-stage) Structural Agent flow — the
// only stage that creates the Hangar_Structurals row. Internal-only
// hand-off, same reasoning as Simulation Orchestrator's own
// flight-dynamics-assessment route — request body is just { cadDesignId },
// echoed by the client from whatever it already holds (a spec-ready CAD
// design's id). userId comes from resolveUserId (Authorization: Bearer
// <token> -> Supabase claims), never from the request body.
export const Route = createFileRoute("/api/hangar/process-structural/structural-assessment")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const body: Omit<Stage1Request, "userId"> = await request.json();
          const result = await runStructuralAssessmentStage({ ...body, userId });
          return jsonResponse(result);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
