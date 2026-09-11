import { createFileRoute } from "@tanstack/react-router";
import {
  runBernoulliReviewStage,
  type BernoulliReviewRequest,
} from "@/lib/the-hangar/bernoulliAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Bernoulli Agent's only stage today -- Mission Agent (B01) spec review,
// per "Ask Bernoulli — Mission Spec Review Implementation Spec" §3.
// Request body is { missionId, checksRequested? } -- userId comes from
// resolveUserId (Authorization: Bearer <token> -> Supabase claims), never
// from the request body, same as every other bay's route.
export const Route = createFileRoute("/api/hangar/process-bernoulli/review")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const body: Omit<BernoulliReviewRequest, "userId"> = await request.json();
          const result = await runBernoulliReviewStage({ ...body, userId });
          return jsonResponse(result);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
