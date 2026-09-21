import { createFileRoute } from "@tanstack/react-router";
import { runOutputGenerationStage, type Stage3Request } from "@/lib/the-hangar/missionAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Stage 03 of the gated Mission Agent flow (MissionAgent.md Section 4.3.1).
// Internal-only hand-off. The body is just { missionId } — Stage 1's and
// Stage 2's results (including everything the confidence score is computed
// from) are read from the server's stored records, never from the client.
export const Route = createFileRoute("/api/hangar/process-mission/output-generation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const body: Omit<Stage3Request, "userId"> = await request.json();
          const result = await runOutputGenerationStage({ missionId: body.missionId, userId });
          return jsonResponse(result);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
