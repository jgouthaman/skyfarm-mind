import { createFileRoute } from "@tanstack/react-router";
import { ramanHandler } from "@/lib/raman/ramanApi";
import { requestStop } from "@/lib/raman/RamanAgentPipeline";

// Raman (Bay 16) stop a Noise Fix run. Mission Hub admins only.
//   POST -> run with stop_requested; the next step call ranks and closes it.
export const Route = createFileRoute("/api/hangar/raman/fix-runs/$id/stop")({
  server: {
    handlers: {
      POST: ({ request, params }) => ramanHandler(request, () => requestStop(params.id)),
    },
  },
});
