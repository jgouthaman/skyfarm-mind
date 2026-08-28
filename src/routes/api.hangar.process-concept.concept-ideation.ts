import { createFileRoute } from "@tanstack/react-router";
import { runConceptIdeationStage, type Stage1Request } from "@/lib/the-hangar/conceptAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Stage 01 of the gated Concept Agent flow — the only stage that creates
// the Hangar_concepts row. Internal-only hand-off (no public wire contract
// exists for Concept Agent the way MissionAgent.md Section 11 documents
// one for Mission Agent) — request body is the selected saved spec's
// fields, echoed by the client exactly as `/api/hangar/missions` returned
// them, plain camelCase.
export const Route = createFileRoute("/api/hangar/process-concept/concept-ideation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const body: Omit<Stage1Request, "userId"> = await request.json();
          const result = await runConceptIdeationStage({ ...body, userId });
          return jsonResponse(result);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
