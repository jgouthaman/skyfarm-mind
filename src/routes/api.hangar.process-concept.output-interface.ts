import { createFileRoute } from "@tanstack/react-router";
import {
  runConceptOutputInterfaceStage,
  type Stage4Request,
} from "@/lib/the-hangar/conceptAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Stage 04 of the gated Concept Agent flow — persists the ranked concept
// set and stubs export/event-publish, mirroring Mission Agent's Stage 4.
// Internal-only hand-off.
export const Route = createFileRoute("/api/hangar/process-concept/output-interface")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const body: Omit<Stage4Request, "userId"> = await request.json();
          const result = await runConceptOutputInterfaceStage({ ...body, userId });
          return jsonResponse(result);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
