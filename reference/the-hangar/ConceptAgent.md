# Concept Agent — Bay 02

**Status: built and live**, unlike `MissionAgent.md`, which was written as a build spec before Bay 01 existed. This document describes the actual shipped implementation — every section is a direct read of the real files, not a plan. Written after the fact specifically so it stays honest about where the implementation departs from what `MissionAgent.md` Section 17 ("Handover to Bay 02") assumed Concept Agent would do — see Section 11 below for exactly where it does.

## 1. Overview

Concept Agent takes one of a user's **finalized** Mission Agent specs and generates, reasons about, and ranks candidate vehicle concepts against it — 3 candidates per run, each scored for fit against the source mission's own constraints and KPIs. Nothing is committed to before this ranking exists.

There is no design document that predates this implementation (unlike `MissionAgent.md`). The 4-stage breakdown below was designed directly against the one-line description already present in `the-hangar.welcome.tsx`'s `NODES[1]` entry — *"Generates and ranks concept options against benchmarks, trends and design preferences before anything is committed to."* — and confirmed with the user before being built, since no other spec existed to build against.

## 2. Position in the Pipeline

Bay 02 of 15. Sits directly after Mission Agent (Bay 01) and before Aircraft Design Agent (Bay 03, not built).

```
Bay 01 (Mission Agent)  --finalized MissionSpec-->  Bay 02 (Concept Agent)  --ranked concepts-->  Bay 03 (Aircraft Design Agent, not built)
```

- **Consumes:** a finalized `MissionSpec` — `mission_specs`, `constraints`, `kpis`, `summary` — selected by the user from "Your saved specs" on `/the-hangar/concept`, sourced from `GET /api/hangar/missions?status=finalized` (Mission Agent's own list route, extended with a status filter — see Section 9).
- **Produces:** a ranked list of candidate concepts (`Hangar_concept_specs.ranked_concepts`), persisted per concept run, with a `confidence_score`.
- **Downstream:** Bay 03 (Aircraft Design Agent) does not exist yet. The Concept Dashboard's "Continue to Aircraft Design Agent →" button (`the-hangar.concept.tsx`) is present but disabled, `title="Bay 03 not yet built"` — same documented-not-built pattern Mission Agent's own dashboard used for the Concept Agent link before Bay 02 shipped.

## 3. Interface Contract (I/O)

### 3.1 Input — as actually implemented

**This is the one place this implementation deviates from what `MissionAgent.md` Section 17 documented Concept Agent should do.** Section 17 states: *"Fetched from `Hangar_mission_specs` by `mission_id` — Concept Agent does not receive the spec embedded in whatever triggers it."* The real Stage 1 request does the opposite — the spec is embedded directly in the request body, not fetched server-side. See Section 11 for the full implication.

`Stage1Request` (`conceptAgentPipeline.ts`) — the real shape sent to `POST /api/hangar/process-concept/concept-ideation`:

```ts
interface Stage1Request {
  userId: string;              // resolved server-side from the Bearer token, not client-supplied
  sourceMissionId: string;
  missionSpecs: MissionSpecsFields;   // client-supplied, verbatim from GET /api/hangar/missions?status=finalized
  constraints: FinalizedConstraint[]; // client-supplied
  kpis: FinalizedKpi[];               // client-supplied
  summary: string;                    // client-supplied
}
```

`missionSpecs`/`constraints`/`kpis`/`summary` are exactly the fields the client already received from `GET /api/hangar/missions?status=finalized` (a `MissionListEntry`, `missionAgentPipeline.ts`) for the mission the user clicked in "Your saved specs" — `the-hangar.concept.tsx`'s `startConceptGeneration()` copies them straight into the POST body. `runConceptIdeationStage` never re-reads `Hangar_mission_specs` itself.

### 3.2 Output — as actually implemented

`Stage4Result` (`conceptAgentPipeline.ts`) — the shape returned by `POST /api/hangar/process-concept/output-interface`, and the shape persisted to `Hangar_concept_specs`:

```ts
interface Stage4Result {
  conceptId: string;
  conceptCode: string;
  candidates: CandidateConcept[];        // Stage 1 output, echoed through
  tradeoffNotes: ConceptTradeoffNote[];  // Stage 2 output, echoed through
  rankedConcepts: RankedConcept[];       // Stage 3 output, echoed through
  confidenceScore: number;               // computed in Stage 4, see Section 7
  specVersion: number;                   // from get_next_concept_spec_version
  export: StubResult;                    // always { status: "stubbed", ... } — see Section 8
  eventPublish: EventStubResult;         // always { status: "stubbed", ... } — see Section 8
}

interface CandidateConcept {             // conceptIdeation.ts
  conceptName: string;
  description: string;
  vehicleClass: string;
  rationale: string;
}

interface ConceptTradeoffNote {          // tradeoffReasoning.ts
  conceptName: string;
  prosCons: string[];
  constraintFit: "pass" | "partial" | "fail";
  fitScore: number;                      // 1-10, clamped
  rationale: string;
}

interface RankedConcept {                // conceptRanking.ts
  conceptName: string;
  description: string;
  rank: number;                          // 1-based, assigned by rankConcepts
  fitScore: number;
  constraintFit: "pass" | "partial" | "fail";
  rationale: string;
}
```

`GET /api/hangar/concepts` ("Your concepts") returns `ConceptListEntry[]` (`conceptAgentPipeline.ts`) — the same four output fields plus `conceptId`, `conceptCode`, `sourceMissionId`, `status`, `createdAt`, read back from the **latest version only** of each concept's `Hangar_concept_specs` row (`getSpecsForConcepts`, Section 6).

## 4. Internal Architecture — Stage-by-Stage

Same pattern as Mission Agent: 4 independently-callable stage functions in `conceptAgentPipeline.ts`, each its own API route, so the UI pauses after each one for review-then-proceed. Each function's shape: assert ownership (except Stage 1, which creates the row) → flip status to `processing` → do the work in a `try` → log the run → return; `catch` routes through `recordStageFailure`.

### 4.1 Stage 01 — Concept Ideation

**Function:** `runConceptIdeationStage` (`conceptAgentPipeline.ts`) → `generateConceptIdeas` (`conceptIdeation.ts`)
**LLM call:** yes — `callLlmGateway` (Claude Sonnet 5, `llmGateway.ts`), `jsonMode: true`.

1. Rejects with `InvalidConceptInputError` if `sourceMissionId` is falsy — the only input validation this stage does.
2. `createConcept(userId, sourceMissionId)` — inserts the `Hangar_concepts` row (`status: 'draft'`), which is what generates `concept_id`/`concept_code`.
3. `updateConceptStatus(conceptId, "processing")`.
4. Calls `generateConceptIdeas` with the client-supplied `missionSpecs`/`constraints`/`kpis`/`summary`. The system prompt instructs Claude to generate **exactly 3** distinct candidates, each grounded only in the given spec — no invented requirements. Real response is parsed as `{ candidates: [{ concept_name, description, vehicle_class, rationale }] }`; on no API key or a parse failure, falls back to 3 hardcoded `mockCandidates` (labeled "Mock Concept A/B/C") and `mock: true`.
5. Logs to `Hangar_concept_runs` (stage `concept_ideation`).

### 4.2 Stage 02 — Trade-off Reasoning

**Function:** `runTradeOffReasoningStage` (`conceptAgentPipeline.ts`) → `analyzeConceptTradeoffs` (`tradeoffReasoning.ts`)
**LLM call:** yes — same gateway/model as Stage 1.

For each of Stage 1's 3 candidates, evaluates it against the mission's `constraints`/`kpis` only — the system prompt explicitly forbids inventing benchmarks or market data, since no such database exists (see Section 8). Returns one `{ concept_name, pros_cons[], constraint_fit, fit_score, rationale }` per candidate. Parsing clamps `fit_score` to `[1, 10]` and defaults an unparseable `constraint_fit` to `"partial"`. Mock fallback: one generic pros/cons note per candidate, `constraintFit: "partial"`, `fitScore: 5`.

### 4.3 Stage 03 — Ranking & Scoring

**Function:** `runRankingScoringStage` (`conceptAgentPipeline.ts`) → `rankConcepts` (`conceptRanking.ts`)
**LLM call:** none — deterministic, mirroring `tradeoffPrioritization.ts`'s gate-then-score approach for Mission Agent.

Merges each candidate with its trade-off note (matched by `conceptName`; a candidate with no matching note defaults to `fitScore: 1`, `constraintFit: "partial"`), then sorts by:
1. `constraintFit` tier first — `pass` (0) < `partial` (1) < `fail` (2), so nothing that fails a constraint can ever outrank something that doesn't, regardless of score.
2. `fitScore` descending within the same tier.

Assigns `rank` 1..N off the sorted order. Still logged as its own `Hangar_concept_runs` stage (`ranking_scoring`) with its own findings card in the UI, even though nothing here calls an LLM — kept as a distinct reviewable stage rather than folded into Stage 2 or Stage 4.

### 4.4 Stage 04 — Output Interface

**Function:** `runConceptOutputInterfaceStage` (`conceptAgentPipeline.ts`)
**LLM call:** none.

1. `assertConceptOwnership` (Section 5), then status → `processing`.
2. `computeConceptConfidence(rankedConcepts)` — see Section 7.
3. `persistConceptSpec` (`conceptPersistence.ts`) — gets the next version from `get_next_concept_spec_version` (Section 6.2), inserts into `Hangar_concept_specs`.
4. Status → `spec_ready`, with the confidence score.
5. `stubExport()` / `stubEventPublish()` (`exportAndEventStubs.ts`) — the same two stub functions Mission Agent's own Stage 4 calls, reused as-is, not concept-specific. `eventPublish.eventType` is hardcoded `"mission.spec_ready"` inside that shared file — **known cosmetic inaccuracy**: a concept's own `Hangar_concept_runs` audit row records this mission-flavored string verbatim, since the function wasn't parameterized. Harmless (nothing reads `eventType` downstream) but not accurate.
6. Logs to `Hangar_concept_runs` (stage `output_interface`, output includes `persistedSpecId`/`version`/`export`/`eventPublish`).

**Save as final:** `finalizeConcept` — `assertConceptOwnership` then `updateConceptStatus(conceptId, "finalized")`. Not one of the 4 stages, so — same as Mission Agent's `finalizeMission` — it does not call `logConceptStageRun` (`Hangar_concept_runs.stage`'s check constraint only accepts the 4 named stages).

## 5. Ownership Enforcement

`assertConceptOwnership(conceptId, userId)` (`conceptAgentPipeline.ts`) — called by Stages 2, 3, 4, and `finalizeConcept` (every stage after the one that creates the row, same as Mission Agent's `assertMissionOwnership`, which `MissionAgent.md` itself does not document either — this is new to the gated multi-stage design, not part of the original spec doc for either bay):

```ts
async function assertConceptOwnership(conceptId: string, userId: string): Promise<HangarConceptRow> {
  const concept = await getConcept(conceptId);
  if (!concept) throw new Error(`No Hangar_concepts row found for conceptId "${conceptId}"`);
  if (concept.user_id !== userId) throw new Error(`Concept "${concept.id}" does not belong to user "${userId}"`);
  return concept;
}
```

Every call from Stage 2 onward carries a client-supplied `conceptId` (the gated flow always resumes an existing concept) — without this check, any authenticated user who learned or guessed a `conceptId` could advance or read someone else's in-flight concept. `userId` itself is never client-supplied — every route resolves it server-side from the request's Bearer token via `resolveUserId` (`apiAuth.ts`) before calling any stage function.

**What this does *not* check** — see Section 11: nothing verifies that `sourceMissionId` (used only in Stage 1, to create the row) belongs to `userId`, or that the referenced mission is actually `finalized`.

## 6. Supabase Table Schema

Migration: `supabase/migrations/20260828003904_hangar_concept_agent.sql`. Same `Hangar_` prefix convention as Mission Agent's tables (`MissionAgent.md` Section 10), applied manually via the Supabase SQL editor — this repo's `Hangar_*` tables are confirmed to exist live with no corresponding auto-applied migration, so nothing here is different from that established pattern.

### 6.1 Tables

```sql
create table public."Hangar_concepts" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  source_mission_id uuid not null references public."Hangar_missions"(id),
  concept_code text not null default upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 20)),
  status text not null default 'draft'
    check (status in ('draft','processing','spec_ready','finalized','error')),
  confidence_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public."Hangar_concept_specs" (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references public."Hangar_concepts"(id),
  version int not null,
  candidate_concepts jsonb not null,   -- Stage 1 output
  trade_off_notes jsonb not null,      -- Stage 2 output
  ranked_concepts jsonb not null,      -- Stage 3 output (final ranked list)
  confidence_score numeric not null,
  created_at timestamptz not null default now(),
  unique (concept_id, version)
);

create table public."Hangar_concept_runs" (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references public."Hangar_concepts"(id),
  agent_id text not null default 'CONCEPT_AGENT',
  stage text not null
    check (stage in ('concept_ideation','trade_off_reasoning','ranking_scoring','output_interface')),
  input_snapshot jsonb,
  output_snapshot jsonb,
  status text not null check (status in ('success','error')),
  error_message text,
  duration_ms int,
  created_at timestamptz not null default now()
);
```

`Hangar_concepts.updated_at` is kept current by a `before update` trigger (`set_hangar_concepts_updated_at`, reusing the existing shared `set_hangar_updated_at()` function Mission Agent's own `updated_at` trigger already uses — no separate function was written for concepts).

`concept_code`'s default is a Postgres expression (uppercased, hyphen-stripped random UUID fragment), not a `plpgsql` trigger the way `mission_code` is (`MissionAgent.md` Section 10.2's `generate_hangar_mission_code()`). It doesn't encode `user_id`/timestamp the way `mission_code` visually does — it's just a random-looking unique string, functionally equivalent (unique, human-copyable) but not built the same way.

### 6.2 Version RPCs

```sql
create or replace function public.get_next_concept_spec_version(p_concept_id uuid)
returns int language sql stable
set search_path = ''
as $$
  select coalesce(max(version),0)+1 from public."Hangar_concept_specs" where concept_id = p_concept_id;
$$;

create or replace function public.get_latest_concept_spec(p_concept_id uuid)
returns public."Hangar_concept_specs"
language sql stable
set search_path = ''
as $$
  select * from public."Hangar_concept_specs"
  where concept_id = p_concept_id
  order by version desc
  limit 1;
$$;
```

**`get_next_concept_spec_version` is used** — `conceptPersistence.ts`'s `getNextConceptSpecVersion` calls it directly, exactly mirroring Mission Agent's `get_next_mission_spec_version` fix (same reasoning: a concept can be regenerated against the same `concept_id`, so the version can't be hardcoded).

**`get_latest_concept_spec` exists in the schema but is not called anywhere in the application code** — confirmed by search, zero references in `src/`. `conceptPersistence.ts`'s `getSpecsForConcepts` gets the same "latest version per concept" result a different way: it selects all matching rows ordered `(concept_id, version desc)` and keeps the first row seen per `concept_id` in JavaScript, batched across every concept in one query — the same pattern `missionPersistence.ts`'s `getSpecsForMissions` already uses for missions, since PostgREST has no `DISTINCT ON` and supabase-js's query builder can't express one. `get_latest_concept_spec` looks like it was added directly against the live schema mirroring the version-RPC pattern, but nothing in the app was ever wired to call it for a single concept lookup — it's live, callable, and currently unused. (The equivalent `get_latest_mission_spec` RPC exists live for Mission Agent too, for the same reason, and is equally unused by any Mission Agent code path.)

### 6.3 Row Level Security — enabled, but not the enforcement mechanism

```sql
alter table public."Hangar_concepts" enable row level security;
alter table public."Hangar_concept_specs" enable row level security;
alter table public."Hangar_concept_runs" enable row level security;

create policy "Users read/write their own concepts" on public."Hangar_concepts"
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read/write specs for their own concepts" on public."Hangar_concept_specs"
  for all using (exists (select 1 from public."Hangar_concepts" c where c.id = concept_id and c.user_id = auth.uid()));

create policy "Users read/write runs for their own concepts" on public."Hangar_concept_runs"
  for all using (exists (select 1 from public."Hangar_concepts" c where c.id = concept_id and c.user_id = auth.uid()));
```

RLS is enabled and these policies are real and correct — but **every single read and write in this feature goes through `conceptPersistence.ts`'s `supabaseAdmin` client (the service-role key), which bypasses RLS entirely, on every table, for every operation, including the read-only `GET /api/hangar/concepts` list.** No code path in this feature ever queries these tables with a plain user JWT. The actual, load-bearing access control is:

1. `resolveUserId` (`apiAuth.ts`) — extracts the caller's real identity from their Supabase session token; nothing downstream trusts a client-supplied user id.
2. `assertConceptOwnership` (Section 5) — checked on every stage after the one that creates the row.
3. `listUserConcepts`/`listConceptsForUser` — filter by `.eq("user_id", userId)` in the query itself.

These RLS policies would only start doing real work if some future code path queried `Hangar_concepts`/`Hangar_concept_specs`/`Hangar_concept_runs` directly from the browser with the publishable key and a user's session — which nothing in this feature does today. They're defense-in-depth against a change that hasn't happened, not the thing currently keeping one user from seeing another's concepts. Same caveat applies to Mission Agent's own equivalent policies (`MissionAgent.md` Section 10.1), which likewise assumes RLS is doing more than it currently is for a service-role-only application.

## 7. Confidence Score

No existing document defines a confidence formula for Concept Agent the way `MissionAgent.md` Section 4.3.1 does for missions (`0.4 × source_completeness + 0.4 × field_completeness − 0.05 × validation_flag_count`). The real formula, `computeConceptConfidence` (`conceptAgentPipeline.ts`):

```ts
function computeConceptConfidence(rankedConcepts: RankedConcept[]): number {
  if (rankedConcepts.length === 0) return 0;
  return Math.max(0, Math.min(1, rankedConcepts[0].fitScore / 10));
}
```

The top-ranked concept's own `fitScore` (1-10, from Stage 2's LLM output), linearly scaled to `0-1`. Simple and explainable, but note what it does *not* account for: how many candidates existed, how close the 2nd-ranked concept's score was, or whether `constraintFit` was `pass` vs `partial` for the winner — a `partial`-fit concept with `fitScore: 8` reports the identical `0.8` confidence a `pass`-fit concept with the same score would.

## 8. Tools Used

| Tool | Used? | Where |
|---|---|---|
| **LLM (Claude Sonnet 5)** | Yes | Stage 1 (`conceptIdeation.ts`), Stage 2 (`tradeoffReasoning.ts`) — 2 calls per concept run, same `callLlmGateway`/model as Mission Agent |
| **Rules engine / deterministic scoring** | Yes | Stage 3 (`conceptRanking.ts`) — gate-then-score, no LLM |
| **Knowledge graph / benchmark database** | **No** | Referenced in the welcome page's own one-line description of Bay 02 ("benchmarks, trends") and in the original architecture reference, but nothing was ever built — same status as Mission Agent's own "Knowledge Graph" entry in `MissionAgent.md` Section 5.2 ("not used ... no plan at all"). Stage 2's system prompt explicitly instructs Claude *not* to invent benchmark or market data, specifically because no real data source backs it. |
| **RAG / vector search** | No | `contextRetrieval.ts` is still the Mission Agent stub returning `[]`; Concept Agent has no RAG step of its own at all, stubbed or otherwise. |
| **Export (PDF/DOCX/Excel)** | No | `stubExport()`, shared with Mission Agent, always returns `{status:"stubbed"}` |
| **Event publish** | No | `stubEventPublish()`, shared with Mission Agent, always returns `{status:"stubbed"}` — see the `eventType` inaccuracy noted in Section 4.4 |

## 9. API Routes

All internal-only (no public wire contract the way `MissionAgent.md` Section 11 documents one for Mission Agent's Stage 1 — nothing outside this one UI calls any of these). Each follows the same shell: `resolveUserId` → parse body → call one `conceptAgentPipeline.ts` function → `jsonResponse`/`errorResponse` (`apiAuth.ts`).

| Route | Method | Calls |
|---|---|---|
| `/api/hangar/process-concept/concept-ideation` | POST | `runConceptIdeationStage` |
| `/api/hangar/process-concept/trade-off-reasoning` | POST | `runTradeOffReasoningStage` |
| `/api/hangar/process-concept/ranking-scoring` | POST | `runRankingScoringStage` |
| `/api/hangar/process-concept/output-interface` | POST | `runConceptOutputInterfaceStage` |
| `/api/hangar/process-concept/finalize` | POST | `finalizeConcept` |
| `/api/hangar/concepts` | GET | `listConceptsForUser` — "Your concepts" |

`/api/hangar/missions` (Mission Agent's own list route) was extended with an optional `?status=` query param specifically for this feature, rather than writing a parallel finalized-only route — `/api/hangar/missions?status=finalized` is what populates "Your saved specs."

`apiAuth.ts`'s `errorResponse` was extended with `ConceptAgentError`/`InvalidConceptInputError` branches (same shape as the pre-existing `MissionAgentError`/`InvalidMissionInputError` ones) so every route above shares the same error-mapping logic Mission Agent's routes already use.

## 10. UI — `the-hangar.concept.tsx`

New, self-contained route (`/the-hangar/concept`) — no shared imports with `the-hangar.mission.tsx`, matching the welcome page's own stated per-bay isolation convention. Small local duplicates of `callStageApi`, `StageErrorCard`, `ProceedRow`, etc. exist in this file rather than being extracted into a shared module, for the same reason.

Page sections, top to bottom:
- **Your saved specs** — collapsible list from `GET /api/hangar/missions?status=finalized`; clicking a row calls `selectSavedSpec`, which resets the flow and stages the chosen mission for generation (doesn't start Stage 1 automatically).
- **Your concepts** — collapsible list from `GET /api/hangar/concepts`; clicking a non-finalized entry calls `resumeConcept`, which reconstructs the full 4-stage-complete flow client-side from the list entry's already-fetched data (same pattern as Mission Agent's `resumeMission`) so Save-as-final/Edit-and-regenerate work without a second fetch. A finalized entry, or one with no persisted spec, opens the read-only `PastConceptDetail` view instead.
- **Generate a concept** — the "Plan a new mission" analog. Idle state shows the selected saved spec's code/type and a "Generate Concept →" button (no free-text input — the seed is a selection, not a brief). Once started: a 4-item stage tracker, a live status panel with per-stage "Proceed to X →" buttons and retry-on-error, and findings cards (`Stage1Findings`/`Stage2Findings`/`Stage3Findings`) that accumulate left-to-right as each stage completes.
- **Concept Dashboard** — once Stage 4 completes: ranked concept cards (`RankedConceptsSection`, rank/name/description/`FitBadge`/fit score/rationale), confidence score, Save as final, Edit and regenerate (keeps the same selected spec, resubmits as a new concept — no update-in-place path exists, same as Mission Agent), a disabled "Continue to Aircraft Design Agent →" placeholder, and Start a new concept.

Mission Agent's own dashboard (`the-hangar.mission.tsx`) was updated alongside this feature: its previously-disabled "Continue to Concept Agent →" button (`title="Bay 02 not yet built"`) now links to `/the-hangar/concept` for real. The welcome page's Bay 02 node (`the-hangar.welcome.tsx`) got `status: "online"` and `href: "/the-hangar/concept"`, same treatment Bay 01 already had.

## 11. Known Gaps, Stubs & Deviations from the Bay 01 Handover Contract

`MissionAgent.md` Section 17 documented, in advance, what it expected Concept Agent to do. Checked against the real implementation:

| Section 17 said | What actually happens |
|---|---|
| "Fetched from `Hangar_mission_specs` by `mission_id` — Concept Agent does not receive the spec embedded in whatever triggers it." | **Does receive it embedded.** Stage 1's request body carries `missionSpecs`/`constraints`/`kpis`/`summary` directly, client-supplied. `runConceptIdeationStage` never queries `Hangar_mission_specs` itself. See Section 3.1. |
| "If Concept Agent should only ever act on human-confirmed [`finalized`] specs, it must check `status = 'finalized'` specifically." | **Enforced client-side only.** The "Your saved specs" panel only ever fetches `?status=finalized`, so nothing not finalized is ever *offered*. But `runConceptIdeationStage` itself performs no server-side check on the source mission's status at all — it doesn't look the mission up. A request crafted directly against the API with a non-finalized (or nonexistent) `sourceMissionId` and arbitrary `missionSpecs`/`constraints`/`kpis` would still succeed. |
| (implied) Concept Agent should verify it's acting on a mission the caller actually owns. | **Not checked.** Nothing verifies `sourceMissionId` belongs to `userId`. The only foreign-key relationship enforced is the DB-level `references public."Hangar_missions"(id)` on `Hangar_concepts.source_mission_id` — it must be *a* real mission id, not necessarily the caller's own. In practice this is unreachable through the UI (the mission list is already scoped to the caller), but it is not defended at the API layer the way `assertConceptOwnership` defends every later stage. |

Additional gaps not tied to Section 17:

- **`get_latest_concept_spec` RPC is unused** (Section 6.2) — exists live, callable, mirrors the version-lookup pattern, but no code path calls it.
- **`stubEventPublish()`'s `eventType` is hardcoded to `"mission.spec_ready"`** (Section 4.4) — reused as-is from Mission Agent's stub rather than parameterized, so a concept's own audit log records the wrong event name. Cosmetic only; nothing reads it.
- **No real benchmark/knowledge-graph data exists** (Section 8) — "benchmarks, trends and design preferences" (the welcome page's own description of this bay) is Claude reasoning against the mission's own stated KPIs/constraints, explicitly instructed not to invent external data. This is a deliberate, disclosed simplification, not an oversight — confirmed with the user before building.
- **Fixed at 3 candidates, not configurable** — `conceptIdeation.ts`'s system prompt hardcodes "exactly 3 distinct candidate vehicle-concept options." No UI or API path changes this count.
- **No update-in-place / true regeneration** — "Edit and regenerate" on the Concept Dashboard creates a brand-new `Hangar_concepts` row against the same source mission, same limitation Mission Agent's own "Edit and regenerate" has relative to `MissionAgent.md` Section 13.2's documented version-2-of-the-same-record flow (also not built for missions).
- **Export and event publish are both stubs** — `StubResult`/`EventStubResult`, unchanged from Mission Agent, per `exportAndEventStubs.ts`'s own "specified now, built when needed" treatment.

## 12. Build Status

| Component | Status |
|---|---|
| Concept Ideation (Stage 1, LLM) | ✅ Built, real Claude calls confirmed live |
| Trade-off Reasoning (Stage 2, LLM) | ✅ Built, real Claude calls confirmed live |
| Ranking & Scoring (Stage 3, deterministic) | ✅ Built |
| Output Interface (Stage 4, persistence) | ✅ Built |
| Ownership enforcement | ✅ Built for Stages 2-4 and finalize; source-mission ownership/status not checked (Section 11) |
| `Hangar_concepts` / `Hangar_concept_specs` / `Hangar_concept_runs` | ✅ Live in Supabase (manually-applied migration) |
| RLS policies | ✅ Enabled, correct, but not load-bearing today (Section 6.3) |
| "Your saved specs" / "Your concepts" UI | ✅ Built |
| Export (PDF/DOCX/Excel) | ❌ Stub only |
| Event publish / bus | ❌ Stub only |
| Real benchmark / knowledge-graph data | ❌ Not built — reasoning-only, disclosed |
| Bay 03 (Aircraft Design Agent) hand-off | ❌ Not built — placeholder button only |
