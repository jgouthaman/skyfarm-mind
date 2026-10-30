import { createFileRoute } from "@tanstack/react-router";
import { ramanHandler } from "@/lib/raman/ramanApi";
import { listRunSteps } from "@/lib/raman/RamanAgentPipeline";

// Raman (Bay 16) saved steps for live view and replay. Mission Hub admins only.
//   GET ?after=N -> { run, steps } with iteration > N
export const Route = createFileRoute("/api/hangar/raman/fix-runs/$id/steps")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        ramanHandler(request, ({ url }) => listRunSteps(params.id, url.searchParams.get("after"))),
    },
  },
});
