import { createFileRoute } from "@tanstack/react-router";
import { runReasoningPlanningStage, type Stage2Request } from "@/lib/the-hangar/missionAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Stage 02 of the gated Mission Agent flow (MissionAgent.md Section 4.1.1's
// Stage 2.2). Internal-only hand-off. The body is { missionId, gapOverrides? }:
// Stage 1's extraction and fields are read from the server's own stored
// record of that stage, not echoed by the client (which could forge them).
// gapOverrides is the gap-fill wizard's answers, whitelisted server-side.
export const Route = createFileRoute("/api/hangar/process-mission/reasoning-planning")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const body: Omit<Stage2Request, "userId"> = await request.json();
          const result = await runReasoningPlanningStage({
            missionId: body.missionId,
            gapOverrides: body.gapOverrides,
            userId,
          });
          return jsonResponse(result);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
