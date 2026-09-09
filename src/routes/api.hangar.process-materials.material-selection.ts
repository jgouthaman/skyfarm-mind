import { createFileRoute } from "@tanstack/react-router";
import {
  runMaterialSelectionStage,
  type MaterialsRequest,
} from "@/lib/the-hangar/materialsAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// The only stage of the (currently one-stage) Materials Agent flow -- the
// only stage that creates the Hangar_Materials row. Internal-only
// hand-off, same reasoning as Validation Agent's own route -- request body
// is { validationId }, echoed by the client from whatever it already
// holds (one spec-ready validation result id, MaterialsAgent.md Section 1
// -- single-source fan-in). userId comes from resolveUserId (Authorization:
// Bearer <token> -> Supabase claims), never from the request body.
export const Route = createFileRoute("/api/hangar/process-materials/material-selection")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const body: Omit<MaterialsRequest, "userId"> = await request.json();
          const result = await runMaterialSelectionStage({ ...body, userId });
          return jsonResponse(result);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
