import { createFileRoute } from "@tanstack/react-router";
import { ramanHandler } from "@/lib/raman/ramanApi";
import { getEngagementBundle } from "@/lib/raman/RamanAgentPipeline";

// Raman (Bay 16) one engagement. Mission Hub admins only.
//   GET -> { engagement, vehicle, customer, baseline, fix_prediction, runs, reports, payments, history }
export const Route = createFileRoute("/api/hangar/raman/engagements/$id")({
  server: {
    handlers: {
      GET: ({ request, params }) => ramanHandler(request, () => getEngagementBundle(params.id)),
    },
  },
});
