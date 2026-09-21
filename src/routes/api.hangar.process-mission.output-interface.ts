import { createFileRoute } from "@tanstack/react-router";
import { runOutputInterfaceStage, type Stage4Request } from "@/lib/the-hangar/missionAgentPipeline";
import { toFinalMissionResponse } from "@/lib/the-hangar/types/mission-pipeline-api";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Stage 04 of the gated Mission Agent flow (MissionAgent.md Section 4.4.1)
// — the terminal stage. The request is just { missionId }: the spec that gets
// persisted is Stage 3's stored output and the validation flags come from
// Stage 1's stored record, both read server-side (see Stage4Request) — the
// browser never supplies spec content or a confidence score. The response is
// the public boundary again (Section 11's documented schema).
export const Route = createFileRoute("/api/hangar/process-mission/output-interface")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const body: Omit<Stage4Request, "userId"> = await request.json();
          const result = await runOutputInterfaceStage({ missionId: body.missionId, userId });
          return jsonResponse(toFinalMissionResponse(result, result.validationFlags));
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
