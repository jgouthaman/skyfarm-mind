import { createFileRoute } from "@tanstack/react-router";
import {
  runComplianceValidationStage,
  type ValidationRequest,
} from "@/lib/the-hangar/validationAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// The only stage of the (currently one-stage) Validation Agent flow -- the
// only stage that creates the Hangar_Validations row. Internal-only
// hand-off, same reasoning as Optimization Agent's own route -- request
// body is { optimizationId }, echoed by the client from whatever it
// already holds (one spec-ready optimization result id,
// ValidationAgent.md Section 1 -- single-source fan-in, not the pair Bay 08
// takes). userId comes from resolveUserId (Authorization: Bearer <token>
// -> Supabase claims), never from the request body.
export const Route = createFileRoute("/api/hangar/process-validation/compliance-validation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const body: Omit<ValidationRequest, "userId"> = await request.json();
          const result = await runComplianceValidationStage({ ...body, userId });
          return jsonResponse(result);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
