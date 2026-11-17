import { createFileRoute } from "@tanstack/react-router";
import { checkLlmLiveStatus } from "@/lib/the-hangar/llmGateway";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Backs the green/amber "AI" badge on every Hangar bay: a live probe of each
// provider in the AI Providers order (see checkLlmLiveStatus), returning
// which one is answering plus a plain-language message and the reason any
// provider is unavailable (no key, rejected key, outage, timeout).
// Auth-gated; nothing user-specific in the response.
export const Route = createFileRoute("/api/hangar/llm-status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await resolveUserId(request);
          return jsonResponse(await checkLlmLiveStatus());
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
