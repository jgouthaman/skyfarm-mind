# Aircraft Design Agent — Bay 03

**Status:** Not started (see [Build Status](#8-build-status)) — this document is a build spec written before any code exists, in `MissionAgent.md`'s style, not `ConceptAgent.md`'s. `ConceptAgent.md` was written *after* Bay 02 shipped, as a direct read of real files — everything in it is fact. This document is the opposite: everything below Section 3's real-behavior grounding is a proposal for someone to build against, not a description of anything that runs today.
**Agent ID:** `AIRCRAFT_DESIGN_AGENT` (proposed — not yet referenced anywhere in code)
**Type:** Base Agent (Downstream)
**Stage:** 3 of 15 — The Hangar
**Scope of this document:** a plan, not a build record. Expect this document to need correcting once Bay 03 is actually built — the same way `MissionAgent.md`'s own Section 11/Section 4.3 needed fixing after Bay 01 shipped (a stale flat-string `constraints` shape lingered in two places until it was caught and corrected), and the same way `ConceptAgent.md` Section 11 exists specifically to catalog everywhere Bay 02's real code diverged from what `MissionAgent.md` Section 17 assumed it would do. Whoever builds Bay 03 should expect at least one section here to be wrong in exactly that way, and should write the equivalent of `ConceptAgent.md` Section 11 once it ships.

---

## 1. Overview

Aircraft Design Agent takes a **finalized** concept from Bay 02 — one ranked, constraint-fitting vehicle concept, not the full set of three candidates — and turns it into real aircraft geometry parameters and a component selection, gated against design rules and reference designs rather than guessed. It is the first bay to produce anything resembling an actual airframe definition; everything before it (Mission Agent, Concept Agent) works entirely in text and structured JSON.

**One-line contract:** one finalized, `pass`-fit concept in, gated geometry + component selection out.

This is also the first bay downstream of two prior bays instead of one — it depends on both Bay 01 (transitively, via the concept's `source_mission_id`) and Bay 02 directly. Section 3 below is largely about that: what a naive "trust the `concept_id` I was given" implementation would get wrong, given what `ConceptAgent.md` already documents Bay 02 actually does and doesn't check.

## 2. Position in the Pipeline

| | |
|---|---|
| Upstream | Bay 02 — Concept Agent |
| Upstream (transitive) | Bay 01 — Mission Agent, via the concept's `source_mission_id` |
| Downstream (next) | Bay 04 — CAD Agent |
| Reads/writes shared memory | Bay 15 — Knowledge Agent (not built) |

```
Bay 02 (Concept Agent)  --finalized, pass-fit concept-->  Bay 03 (Aircraft Design Agent)  --geometry params-->  Bay 04 (CAD Agent, not built)
```

Per the welcome page's own description of this bay (`the-hangar.welcome.tsx`, `NODES[2]`): *"Selects configuration and design parameters — gate-then-score against rules and reference designs, never a guess."* Input: "Concept, airfoil DB." Tools: "OpenVSP, XFLR5." Output: "Aircraft geometry preview." None of that tooling (OpenVSP, XFLR5, an airfoil database) exists anywhere in this codebase today — Section 4 below proposes an architecture consistent with "gate-then-score, never a guess" using the patterns already proven in Bay 01/Bay 02 (deterministic rule tables, LLM used only for qualitative reasoning, never for a number that should be exact), not a claim that real aerodynamics tooling is already wired up.

## 3. Prerequisite Checks

**This section is the most important one in this document.** Before Bay 03's first stage does anything with a `concept_id` it receives, it must perform every check below — each one exists because of something `ConceptAgent.md` already documents Bay 02 actually does (or doesn't do), not a generic security checklist. A Bay 03 implementation that skips any of these will generate real geometry against a concept the ranking already flagged as unsuitable, against stale data, against mock placeholders, or against a mission the concept was never actually verified to belong to.

### 3.a Status gate — `finalized` only, never `spec_ready` alone

`Hangar_concepts.status` moves `draft → processing → spec_ready → finalized` (`ConceptAgent.md` Section 6.1, same enum Mission Agent uses). `spec_ready` means Stage 4 persisted a spec — it does **not** mean a human reviewed and confirmed it; `finalized` means the user clicked Save as final (`ConceptAgent.md` Section 4.4). Bay 03 must check `status = 'finalized'` specifically, exactly the same distinction `MissionAgent.md` Section 17 already called out for Bay 02 consuming Bay 01's output — and the same distinction Bay 02's own real implementation does *not* enforce server-side for its own input (`ConceptAgent.md` Section 11, row 2). Don't repeat that gap here: treating `spec_ready` as good enough would mean generating real geometry against a concept ranking the user never actually confirmed.

### 3.b Ownership check — `assertAircraftDesignOwnership`, never trust a client-supplied `concept_id`

Proposed function, same shape as Bay 02's real `assertConceptOwnership` (`conceptAgentPipeline.ts`):

```ts
async function assertAircraftDesignOwnership(aircraftDesignId: string, userId: string): Promise<HangarAircraftDesignRow> {
  const design = await getAircraftDesign(aircraftDesignId);
  if (!design) throw new Error(`No Hangar_aircraft_designs row found for aircraftDesignId "${aircraftDesignId}"`);
  if (design.user_id !== userId) throw new Error(`Aircraft design "${design.id}" does not belong to user "${userId}"`);
  return design;
}
```

But ownership of the **aircraft design row** isn't the only thing that needs checking here — Bay 03's Stage 1 additionally receives a `concept_id` it did not create (unlike Bay 02's Stage 1, which receives a `source_mission_id` but at least creates its own `Hangar_concepts` row from scratch). Whatever function reads that `concept_id` must independently verify it belongs to the same `userId` — i.e. a real `assertConceptOwnership(conceptId, userId)` call (Bay 02's existing function, already exported from `conceptAgentPipeline.ts` and directly reusable) **before** trusting anything about that concept, exactly the way Bay 02 itself never trusts a client-supplied `conceptId` on Stages 2 through 4.

### 3.c Fetch explicitly by latest version — don't assume any row is current

`Hangar_concept_specs` is versioned (`unique (concept_id, version)`, `ConceptAgent.md` Section 6.1) — a concept can be regenerated, producing more than one spec row per `concept_id`. Bay 03 must fetch the **latest** version explicitly (`order by version desc limit 1`), never assume there's exactly one row or that the first/last-inserted row is current.

`get_latest_concept_spec(p_concept_id uuid)` already exists live in the schema for exactly this (`ConceptAgent.md` Section 6.2) — and, per that same section, **has never been called by any application code**. Neither Concept Agent's own `getSpecsForConcepts` (which does its own JS-side latest-version dedup instead, batched across many concepts at once — the right choice for a list view, wrong tool for a single lookup) nor anything else uses it. Bay 03's single-concept lookup is exactly the shape this RPC was built for — **this is the natural first real caller.** Use it, rather than reimplementing the same JS-side dedup pattern a third time for a case (one row, not a batch) the RPC already fits better.

### 3.d Gate on `constraintFit`, not just `confidence_score`

This is the sharpest edge in the handoff. `computeConceptConfidence` (`conceptAgentPipeline.ts`, quoted in full in `ConceptAgent.md` Section 7):

```ts
function computeConceptConfidence(rankedConcepts: RankedConcept[]): number {
  if (rankedConcepts.length === 0) return 0;
  return Math.max(0, Math.min(1, rankedConcepts[0].fitScore / 10));
}
```

This scales **only** the rank-1 concept's `fitScore` (1–10) to `0–1`. It does **not** look at `constraintFit` at all. `ConceptAgent.md` Section 7 already flags the consequence directly: *"a `partial`-fit concept with `fitScore: 8` reports the identical `0.8` confidence a `pass`-fit concept with the same score would."* A `constraintFit: "fail"` concept could in principle still rank 1st (Stage 3's gate only guarantees `fail` sorts **last among concepts that have a matching trade-off note** — see `conceptRanking.ts`'s tier order `pass(0) < partial(1) < fail(2)` — it does not guarantee the winner is `pass`; if all three candidates come back `partial` or worse, rank 1 is still whichever scores highest among them).

**Bay 03 must independently check the selected concept's own `constraintFit` field, not read `confidence_score` as a stand-in for it.** A concrete gating rule to build against: refuse to generate real geometry for anything but `constraintFit: "pass"`; for `"partial"`, proceed only behind an explicit, visible warning naming which constraints weren't fully met (Stage 2's `rationale` field already contains this, per-concept); for `"fail"`, refuse outright regardless of `confidence_score` or `fitScore`.

### 3.e Check for `mock: true` on the source concept spec

Neither `Stage1Result` nor `Stage2Result` (Concept Agent) persists its own `mock` flag into `Hangar_concept_specs` — `persistConceptSpec` only ever writes `candidate_concepts`/`trade_off_notes`/`ranked_concepts`/`confidence_score` (`conceptPersistence.ts`). The `mock: true` signal (set when `callLlmGateway` gets no API key or an unparseable response — `ConceptAgent.md` Section 4.1/4.2) only exists transiently in the Stage 1/Stage 2 **response bodies**, and durably in each stage's `Hangar_concept_runs.output_snapshot` (the full stage result, mock flag included, per `logConceptStageRun`'s call sites in `conceptAgentPipeline.ts`).

Two implications for Bay 03: (1) if Bay 03 ever needs to know whether a given concept spec was generated from real Claude output or the hardcoded "Mock Concept A/B/C" fallback, it has to look in `Hangar_concept_runs` for that concept's `concept_ideation`/`trade_off_reasoning` rows and inspect `output_snapshot.mock`, not `Hangar_concept_specs` — the mock flag isn't there. (2) Bay 03's own persisted spec should almost certainly carry a `source_was_mock` flag of its own (see Section 5.2) forward from that check, so this signal doesn't get lost a second time the way it already was once, going from Concept Agent's response shape into its own persisted row.

### 3.f Verify `ranked_concepts` is non-empty and a rank-1 entry exists

`rankConcepts` (`conceptRanking.ts`) always returns exactly as many entries as candidates went in — normally 3 (`conceptIdeation.ts`'s hardcoded count, `ConceptAgent.md` Section 11) — but nothing prevents a future code path from persisting an empty array (e.g. `computeConceptConfidence`'s own `if (rankedConcepts.length === 0) return 0` branch already exists specifically because this case is possible). Bay 03 must check `ranked_concepts.length > 0` and that a `rank === 1` entry is actually present before indexing into it — don't assume index `[0]` is rank 1 just because that happens to be true of every spec generated today (`rankConcepts` does sort before assigning rank, so index `[0]` is rank 1 *today*, but that's an implementation detail of `conceptRanking.ts`, not a contract Bay 03 should silently depend on).

### 3.g Re-verify `source_mission_id` transitively — an open question, not a solved one

`ConceptAgent.md` Section 11 documents, plainly: *"Nothing verifies `sourceMissionId` belongs to `userId`"* and *"[Bay 02] performs no server-side check on the source mission's status at all."* This matters to Bay 03 specifically if Bay 03 ever reads mission-level constraints/KPIs directly (e.g. to double-check the concept's trade-offs against the original mission, not just against what Concept Agent already baked into `trade_off_notes`) — at that point Bay 03 would be trusting a chain (`concept → source_mission_id → mission constraints/KPIs`) that Bay 02 itself never validated.

Two options, not a recommendation for one over the other — this needs a decision when Bay 03 is actually scoped, not a default assumed here:
1. **Fix it in Bay 02 first.** Add the missing check to `runConceptIdeationStage` (verify `sourceMissionId` belongs to `userId` and its `Hangar_missions.status = 'finalized'`, server-side, before creating the `Hangar_concepts` row) — closes the gap at its source, benefits every future consumer of concepts, not just Bay 03.
2. **Re-check it in Bay 03.** If Bay 03 reads mission-level data via `source_mission_id`, call `assertMissionOwnership` (`missionAgentPipeline.ts`, already exported) and check `Hangar_missions.status === 'finalized'` itself before trusting that data — defends Bay 03 specifically, but leaves the same gap open for whatever calls Concept Agent's API directly.

If Bay 03 never reads mission-level data at all (only ever reads the concept's own already-persisted `trade_off_notes`/`ranked_concepts`), this gap doesn't reach Bay 03 and neither option is required yet — but that should be a deliberate scoping decision, not an assumption made by omission.

### 3.h Validate the jsonb shape — don't trust untyped columns to match the TypeScript interface

`candidate_concepts`, `trade_off_notes`, and `ranked_concepts` are all plain `jsonb` columns with no schema validation at the database level (`ConceptAgent.md` Section 6.1) — `HangarConceptSpecRow`'s TypeScript fields (`conceptPersistence.ts`) type them as bare `unknown[]`, and every read site in Concept Agent's own code (`getSpecsForConcepts`, `listConceptsForUser`) does an unchecked `as unknown as CandidateConcept[]`/`as unknown as RankedConcept[]` cast, never a runtime shape check. Nothing today prevents a hand-edited row, a future migration, or a bug in a not-yet-written Concept Agent change from persisting a `ranked_concepts` entry missing `constraintFit` or `fitScore`.

Before Bay 03 trusts a `RankedConcept`-shaped object well enough to gate real geometry generation on its `constraintFit` (Section 3.d), it must validate the fields it actually depends on are present and correctly typed — `conceptName: string`, `rank: number`, `fitScore: number`, `constraintFit: "pass" | "partial" | "fail"`, `rationale: string` — and fail loudly (not silently coerce or default) if they aren't, rather than inheriting Concept Agent's own unchecked-cast pattern for data it's about to act on irreversibly.

## 4. Proposed Internal Architecture — 4 Stages

**PROPOSED — NOT YET BUILT.** Same gated pattern as Mission Agent and Concept Agent: 4 independently-callable stage functions, each its own API route, review-then-proceed in the UI. Stage *names* below follow Mission Agent's naming convention (Input Processing/Reasoning & Planning/Output Generation/Output Interface) rather than Concept Agent's own (concept_ideation/trade_off_reasoning/ranking_scoring/output_interface) — either is a reasonable precedent; these were chosen to make each stage's actual job explicit in its name.

### 4.1 Geometry Generation

Runs Section 3's full prerequisite checklist first — this stage is where all 8 checks belong, since it's the one that creates the `Hangar_aircraft_designs` row from a `concept_id` (mirrors Bay 01/Bay 02's own Stage 1 pattern: the only stage without a prior row to assert ownership over, but the one place upstream trust has to be established once).

Proposed content: derive candidate geometry parameters (wingspan, fuselage length, wing area, aspect ratio, etc. — informed by `vehicleClass`/`description`/`rationale` on the winning `RankedConcept`) gated against a rules table analogous to Mission Agent's `domainRules.ts` (reference designs / configuration constraints per vehicle class), not a free-form LLM guess for any number that should be exact — "gate-then-score, never a guess," per this bay's own one-line description (Section 2). An LLM call, if used at all, should be scoped to qualitative narrative (a human-readable rationale for the chosen geometry class), never to the numeric parameters themselves — same discipline `constraintIdentification.ts`'s `STRUCTURED_KPI_OVERRIDES` fix already established for Mission Agent, after a real bug where an LLM was allowed to restate a number that should have been deterministic.

### 4.2 Component Selection

Proposed content: selects major components (propulsion, avionics class, control-surface configuration) consistent with the geometry from 4.1 and the concept's constraints, again gated against a reference table rather than generated freely.

### 4.3 Output Generation

Proposed content: assembles the finalized geometry + component selection + design rationale into one persisted record — deterministic assembly, mirroring Mission Agent's Stage 3 (`missionSpecAssembly.ts`) and Concept Agent's Stage 4 persistence step, not a new LLM call of its own.

### 4.4 Output Interface

Proposed content: persist to `Hangar_aircraft_design_specs` (Section 6), flip `Hangar_aircraft_designs.status` to `spec_ready`, stub export/event-publish (reuse `exportAndEventStubs.ts` as-is, same as Concept Agent did for Mission Agent's stubs — but see Section 6.2's note about actually parameterizing `eventType` this time instead of repeating Concept Agent's known cosmetic bug, `ConceptAgent.md` Section 4.4/11).

## 5. Proposed I/O Contract

### 5.1 Input — real, taken directly from Bay 02's actual shipped code

Not invented — copied verbatim from `conceptPersistence.ts` and `conceptAgentPipeline.ts`, since this is Bay 03's real, current input regardless of anything else in this document being proposed:

```ts
// conceptPersistence.ts — the persisted row Bay 03 should fetch via
// get_latest_concept_spec (Section 3.c), not reconstruct from a
// client-supplied payload the way Concept Agent's own Stage 1 does
// (ConceptAgent.md Section 3.1/11 — don't repeat that pattern here).
export type ConceptStatus = "draft" | "processing" | "spec_ready" | "finalized" | "error";

export interface HangarConceptRow {
  id: string;
  user_id: string;
  source_mission_id: string;
  concept_code: string;
  status: ConceptStatus;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface HangarConceptSpecRow {
  id: string;
  concept_id: string;
  version: number;
  candidate_concepts: unknown[];   // validate before use — Section 3.h
  trade_off_notes: unknown[];      // validate before use — Section 3.h
  ranked_concepts: unknown[];      // validate before use — Section 3.h
  confidence_score: number;
  created_at: string;
}

// The shapes candidate_concepts / trade_off_notes / ranked_concepts are
// expected to contain, once validated (conceptIdeation.ts / tradeoffReasoning.ts / conceptRanking.ts):
export interface CandidateConcept {
  conceptName: string;
  description: string;
  vehicleClass: string;
  rationale: string;
}
export type ConstraintFit = "pass" | "partial" | "fail";
export interface ConceptTradeoffNote {
  conceptName: string;
  prosCons: string[];
  constraintFit: ConstraintFit;
  fitScore: number;
  rationale: string;
}
export interface RankedConcept {
  conceptName: string;
  description: string;
  rank: number;
  fitScore: number;
  constraintFit: ConstraintFit;
  rationale: string;
}
```

`Hangar_concepts.status` must be checked as `'finalized'` (Section 3.a) — nothing above enforces that on its own, it's just the row shape.

### 5.2 Output — PROPOSED, NOT YET BUILT

```ts
// PROPOSED — none of this exists yet.
export interface Stage4Request {
  userId: string;
  aircraftDesignId: string;
  geometryParameters: GeometryParameters;
  componentSelections: ComponentSelection[];
  designRationale: string;
}

export interface GeometryParameters {
  wingspan_m: number;
  fuselageLength_m: number;
  wingArea_m2: number;
  aspectRatio: number;
  vehicleClass: string;             // carried forward from the winning RankedConcept
  // Additional fields TBD once a real geometry-generation approach (Section 4.1) is chosen.
}

export interface ComponentSelection {
  category: string;                 // e.g. "propulsion", "avionics", "control surfaces"
  selection: string;
  rationale: string;
}

export interface Stage4Result {
  aircraftDesignId: string;
  designCode: string;
  geometryParameters: GeometryParameters;
  componentSelections: ComponentSelection[];
  designRationale: string;
  sourceWasMock: boolean;           // forwarded from Section 3.e's check — don't lose this signal a second time
  confidenceScore: number;          // formula TBD — see the open question this raises for Concept Agent's own formula, Section 3.d
  specVersion: number;
  export: StubResult;
  eventPublish: EventStubResult;    // eventType should be "aircraft_design.spec_ready", parameterized — not copy-pasted as a mission/concept string (ConceptAgent.md Section 4.4/11)
}
```

## 6. Proposed Schema — NOT YET APPLIED

Mirrors `Hangar_concepts` / `Hangar_concept_specs` / `Hangar_concept_runs` exactly — same status enum, same version-RPC pattern, same RLS-enabled-but-not-the-real-enforcement pattern (`ConceptAgent.md` Section 6.3). No migration file exists for this yet; this is SQL to review and adapt when Bay 03 is actually scoped, not something to run today.

### 6.1 Tables (PROPOSED)

```sql
create table public."Hangar_aircraft_designs" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  source_concept_id uuid not null references public."Hangar_concepts"(id),
  design_code text not null default upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 20)),
  status text not null default 'draft'
    check (status in ('draft','processing','spec_ready','finalized','error')),
  confidence_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public."Hangar_aircraft_design_specs" (
  id uuid primary key default gen_random_uuid(),
  aircraft_design_id uuid not null references public."Hangar_aircraft_designs"(id),
  version int not null,
  geometry_parameters jsonb not null,
  component_selections jsonb not null,
  design_rationale text not null,
  confidence_score numeric not null,
  created_at timestamptz not null default now(),
  unique (aircraft_design_id, version)
);

create table public."Hangar_aircraft_design_runs" (
  id uuid primary key default gen_random_uuid(),
  aircraft_design_id uuid not null references public."Hangar_aircraft_designs"(id),
  agent_id text not null default 'AIRCRAFT_DESIGN_AGENT',
  stage text not null
    check (stage in ('geometry_generation','component_selection','output_generation','output_interface')),
  input_snapshot jsonb,
  output_snapshot jsonb,
  status text not null check (status in ('success','error')),
  error_message text,
  duration_ms int,
  created_at timestamptz not null default now()
);

create trigger set_hangar_aircraft_designs_updated_at
  before update on public."Hangar_aircraft_designs"
  for each row execute function public.set_hangar_updated_at();
```

### 6.2 Version RPCs (PROPOSED)

```sql
create or replace function public.get_next_aircraft_design_spec_version(p_aircraft_design_id uuid)
returns int language sql stable
set search_path = ''
as $$
  select coalesce(max(version),0)+1 from public."Hangar_aircraft_design_specs" where aircraft_design_id = p_aircraft_design_id;
$$;

create or replace function public.get_latest_aircraft_design_spec(p_aircraft_design_id uuid)
returns public."Hangar_aircraft_design_specs"
language sql stable
set search_path = ''
as $$
  select * from public."Hangar_aircraft_design_specs"
  where aircraft_design_id = p_aircraft_design_id
  order by version desc
  limit 1;
$$;
```

**Build note, learned from the real gap already sitting in production:** `get_next_X_version` has been wired up and used both times it's existed so far (missions, concepts). `get_latest_X_spec` has been added both times and **used neither time** (`ConceptAgent.md` Section 6.2 — both `get_latest_mission_spec` and `get_latest_concept_spec` exist live and are called by nothing). If this pattern repeats a third time, don't add `get_latest_aircraft_design_spec` to the schema unless Bay 03's own code actually calls it — Section 3.c above is specifically written to make Bay 03 the first real caller, not the third unused RPC in a row.

### 6.3 Row Level Security (PROPOSED)

```sql
alter table public."Hangar_aircraft_designs" enable row level security;
alter table public."Hangar_aircraft_design_specs" enable row level security;
alter table public."Hangar_aircraft_design_runs" enable row level security;

create policy "Users read/write their own aircraft designs" on public."Hangar_aircraft_designs"
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read/write specs for their own aircraft designs" on public."Hangar_aircraft_design_specs"
  for all using (exists (select 1 from public."Hangar_aircraft_designs" d where d.id = aircraft_design_id and d.user_id = auth.uid()));

create policy "Users read/write runs for their own aircraft designs" on public."Hangar_aircraft_design_runs"
  for all using (exists (select 1 from public."Hangar_aircraft_designs" d where d.id = aircraft_design_id and d.user_id = auth.uid()));
```

Same caveat as Concept Agent's own RLS (`ConceptAgent.md` Section 6.3), stated up front this time instead of discovered after the fact: **if** Bay 03's application code only ever accesses these tables via the service-role key (the pattern both prior bays use exclusively), these policies are defense-in-depth, not the actual enforcement — `assertAircraftDesignOwnership` (Section 3.b) and a `.eq("user_id", userId)` filter on any list query are what actually keep one user from reading another's designs. Document that plainly in whatever the real build's equivalent of this file is, rather than let the schema imply RLS is doing more than it will be.

## 7. Handover to Bay 04 — CAD Agent

Same purpose as `MissionAgent.md` Section 17 — written for whoever specs Bay 04 next, so it isn't scattered across this document.

**What CAD Agent would receive (once built):** an `AircraftDesignSpec` — geometry parameters + component selections, Section 5.2's `Stage4Result` shape — fetched from `Hangar_aircraft_design_specs` by `aircraft_design_id`, the same "fetch by id server-side, don't trust an embedded payload" contract `MissionAgent.md` Section 17 specified for Bay 02 and that Bay 02's real implementation did not end up following (`ConceptAgent.md` Section 11). **Whoever builds Bay 03 should actually follow this one** rather than repeat that specific gap a second time — Section 3 of this document exists in large part because Bay 02 didn't.

**What's guaranteed (once built, if this spec is followed):** `constraintFit` was checked `"pass"` before geometry was generated (Section 3.d); the source concept's `mock` status was checked and carried forward as `sourceWasMock` (Section 3.e); the spec being read is the latest version (Section 3.c).

**What's NOT guaranteed, even once built:** geometry parameters are only as good as the rule tables/reference designs Section 4.1 is built against — this document proposes the gating discipline, not the actual aerospace engineering content of those tables, which doesn't exist yet and is out of scope here.

## 8. Build Status

| Item | Status |
|---|---|
| `Hangar_aircraft_designs` / `_specs` / `_runs` tables | Not created |
| Version RPCs | Not created |
| RLS policies | Not created |
| `assertAircraftDesignOwnership` | Not started |
| Stage 1 — Geometry Generation | Not started |
| Stage 2 — Component Selection | Not started |
| Stage 3 — Output Generation | Not started |
| Stage 4 — Output Interface | Not started |
| API routes | Not started |
| UI (`the-hangar.aircraft-design.tsx` or equivalent) | Not started |
| Welcome page node (`the-hangar.welcome.tsx`, Bay 03) | Still `status: "design"`, no `href` |
| OpenVSP / XFLR5 / airfoil DB integration | Not started — not even stubbed; Section 4 proposes gated deterministic logic as a starting point, not a claim this tooling is planned imminently |

## 9. Document Status — Read Before Building

This is a plan, not a build record. Every code snippet under Sections 4 through 7 is proposed — none of it has been written, tested, or reconciled against a real implementation, unlike everything under `ConceptAgent.md`, which is a read of shipped code. Section 3 is the one part of this document grounded entirely in already-real behavior (Bay 02's actual, shipped code, as documented in `ConceptAgent.md`) — it should stay accurate regardless of how Bay 03 ends up being built, since it describes what Bay 03 receives, not what Bay 03 does with it.

When Bay 03 is actually built, expect to find at least one place this document assumed wrong — write that down the same way `ConceptAgent.md` Section 11 did for Bay 02, rather than quietly editing this file to match reality and losing the record of what changed and why.
