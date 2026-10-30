import { createFileRoute } from "@tanstack/react-router";
import { ramanHandler } from "@/lib/raman/ramanApi";
import { startFixRun } from "@/lib/raman/RamanAgentPipeline";

// Raman (Bay 16) start a Noise Fix run. Mission Hub admins only.
//   POST { engagement_id, goal?: { target_dba?, max_added_mass_g?, min_flight_time_change_pct?, max_iterations? } }
//        -> the run row (status running). The client then calls
//        POST fix-runs/:id/step until the run is done -- one iteration each.
export const Route = createFileRoute("/api/hangar/raman/fix-runs")({
  server: {
    handlers: {
      POST: ({ request }) => ramanHandler(request, ({ body }) => startFixRun(body), 201),
    },
  },
});
