import { createFileRoute } from "@tanstack/react-router";
import { ramanHandler } from "@/lib/raman/ramanApi";
import { recordPayment } from "@/lib/raman/RamanAgentPipeline";

// Raman (Bay 16) payment placeholder. Mission Hub admins only.
//   POST { status: paid|waived|pending, amount_inr?, reference? } -> { engagement, payment }
//   Payment 2 paid/waived unlocks Tab 3 (Noise Fix).
export const Route = createFileRoute("/api/hangar/raman/payments/$engagementId/$stage")({
  server: {
    handlers: {
      POST: ({ request, params }) =>
        ramanHandler(request, ({ body }) => recordPayment(params.engagementId, params.stage, body)),
    },
  },
});
