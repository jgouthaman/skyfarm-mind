import { createFileRoute } from "@tanstack/react-router";
import { listMissionsForUser } from "@/lib/the-hangar/missionAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";
import type { MissionStatus } from "@/lib/the-hangar/missionPersistence";

const VALID_STATUSES: MissionStatus[] = ["draft", "processing", "spec_ready", "finalized", "error"];

function parseStatusFilter(value: string | null): MissionStatus | undefined {
  return VALID_STATUSES.find((s) => s === value);
}

// "Your missions" list — this session's own addition, not part of
// MissionAgent.md. A GET, unlike the 4 stage routes and finalize (all
// POST): this one only reads, never advances a mission's state.
//
// Optional `?status=` filter — added for Concept Agent's "Your saved
// specs" panel (`?status=finalized`), reusing this list instead of a
// parallel finalized-only query.
export const Route = createFileRoute("/api/hangar/missions")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const statusFilter = parseStatusFilter(new URL(request.url).searchParams.get("status"));
          const missions = await listMissionsForUser(userId, statusFilter);
          return jsonResponse(missions);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
