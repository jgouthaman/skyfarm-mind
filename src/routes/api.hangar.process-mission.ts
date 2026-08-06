import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  runMissionAgent,
  MissionAgentError,
  InvalidMissionInputError,
} from "@/lib/the-hangar/missionAgentPipeline";
import type { MissionSourceInput, SourceType } from "@/lib/the-hangar/types/hangar-mission";

// Stage 2.4 (MissionAgent.md Section 4.4, Section 12.1) — the actual HTTP
// boundary: "the intake UI's 'Process Mission' button calls a server
// route ... which runs runMissionAgent internally and returns the
// finished MissionSpec to the client."
//
// File-based server route (`server.handlers`), not a createServerFn:
// createServerFn endpoints resolve to a hashed, non-guessable URL
// (`/_serverFn/<sha256 of source path + export name>`) and encode the
// request/response body in seroval's wire format, not plain JSON — not
// practical to curl directly (confirmed by reading
// @tanstack/start-server-core's dist code). A file route gets a real
// Request in and returns a real Response out — directly curlable, plain
// JSON. Modeled on this repo's only other raw-Response route,
// src/routes/sitemap[.]xml.ts.
//
// Auth: Section 12's own input schema (Section 11) has no user_id field —
// by design, identity comes from the caller's session (matching Section
// 10.2's auth.uid() expectation), not a body field a client could spoof.
// resolveUserId below inlines the exact same verification
// src/integrations/supabase/auth-middleware.ts's requireSupabaseAuth does
// (Authorization: Bearer <token> -> supabase.auth.getClaims(token) ->
// claims.sub). That middleware can't be imported and reused directly
// here: it's built with createMiddleware({ type: "function" }) — server
// FUNCTION middleware, for createServerFn's .middleware() only — while a
// file route's server.middleware expects request middleware
// (createMiddleware(), no { type: "function" }), a structurally different
// branded type. auth-middleware.ts is also marked "automatically
// generated. Do not edit it directly," so the logic is duplicated here
// rather than refactored there.

// Wire format matches Section 11's exact JSON example (snake_case:
// source_type / raw_input) — distinct from the internal MissionSourceInput
// type (camelCase: sourceType / rawInput) used everywhere else in the
// pipeline. Converted at this one boundary, same as the response's
// missionId -> mission_id mapping below.
interface WireMissionSource {
  source_type: SourceType;
  raw_input: Record<string, unknown>;
}

interface ProcessMissionRequestBody {
  mission_id?: string;
  sources: WireMissionSource[];
}

function toInternalSources(wireSources: WireMissionSource[]): MissionSourceInput[] {
  return wireSources.map((s) => ({ sourceType: s.source_type, rawInput: s.raw_input }));
}

function jsonError(status: number, error: string, missionId?: string): Response {
  return Response.json({ error, mission_id: missionId ?? null }, { status });
}

async function resolveUserId(request: Request): Promise<string | null> {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    throw new Error(`Missing Supabase environment variable(s): ${missing.join(", ")}`);
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  if (!token) return null;

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return data.claims.sub;
}

export const Route = createFileRoute("/api/hangar/process-mission")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let userId: string | null;
        try {
          userId = await resolveUserId(request);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return jsonError(500, `Auth configuration error: ${message}`);
        }
        if (!userId) {
          return jsonError(
            401,
            "Unauthorized: a valid Authorization: Bearer <token> header is required",
          );
        }

        let body: ProcessMissionRequestBody;
        try {
          body = await request.json();
        } catch {
          return jsonError(400, "Invalid JSON body");
        }
        if (!Array.isArray(body.sources) || body.sources.length === 0) {
          return jsonError(400, "Request body must include a non-empty `sources` array");
        }

        try {
          const result = await runMissionAgent({
            userId,
            missionId: body.mission_id,
            sources: toInternalSources(body.sources),
          });

          // Section 12's I/O contract (Section 11) — snake_case at the top
          // level; constraints[]/kpis[] entries already use plain field
          // names (name/value/sources, name/target/unit/priority), no
          // renaming needed inside those. validation_flags is an addition
          // beyond Section 12's core schema — see RunMissionAgentResult.
          return Response.json({
            mission_id: result.missionId,
            mission_code: result.missionCode,
            mission_specs: result.missionSpecs,
            constraints: result.constraints,
            kpis: result.kpis,
            summary: result.summary,
            confidence_score: result.confidenceScore,
            validation_flags: result.validationFlags,
          });
        } catch (err) {
          // Section 12.1: "No silent failures ... surfaced to the UI as a
          // real error state — never a blank screen." The pipeline itself
          // already logged the failing stage to Hangar_agent_runs and
          // flipped Hangar_missions.status to 'error' before this catch —
          // this is just the clean response back to the caller, never a
          // raw exception/stack trace.
          if (err instanceof InvalidMissionInputError) {
            // Section 12.1: rejected before any Hangar_missions row was
            // created — a 400, not a 500, since nothing broke, the
            // request just had nothing usable in it.
            return jsonError(400, err.message);
          }
          if (err instanceof MissionAgentError) {
            return jsonError(500, err.message, err.missionId);
          }
          const message = err instanceof Error ? err.message : String(err);
          return jsonError(500, message);
        }
      },
    },
  },
});
