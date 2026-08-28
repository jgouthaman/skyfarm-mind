import { createFileRoute } from "@tanstack/react-router";
import { runRankingScoringStage, type Stage3Request } from "@/lib/the-hangar/conceptAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Stage 03 of the gated Concept Agent flow — deterministic ranking, no LLM
// call, but still a distinct reviewable stage (its own Hangar_concept_runs
// row, its own findings card). Internal-only hand-off.
export const Route = createFileRoute("/api/hangar/process-concept/ranking-scoring")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const body: Omit<Stage3Request, "userId"> = await request.json();
          const result = await runRankingScoringStage({ ...body, userId });
          return jsonResponse(result);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
