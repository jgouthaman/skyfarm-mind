import { createFileRoute } from "@tanstack/react-router";
import { ramanHandler } from "@/lib/raman/ramanApi";
import { checkRamanAiStatus } from "@/lib/the-hangar/llmGateway";

// Raman (Bay 16) "AI" flag, same logic as Bay 01's /api/hangar/llm-status:
// the first reachable provider in the Mission Hub AI Providers order, with
// the model Raman uses on it. Mission Hub admins only.
//   GET -> { live, provider: "anthropic" | "groq" | null, model, configuredOrder }
export const Route = createFileRoute("/api/hangar/raman/ai-status")({
  server: {
    handlers: {
      GET: ({ request }) => ramanHandler(request, () => checkRamanAiStatus()),
    },
  },
});
