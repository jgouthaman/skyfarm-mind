import { createFileRoute } from "@tanstack/react-router";
import { checkLlmLiveStatus } from "@/lib/the-hangar/llmGateway";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Backs the green/amber "AI" indicator on Bay 01 (Mission Agent) — a real
// live check against Anthropic, falling back to Groq (see
// checkLlmLiveStatus), not just whether ANTHROPIC_API_KEY is set, so a
// bad/revoked key or an Anthropic outage correctly shows amber (unless Groq
// picks up the slack, in which case `provider` reports that instead).
// Auth-gated the same lookup-only, no-ownership-gate shape as
// resolve-mission — nothing user-specific in the response.
export const Route = createFileRoute("/api/hangar/llm-status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await resolveUserId(request);
          const { live, provider } = await checkLlmLiveStatus();
          return jsonResponse({ live, provider });
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
