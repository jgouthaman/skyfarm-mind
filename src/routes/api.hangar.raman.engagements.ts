import { createFileRoute } from "@tanstack/react-router";
import { ramanHandler } from "@/lib/raman/ramanApi";
import { startEngagement } from "@/lib/raman/RamanAgentPipeline";

// Raman (Bay 16) engagements. Mission Hub admins only.
//   POST { vehicle_id } -> new cycle for the vehicle (cycle = max + 1)
export const Route = createFileRoute("/api/hangar/raman/engagements")({
  server: {
    handlers: {
      POST: ({ request }) => ramanHandler(request, ({ body }) => startEngagement(body.vehicle_id), 201),
    },
  },
});
