import { createFileRoute } from "@tanstack/react-router";
import { ramanHandler } from "@/lib/raman/ramanApi";
import { closeEngagement } from "@/lib/raman/RamanAgentPipeline";

// Raman (Bay 16) close an engagement: freezes every check, status closed.
// Mission Hub admins only. 409 if already closed.
export const Route = createFileRoute("/api/hangar/raman/engagements/$id/close")({
  server: {
    handlers: {
      POST: ({ request, params }) => ramanHandler(request, () => closeEngagement(params.id)),
    },
  },
});
