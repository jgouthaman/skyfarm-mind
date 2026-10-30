import { createFileRoute } from "@tanstack/react-router";
import { ramanHandler } from "@/lib/raman/ramanApi";
import { evaluateDesign } from "@/lib/raman/RamanAgentPipeline";

// Raman (Bay 16) slider what-if. Mission Hub admins only. No persistence.
//   POST { engagement_id, changes } -> engine evaluate_design on the baseline inputs
export const Route = createFileRoute("/api/hangar/raman/evaluate")({
  server: {
    handlers: {
      POST: ({ request }) => ramanHandler(request, ({ body }) => evaluateDesign(body)),
    },
  },
});
