import { createFileRoute } from "@tanstack/react-router";
import { ramanHandler } from "@/lib/raman/ramanApi";
import { createReport } from "@/lib/raman/RamanAgentPipeline";

// Raman (Bay 16) issue a report (check | final | certificate). Mission Hub admins only.
//   POST -> { report (certificate_code RNC-YYYY-NNNN for certificates), ...data the PDF needs }
export const Route = createFileRoute("/api/hangar/raman/reports/$engagementId/$type")({
  server: {
    handlers: {
      POST: ({ request, params }) =>
        ramanHandler(request, ({ userId }) => createReport(params.engagementId, params.type, userId), 201),
    },
  },
});
