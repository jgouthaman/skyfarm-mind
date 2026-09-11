import { createFileRoute } from "@tanstack/react-router";
import { resolveMissionIdForSource } from "@/lib/the-hangar/bernoulliSourceResolver";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// "Which mission does this bay's entity ultimately descend from?" -- lets
// any caller bay's own "Ask Bernoulli" link carry just its own entity id
// (?source=cad&sourceId=<cadDesignId>, say) instead of every page having
// to walk its own upstream chain client-side to find a missionId. Auth is
// still required (any signed-in user can resolve any id -- this endpoint
// leaks no data beyond a missionId, and the real ownership check happens
// when a review is actually run), same requireAuth-but-no-ownership-gate
// shape as a lookup endpoint, not a mutation.
export const Route = createFileRoute("/api/hangar/resolve-mission")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await resolveUserId(request);
          const url = new URL(request.url);
          const source = url.searchParams.get("source");
          const sourceId = url.searchParams.get("sourceId");
          if (!source || !sourceId) {
            return jsonResponse({ error: "source and sourceId query params are required" }, 400);
          }
          const missionId = await resolveMissionIdForSource(source, sourceId);
          return jsonResponse({ missionId });
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
