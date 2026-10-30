import { createFileRoute } from "@tanstack/react-router";
import { ramanHandler } from "@/lib/raman/ramanApi";
import { loadPropellers } from "@/lib/raman/RamanAgentPipeline";

// Raman (Bay 16) propeller research. Mission Hub admins only.
//   POST { query } -> Claude + web search -> rows saved as unverified
//        (only those whose source_url came back from the search) -> { saved, skipped }
export const Route = createFileRoute("/api/hangar/raman/propellers/load")({
  server: {
    handlers: {
      POST: ({ request }) => ramanHandler(request, ({ body }) => loadPropellers(body), 201),
    },
  },
});
