import { resolveUserId, UnauthorizedError, jsonResponse } from "@/lib/the-hangar/apiAuth";
import { RamanEngineError, RamanInputError } from "./ramanEngineClient";
import {
  RamanConflictError,
  RamanForbiddenError,
  RamanNotFoundError,
  assertRamanAdmin,
} from "./RamanAgentPipeline";

// Shared shell for every /api/hangar/raman/* route: resolve the Mission Hub
// session (Authorization: Bearer), require an active admin, run the handler,
// map errors to status codes. Field errors from the engine pass through so
// Tab 1 can show them inline.

export interface RamanRequestContext {
  userId: string;
  request: Request;
  url: URL;
  body: Record<string, unknown>;
}

export function ramanErrorResponse(err: unknown): Response {
  if (err instanceof UnauthorizedError) return jsonResponse({ error: "Your session has expired -- sign in again." }, 401);
  if (err instanceof RamanForbiddenError) return jsonResponse({ error: err.message }, 403);
  if (err instanceof RamanNotFoundError) return jsonResponse({ error: err.message }, 404);
  if (err instanceof RamanConflictError) return jsonResponse({ error: err.message }, 409);
  if (err instanceof RamanInputError) return jsonResponse({ error: err.message, fields: err.fields }, 400);
  if (err instanceof RamanEngineError) {
    console.error("[raman] engine:", err.message);
    return jsonResponse({ error: err.message }, 502);
  }
  console.error("[raman]", err);
  return jsonResponse({ error: err instanceof Error ? err.message : "Something went wrong in Raman." }, 500);
}

export async function ramanHandler(
  request: Request,
  fn: (ctx: RamanRequestContext) => Promise<unknown>,
  status = 200,
): Promise<Response> {
  try {
    const userId = await resolveUserId(request);
    await assertRamanAdmin(userId);
    const body =
      request.method === "GET" || request.method === "HEAD"
        ? {}
        : (((await request.json().catch(() => ({}))) ?? {}) as Record<string, unknown>);
    return jsonResponse(await fn({ userId, request, url: new URL(request.url), body }), status);
  } catch (err) {
    return ramanErrorResponse(err);
  }
}
