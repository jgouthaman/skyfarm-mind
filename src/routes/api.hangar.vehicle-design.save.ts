import { createFileRoute } from "@tanstack/react-router";
import { saveVehicleDesign } from "@/lib/the-hangar/aircraftDesignAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Bay 03 Save: store the concept's current Vehicle Design output (read from
// the GCP server, not from the browser) as a design linked Mission -> Concept
// -> Design, ready for Bay 04 (CAD).
//   POST { conceptId } -> { aircraftDesignId, designCode, missionId, missionCode,
//                           conceptId, conceptCode, sourceDesignId, alreadySaved }
export const Route = createFileRoute("/api/hangar/vehicle-design/save")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const body: { conceptId?: string } = await request.json();
          const result = await saveVehicleDesign({ userId, conceptId: String(body.conceptId ?? "") });
          return jsonResponse(result);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
