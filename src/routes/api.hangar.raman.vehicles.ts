import { createFileRoute } from "@tanstack/react-router";
import { ramanHandler } from "@/lib/raman/ramanApi";
import { createVehicle, listVehicles } from "@/lib/raman/RamanAgentPipeline";

// Raman (Bay 16) vehicles. Mission Hub admins only.
//   GET  ?customerId=&q=                                          -> vehicles
//   POST { customer_id, name, vehicle_type?, layout?, notes? }    -> vehicle
export const Route = createFileRoute("/api/hangar/raman/vehicles")({
  server: {
    handlers: {
      GET: ({ request }) =>
        ramanHandler(request, ({ url }) =>
          listVehicles({
            customerId: url.searchParams.get("customerId") ?? undefined,
            q: url.searchParams.get("q") ?? undefined,
          }),
        ),
      POST: ({ request }) => ramanHandler(request, ({ body }) => createVehicle(body), 201),
    },
  },
});
