import { createFileRoute } from "@tanstack/react-router";
import { getBernoulliReviewProgress } from "@/lib/the-hangar/bernoulliPersistence";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Progress of a review that's still running, for the Bernoulli page's
// "check 7 of 14" line. The page generates clientRunId, sends it with the
// review POST, and polls this until the POST returns.
//   GET ?clientRunId=  -> { status, progress: { done, total, current } | null } | null
export const Route = createFileRoute("/api/hangar/bernoulli-review-progress")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const clientRunId = new URL(request.url).searchParams.get("clientRunId");
          if (!clientRunId || !/^[0-9a-f-]{36}$/i.test(clientRunId)) {
            return jsonResponse({ error: "clientRunId must be a UUID" }, 400);
          }
          return jsonResponse(await getBernoulliReviewProgress(userId, clientRunId));
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
