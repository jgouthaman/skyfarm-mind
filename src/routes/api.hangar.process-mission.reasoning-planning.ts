import { createFileRoute } from "@tanstack/react-router";
import { runReasoningPlanningStage, type Stage2Request } from "@/lib/the-hangar/missionAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Stage 02 of the gated Mission Agent flow (MissionAgent.md Section 4.1.1's
// Stage 2.2). Internal-only hand-off — the request body is Stage1Result's
// relevant fields, echoed back by the client exactly as Stage 1 returned
// them (plus missionId), un-mapped camelCase JSON. No public wire contract
// to preserve here, since only this UI ever calls it.
export const Route = createFileRoute("/api/hangar/process-mission/reasoning-planning")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const body: Omit<Stage2Request, "userId"> = await request.json();
          const result = await runReasoningPlanningStage({ ...body, userId });
          return jsonResponse(result);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
