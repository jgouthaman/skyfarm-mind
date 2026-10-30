import { createFileRoute } from "@tanstack/react-router";
import { ramanHandler } from "@/lib/raman/ramanApi";
import { lockFixRun } from "@/lib/raman/RamanAgentPipeline";

// Raman (Bay 16) lock the final design. Mission Hub admins only.
//   POST { changes? } (defaults to the agent's recommendation) -> engine
//        evaluate_design once more -> locked_design/locked_result, a frozen
//        fix_prediction check, engagement after_dba, furthest_tab 5.
//   409 if the run is still going, a design is already locked, or it's infeasible.
export const Route = createFileRoute("/api/hangar/raman/fix-runs/$id/lock")({
  server: {
    handlers: {
      POST: ({ request, params }) => ramanHandler(request, ({ body }) => lockFixRun(params.id, body)),
    },
  },
});
