import { createFileRoute } from "@tanstack/react-router";
import { getLatestBernoulliReview } from "@/lib/the-hangar/bernoulliAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// "Your saved Bernoulli report" -- this session's own addition, not part
// of the original implementation spec. A GET, unlike
// process-bernoulli/review's own POST: this one only reads, never runs a
// new review. Required `?missionId=`; optional `?conceptId=` returns the
// latest review of that concept's output (Bay 02) instead of the mission's.
export const Route = createFileRoute("/api/hangar/bernoulli-review")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const params = new URL(request.url).searchParams;
          const missionId = params.get("missionId");
          if (!missionId) {
            return jsonResponse({ error: "missionId query param is required" }, 400);
          }
          const result = await getLatestBernoulliReview(userId, missionId, params.get("conceptId") || null);
          return jsonResponse(result);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
