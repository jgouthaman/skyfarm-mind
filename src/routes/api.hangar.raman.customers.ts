import { createFileRoute } from "@tanstack/react-router";
import { ramanHandler } from "@/lib/raman/ramanApi";
import { createCustomer, listCustomers } from "@/lib/raman/RamanAgentPipeline";

// Raman (Bay 16) customers. Mission Hub admins only.
//   GET  ?q=                                      -> customers with vehicles + engagements
//   POST { name, company?, email?, phone?, notes? } -> customer
export const Route = createFileRoute("/api/hangar/raman/customers")({
  server: {
    handlers: {
      GET: ({ request }) => ramanHandler(request, ({ url }) => listCustomers(url.searchParams.get("q") ?? undefined)),
      POST: ({ request }) => ramanHandler(request, ({ body, userId }) => createCustomer(body, userId), 201),
    },
  },
});
