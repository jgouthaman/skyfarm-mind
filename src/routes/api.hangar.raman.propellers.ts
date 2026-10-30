import { createFileRoute } from "@tanstack/react-router";
import { ramanHandler } from "@/lib/raman/ramanApi";
import { listPropellers, savePropeller } from "@/lib/raman/RamanAgentPipeline";

// Raman (Bay 16) propeller DB. Mission Hub admins only.
//   GET  ?q=&status=                                   -> propellers
//   POST { id?, brand, model, ...specs, status? }      -> create (no id) or edit;
//        status verified/rejected records who decided and when
export const Route = createFileRoute("/api/hangar/raman/propellers")({
  server: {
    handlers: {
      GET: ({ request }) =>
        ramanHandler(request, ({ url }) =>
          listPropellers({ q: url.searchParams.get("q") ?? undefined, status: url.searchParams.get("status") ?? undefined }),
        ),
      POST: ({ request }) => ramanHandler(request, ({ body, userId }) => savePropeller(body, userId)),
    },
  },
});
