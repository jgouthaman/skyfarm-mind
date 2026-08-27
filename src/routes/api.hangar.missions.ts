import { createFileRoute } from "@tanstack/react-router";
import { listMissionsForUser } from "@/lib/the-hangar/missionAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// "Your missions" list — this session's own addition, not part of
// MissionAgent.md. A GET, unlike the 4 stage routes and finalize (all
// POST): this one only reads, never advances a mission's state.
export const Route = createFileRoute("/api/hangar/missions")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const missions = await listMissionsForUser(userId);
          return jsonResponse(missions);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
