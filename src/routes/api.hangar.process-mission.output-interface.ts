import { createFileRoute } from "@tanstack/react-router";
import { runOutputInterfaceStage, type Stage4Request } from "@/lib/the-hangar/missionAgentPipeline";
import { toFinalMissionResponse } from "@/lib/the-hangar/types/mission-pipeline-api";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Stage 04 of the gated Mission Agent flow (MissionAgent.md Section 4.4.1)
// — the terminal stage. Request is Stage3Output's fields echoed back verbatim
// plus missionId (internal hand-off, camelCase); the response is the public
// boundary again (Section 11's documented schema), matching what the old
// single-shot endpoint returned. validation_flags comes from the client's
// own request body since Stage 4 never touches them server-side (see
// mission-pipeline-api.ts's toFinalMissionResponse).
interface OutputInterfaceRequestBody extends Omit<Stage4Request, "userId"> {
  validation_flags: string[];
}

export const Route = createFileRoute("/api/hangar/process-mission/output-interface")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const { validation_flags, ...stage4Body }: OutputInterfaceRequestBody = await request.json();
          const result = await runOutputInterfaceStage({ ...stage4Body, userId });
          return jsonResponse(toFinalMissionResponse(result, validation_flags));
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
