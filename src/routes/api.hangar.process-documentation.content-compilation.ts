import { createFileRoute } from "@tanstack/react-router";
import {
  runContentCompilationStage,
  type DocumentationRequest,
} from "@/lib/the-hangar/documentationAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// The only stage of the (currently one-stage) Documentation Agent flow --
// the only stage that creates the Hangar_Documentations row. Internal-only
// hand-off, same reasoning as Certification Agent's own route -- request
// body is { validationId }, echoed by the client from whatever it already
// holds (one spec-ready validation result id, DocumentationAgent.md
// Section 1 -- single-source fan-in). userId comes from resolveUserId
// (Authorization: Bearer <token> -> Supabase claims), never from the
// request body.
export const Route = createFileRoute("/api/hangar/process-documentation/content-compilation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const body: Omit<DocumentationRequest, "userId"> = await request.json();
          const result = await runContentCompilationStage({ ...body, userId });
          return jsonResponse(result);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
