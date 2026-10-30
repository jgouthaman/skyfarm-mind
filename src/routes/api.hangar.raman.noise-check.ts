import { createFileRoute } from "@tanstack/react-router";
import { ramanHandler } from "@/lib/raman/ramanApi";
import { runNoiseCheck } from "@/lib/raman/RamanAgentPipeline";

// Raman (Bay 16) Noise Check. Mission Hub admins only.
//   POST { engagement_id, inputs } -> engine noise_check -> Claude summary ->
//        frozen baseline check; engagement before_dba, furthest_tab 2.
//   400 { error, fields } on engine input errors; 409 if this cycle already has one.
export const Route = createFileRoute("/api/hangar/raman/noise-check")({
  server: {
    handlers: {
      POST: ({ request }) => ramanHandler(request, ({ body }) => runNoiseCheck(body), 201),
    },
  },
});
