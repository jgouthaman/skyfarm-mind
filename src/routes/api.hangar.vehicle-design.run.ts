import { createFileRoute } from "@tanstack/react-router";
import { assertConceptOwnership } from "@/lib/the-hangar/conceptAgentPipeline";
import { runVehicleDesign } from "@/lib/the-hangar/designFileServer";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Bay 03 Generate Design, step 1: run VehicleDesign.py on the GCP server for
// the chosen concept (server to server; designFileServer.ts). Step 2 is the
// page reading the results through /api/hangar/vehicle-design-files.
//   POST { conceptId } -> { conceptCode, folder, created, files }
export const Route = createFileRoute("/api/hangar/vehicle-design/run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const body: { conceptId?: string } = await request.json();
          if (!body.conceptId) return jsonResponse({ error: "conceptId is required" }, 400);
          const concept = await assertConceptOwnership(body.conceptId, userId);
          if (concept.status !== "finalized") {
            return jsonResponse({ error: "Only a finalized concept can be sent to Vehicle Design." }, 400);
          }
          const result = await runVehicleDesign(concept.concept_code, concept.id);
          return jsonResponse(result);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
