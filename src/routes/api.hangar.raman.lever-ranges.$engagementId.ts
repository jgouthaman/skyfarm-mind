import { createFileRoute } from "@tanstack/react-router";
import { ramanHandler } from "@/lib/raman/ramanApi";
import { leverRanges } from "@/lib/raman/RamanAgentPipeline";

// Raman (Bay 16) slider ranges. Mission Hub admins only.
//   GET -> engine lever_ranges for the engagement's baseline inputs
export const Route = createFileRoute("/api/hangar/raman/lever-ranges/$engagementId")({
  server: {
    handlers: {
      GET: ({ request, params }) => ramanHandler(request, () => leverRanges(params.engagementId)),
    },
  },
});
