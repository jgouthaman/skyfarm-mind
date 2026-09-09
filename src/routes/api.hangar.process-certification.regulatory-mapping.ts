import { createFileRoute } from "@tanstack/react-router";
import {
  runRegulatoryMappingStage,
  type CertificationRequest,
} from "@/lib/the-hangar/certificationAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// The only stage of the (currently one-stage) Certification Agent flow --
// the only stage that creates the Hangar_Certifications row. Internal-only
// hand-off, same reasoning as Manufacturing Agent's own route -- request
// body is { validationId }, echoed by the client from whatever it already
// holds (one spec-ready validation result id, CertificationAgent.md
// Section 1 -- single-source fan-in). userId comes from resolveUserId
// (Authorization: Bearer <token> -> Supabase claims), never from the
// request body.
export const Route = createFileRoute("/api/hangar/process-certification/regulatory-mapping")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const body: Omit<CertificationRequest, "userId"> = await request.json();
          const result = await runRegulatoryMappingStage({ ...body, userId });
          return jsonResponse(result);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
