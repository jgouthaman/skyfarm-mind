import { createFileRoute } from "@tanstack/react-router";
import {
  runTradeOffOptimizationStage,
  type OptimizationRequest,
} from "@/lib/the-hangar/optimizationAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// The only stage of the (currently one-stage) Optimization Agent flow — the
// only stage that creates the Hangar_Optimizations row. Internal-only
// hand-off, same reasoning as Structural Agent's own route — request body
// is { cfdAnalysisId, structuralId }, echoed by the client from whatever it
// already holds (one spec-ready CFD analysis id + one spec-ready structural
// analysis id, OptimizationAgent.md Section 2). userId comes from
// resolveUserId (Authorization: Bearer <token> -> Supabase claims), never
// from the request body.
export const Route = createFileRoute("/api/hangar/process-optimization/trade-off-optimization")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const body: Omit<OptimizationRequest, "userId"> = await request.json();
          const result = await runTradeOffOptimizationStage({ ...body, userId });
          return jsonResponse(result);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
