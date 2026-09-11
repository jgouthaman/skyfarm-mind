import { createFileRoute } from "@tanstack/react-router";
import { getLatestBernoulliReview } from "@/lib/the-hangar/bernoulliAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// "Your saved Bernoulli report" -- this session's own addition, not part
// of the original implementation spec. A GET, unlike
// process-bernoulli/review's own POST: this one only reads, never runs a
// new review. Required `?missionId=` -- there's no "list every review"
// use case yet, only "the latest one for this mission," same scope as
// the rest of the B01 call point.
export const Route = createFileRoute("/api/hangar/bernoulli-review")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const missionId = new URL(request.url).searchParams.get("missionId");
          if (!missionId) {
            return jsonResponse({ error: "missionId query param is required" }, 400);
          }
          const result = await getLatestBernoulliReview(userId, missionId);
          return jsonResponse(result);
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
