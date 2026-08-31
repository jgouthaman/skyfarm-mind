import { createFileRoute } from "@tanstack/react-router";
import {
  runModelGenerationStage,
  type Stage1Request,
} from "@/lib/the-hangar/cadDesignAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Stage 01 of the (currently one-stage) CAD Agent flow — the only stage
// that creates the Hangar_CADDesigns row. Internal-only hand-off, same
// reasoning as Aircraft Design Agent's own geometry-generation route —
// request body is just { aircraftDesignId }, echoed by the client from
// whatever it already holds (a spec-ready aircraft design's id).
export const Route = createFileRoute("/api/hangar/process-cad-design/model-generation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const body: Omit<Stage1Request, "userId"> = await request.json();
          const result = await runModelGenerationStage({ ...body, userId });
          return jsonResponse(result);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
