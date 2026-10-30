import { createFileRoute } from "@tanstack/react-router";
import { ramanHandler } from "@/lib/raman/ramanApi";
import { advanceRun } from "@/lib/raman/RamanAgentPipeline";

// Raman (Bay 16) run one Noise Fix iteration. Mission Hub admins only.
//   POST -> { run, step, done }. Decisions stay server-side; the client only
//   sets the pace. When done, run.ranked_options and run.recommended_design are set.
export const Route = createFileRoute("/api/hangar/raman/fix-runs/$id/step")({
  server: {
    handlers: {
      POST: ({ request, params }) => ramanHandler(request, () => advanceRun(params.id)),
    },
  },
});
