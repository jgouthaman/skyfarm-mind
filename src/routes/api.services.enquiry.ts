import { createFileRoute } from "@tanstack/react-router";
import {
  InvalidEnquiryError,
  insertEnquiry,
  validateEnquiry,
} from "@/lib/services/serviceEnquiryPersistence";

// Same shape as apiAuth.ts's jsonResponse, kept local so this public route
// doesn't pull in the Hangar pipelines' error classes.
function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

// Public /services enquiry form (no login).
//   POST { name, organisation, email, service, message, website? } -> { ok: true }
//   400 { error } on invalid input, 500 { error } if the insert fails.
// `website` is the honeypot: filled in means a bot, answered 200 but not stored.
export const Route = createFileRoute("/api/services/enquiry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Record<string, unknown>;
        try {
          body = await request.json();
        } catch {
          return jsonResponse({ error: "Invalid request." }, 400);
        }
        try {
          const enquiry = validateEnquiry(body);
          if (enquiry) await insertEnquiry(enquiry);
          return jsonResponse({ ok: true });
        } catch (err) {
          if (err instanceof InvalidEnquiryError) return jsonResponse({ error: err.message }, 400);
          console.error("[services/enquiry]", err);
          return jsonResponse({ error: "We couldn't send your enquiry. Please try again." }, 500);
        }
      },
    },
  },
});
