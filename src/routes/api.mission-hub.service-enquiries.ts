import { createFileRoute } from "@tanstack/react-router";
import { resolveUserId, UnauthorizedError } from "@/lib/the-hangar/apiAuth";
import {
  ForbiddenError,
  InvalidEnquiryError,
  assertMissionHubAdmin,
  listEnquiries,
  updateEnquiryStatus,
} from "@/lib/services/serviceEnquiryPersistence";

// Mission Hub -> Business -> Service Requests. Site_Service_Enquiries has RLS
// with no policies, so the browser never reads it directly: this route checks
// the caller is an active Mission Hub admin, then uses supabaseAdmin.
//   GET ?search=&status=&service=&dateFrom=&dateTo=&page=&all=1 -> { rows, count }
//   PATCH { id, status } -> { ok: true }
function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

function fail(err: unknown): Response {
  if (err instanceof UnauthorizedError) return jsonResponse({ error: "Your session has expired -- sign in again." }, 401);
  if (err instanceof ForbiddenError) return jsonResponse({ error: err.message }, 403);
  if (err instanceof InvalidEnquiryError) return jsonResponse({ error: err.message }, 400);
  console.error("[mission-hub/service-enquiries]", err);
  return jsonResponse({ error: "Something went wrong loading service requests." }, 500);
}

async function requireAdmin(request: Request): Promise<void> {
  const userId = await resolveUserId(request);
  await assertMissionHubAdmin(userId);
}

export const Route = createFileRoute("/api/mission-hub/service-enquiries")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requireAdmin(request);
          const p = new URL(request.url).searchParams;
          const result = await listEnquiries({
            search: p.get("search") ?? undefined,
            status: p.get("status") ?? undefined,
            service: p.get("service") ?? undefined,
            dateFrom: p.get("dateFrom") ?? undefined,
            dateTo: p.get("dateTo") ?? undefined,
            page: Number(p.get("page") ?? 0) || 0,
            pageSize: Number(p.get("pageSize") ?? 20) || 20,
            all: p.get("all") === "1",
          });
          return jsonResponse(result);
        } catch (err) {
          return fail(err);
        }
      },
      PATCH: async ({ request }) => {
        try {
          await requireAdmin(request);
          const body: { id?: string; status?: string } = await request.json().catch(() => ({}));
          await updateEnquiryStatus(String(body.id ?? ""), String(body.status ?? ""));
          return jsonResponse({ ok: true });
        } catch (err) {
          return fail(err);
        }
      },
    },
  },
});
