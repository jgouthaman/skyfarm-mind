import { createFileRoute } from "@tanstack/react-router";
import { listSourceCatalogs } from "@/lib/the-hangar/sourceCatalogs";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// The options behind the intake form's Regulations and Market-data
// checkboxes. Reference data (not user data), but still behind sign-in like
// every other Hangar route.
export const Route = createFileRoute("/api/hangar/source-catalogs")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await resolveUserId(request);
          return jsonResponse(await listSourceCatalogs());
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
