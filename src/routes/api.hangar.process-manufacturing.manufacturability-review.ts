import { createFileRoute } from "@tanstack/react-router";
import {
  runManufacturabilityReviewStage,
  type ManufacturingRequest,
} from "@/lib/the-hangar/manufacturingAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// The only stage of the (currently one-stage) Manufacturing Agent flow --
// the only stage that creates the Hangar_Manufacturings row. Internal-only
// hand-off, same reasoning as Materials Agent's own route -- request body
// is { validationId }, echoed by the client from whatever it already
// holds (one spec-ready validation result id, ManufacturingAgent.md
// Section 1 -- single-source fan-in). userId comes from resolveUserId
// (Authorization: Bearer <token> -> Supabase claims), never from the
// request body.
export const Route = createFileRoute(
  "/api/hangar/process-manufacturing/manufacturability-review",
)({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const body: Omit<ManufacturingRequest, "userId"> = await request.json();
          const result = await runManufacturabilityReviewStage({ ...body, userId });
          return jsonResponse(result);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
