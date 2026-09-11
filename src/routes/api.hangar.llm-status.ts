import { createFileRoute } from "@tanstack/react-router";
import { checkLlmLiveStatus } from "@/lib/the-hangar/llmGateway";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Backs the green/amber "AI" indicator on Bay 01 (Mission Agent) — a real
// live check against Anthropic (see checkLlmLiveStatus), not just whether
// ANTHROPIC_API_KEY is set, so a bad/revoked key or an Anthropic outage
// correctly shows amber too. Auth-gated the same lookup-only, no-ownership-
// gate shape as resolve-mission — nothing user-specific in the response.
export const Route = createFileRoute("/api/hangar/llm-status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await resolveUserId(request);
          const live = await checkLlmLiveStatus();
          return jsonResponse({ live });
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
