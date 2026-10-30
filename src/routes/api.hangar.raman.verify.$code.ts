import { createFileRoute } from "@tanstack/react-router";
import { ramanHandler } from "@/lib/raman/ramanApi";
import { verifyCertificate } from "@/lib/raman/RamanAgentPipeline";

// Raman (Bay 16) certificate lookup behind the certificate's QR code.
// Mission Hub admins only for the beta.
//   GET -> { report, customer, vehicle, cycle, before_dba, after_dba, status } or 404
export const Route = createFileRoute("/api/hangar/raman/verify/$code")({
  server: {
    handlers: {
      GET: ({ request, params }) => ramanHandler(request, () => verifyCertificate(params.code)),
    },
  },
});
