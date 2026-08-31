import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { MissionAgentError, InvalidMissionInputError } from "./missionAgentPipeline.ts";
import { ConceptAgentError, InvalidConceptInputError } from "./conceptAgentPipeline.ts";
import {
  AircraftDesignAgentError,
  InvalidAircraftDesignInputError,
} from "./aircraftDesignAgentPipeline.ts";

// Shared auth + response helpers for the 4 Mission Agent stage routes
// (api.hangar.process-mission.*.ts) — extracted so each route file stays a
// thin resolve-user -> parse-body -> call-stage-function -> respond shell,
// with the auth verification and error-mapping logic living in exactly one
// place regardless of route count.
//
// resolveUserId inlines the exact same verification
// src/integrations/supabase/auth-middleware.ts's requireSupabaseAuth does
// (Authorization: Bearer <token> -> supabase.auth.getClaims(token) ->
// claims.sub). That middleware can't be imported and reused directly here:
// it's built with createMiddleware({ type: "function" }) — server FUNCTION
// middleware, for createServerFn's .middleware() only — while a file
// route's server.middleware expects request middleware (createMiddleware(),
// no { type: "function" }), a structurally different branded type.
// auth-middleware.ts is also marked "automatically generated. Do not edit
// it directly," so the logic is duplicated here rather than refactored there.

export class UnauthorizedError extends Error {}

export async function resolveUserId(request: Request): Promise<string> {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    throw new Error(
      `Auth configuration error: Missing Supabase environment variable(s): ${missing.join(", ")}`,
    );
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError(
      "Unauthorized: a valid Authorization: Bearer <token> header is required",
    );
  }
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    throw new UnauthorizedError(
      "Unauthorized: a valid Authorization: Bearer <token> header is required",
    );
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    throw new UnauthorizedError(
      "Unauthorized: a valid Authorization: Bearer <token> header is required",
    );
  }
  return data.claims.sub;
}

export function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

// Section 12.1: "No silent failures ... surfaced to the UI as a real error
// state — never a blank screen." Each stage function already logged its own
// failure to Hangar_agent_runs and flipped Hangar_missions.status to
// 'error' before this runs — this is just the clean response back to the
// caller, never a raw exception/stack trace.
export function errorResponse(err: unknown): Response {
  if (err instanceof UnauthorizedError) {
    return jsonResponse({ error: err.message, mission_id: null }, 401);
  }
  if (err instanceof InvalidMissionInputError) {
    // Rejected before any Hangar_missions row was created — a 400, not a
    // 500, since nothing broke, the request just had nothing usable in it.
    return jsonResponse({ error: err.message, mission_id: null }, 400);
  }
  if (err instanceof MissionAgentError) {
    return jsonResponse({ error: err.message, mission_id: err.missionId, stage: err.stage }, 500);
  }
  if (err instanceof InvalidConceptInputError) {
    return jsonResponse({ error: err.message, concept_id: null }, 400);
  }
  if (err instanceof ConceptAgentError) {
    return jsonResponse({ error: err.message, concept_id: err.conceptId, stage: err.stage }, 500);
  }
  if (err instanceof InvalidAircraftDesignInputError) {
    return jsonResponse({ error: err.message, aircraft_design_id: null }, 400);
  }
  if (err instanceof AircraftDesignAgentError) {
    return jsonResponse(
      { error: err.message, aircraft_design_id: err.aircraftDesignId, stage: err.stage },
      500,
    );
  }
  const message = err instanceof Error ? err.message : String(err);
  return jsonResponse({ error: message, mission_id: null }, 500);
}
