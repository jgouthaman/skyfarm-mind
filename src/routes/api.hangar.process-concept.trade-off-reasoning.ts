import { createFileRoute } from "@tanstack/react-router";
import {
  runTradeOffReasoningStage,
  type Stage2Request,
} from "@/lib/the-hangar/conceptAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Stage 02 of the gated Concept Agent flow. Internal-only hand-off — body
// is Stage1Result's relevant fields, echoed back by the client.
export const Route = createFileRoute("/api/hangar/process-concept/trade-off-reasoning")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const body: Omit<Stage2Request, "userId"> = await request.json();
          const result = await runTradeOffReasoningStage({ ...body, userId });
          return jsonResponse(result);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
