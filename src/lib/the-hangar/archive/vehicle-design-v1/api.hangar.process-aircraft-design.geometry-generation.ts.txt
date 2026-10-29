import { createFileRoute } from "@tanstack/react-router";
import {
  runGeometryGenerationStage,
  type Stage1Request,
} from "@/lib/the-hangar/aircraftDesignAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Stage 01 of the (currently one-stage) Aircraft Design Agent flow — the
// only stage that creates the Hangar_aircraft_designs row. Internal-only
// hand-off, same reasoning as Concept Agent's own concept-ideation route
// (no public wire contract exists for Bay 03 the way MissionAgent.md
// Section 11 documents one for Bay 01) — request body is just
// { conceptId }, echoed by the client from whatever it already holds (a
// finalized concept's id).
export const Route = createFileRoute("/api/hangar/process-aircraft-design/geometry-generation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const body: Omit<Stage1Request, "userId"> = await request.json();
          const result = await runGeometryGenerationStage({ ...body, userId });
          return jsonResponse(result);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
