import { createFileRoute } from "@tanstack/react-router";
import {
  runFlightDynamicsAssessmentStage,
  type Stage1Request,
} from "@/lib/the-hangar/simDesignAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Stage 01 of the (currently one-stage) Simulation Orchestrator Agent flow
// — the only stage that creates the Hangar_Simulations row. Internal-only
// hand-off, same reasoning as CAD Agent's own model-generation route —
// request body is just { cadDesignId }, echoed by the client from whatever
// it already holds (a spec-ready CAD design's id). userId comes from
// resolveUserId (Authorization: Bearer <token> -> Supabase claims), never
// from the request body — a client-supplied user_id would let one user
// trigger a simulation run under another user's identity.
export const Route = createFileRoute("/api/hangar/process-simulation/flight-dynamics-assessment")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const body: Omit<Stage1Request, "userId"> = await request.json();
          const result = await runFlightDynamicsAssessmentStage({ ...body, userId });
          return jsonResponse(result);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
