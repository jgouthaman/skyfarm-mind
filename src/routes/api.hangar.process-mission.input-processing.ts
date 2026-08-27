import { createFileRoute } from "@tanstack/react-router";
import { runInputProcessingStage } from "@/lib/the-hangar/missionAgentPipeline";
import { toMissionSourceInputs, type Stage1PublicRequest } from "@/lib/the-hangar/types/mission-pipeline-api";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Stage 01 of the gated Mission Agent flow (MissionAgent.md Section 4.1.1)
// — the only stage that creates the Hangar_missions row, so it's the only
// one whose request doesn't carry a mission_id. Public/snake_case request
// (Section 11's documented schema); the response is the first internal
// hand-off and stays plain camelCase (Stage1Result), consumed only by this
// same UI's next call to reasoning-planning.
export const Route = createFileRoute("/api/hangar/process-mission/input-processing")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const body: Stage1PublicRequest = await request.json();
          if (!Array.isArray(body.sources) || body.sources.length === 0) {
            return jsonResponse({ error: "Request body must include a non-empty `sources` array" }, 400);
          }
          const result = await runInputProcessingStage({
            userId,
            sources: toMissionSourceInputs(body),
          });
          return jsonResponse(result);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
