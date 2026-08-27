import { createFileRoute } from "@tanstack/react-router";
import { finalizeMission, type FinalizeMissionRequest } from "@/lib/the-hangar/missionAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// "Save as final" (MissionAgent.md Section 13.2) — confirms the existing
// version-1 spec as-is, a status flip on Hangar_missions, not a new stage
// and not a new row. Internal-only hand-off, same pattern as the 4 stage
// routes — request body is just { missionId }, echoed by the client.
export const Route = createFileRoute("/api/hangar/process-mission/finalize")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const body: Omit<FinalizeMissionRequest, "userId"> = await request.json();
          const result = await finalizeMission({ ...body, userId });
          return jsonResponse(result);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
