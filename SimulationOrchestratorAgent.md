# Bay 05 — Simulation Orchestrator Agent

## Status
PLANNED → IN DEVELOPMENT (this doc marks kickoff)

## Position in Pipeline
Bay 04 (CAD Agent) → **Bay 05 (Simulation Orchestrator Agent)** → Bay 06 (Manufacturing Agent), Certification Agent

## Purpose
Given a finalized CAD design (Blueprint.json + CAD outputs from Bay 04), produce a structured simulation
assessment covering flight dynamics, stability, and performance envelope — expressed as if derived from
JSBSim/X-Plane 6-DOF simulation, but generated via direct Claude API reasoning over the design parameters
and physics domain knowledge (no real simulation engine call in MVP). This mirrors the Bay 04 CAD Agent
pattern: FreeCAD/OpenSCAD were conceptual analogues there; JSBSim/X-Plane are conceptual analogues here.

**Framing discipline:** TorqWings is "an aerospace design engine that uses an LLM as one component."
This bay's output must be internally labeled and surfaced as LLM-derived (`source_was_mock`), never
presented to the user as literal simulator output, to preserve that framing.

## Inputs
- `mission_brief` (from Bay 01)
- `concept_output` (from Bay 02)
- `aircraft_design` (from Bay 03)
- `cad_design` (from Bay 04) — geometry, mass properties, structural layout, `Hangar_CADDesigns` row
- `design_rules` relevant to the vertical (gate constraints already applied upstream; this bay does not re-gate)

## Outputs (Simulation Result JSON contract)
```json
{
  "simulation_id": "uuid",
  "cad_design_id": "uuid (FK)",
  "flight_envelope": {
    "max_speed_kmh": number,
    "stall_speed_kmh": number,
    "service_ceiling_m": number,
    "range_km": number,
    "endurance_min": number
  },
  "stability": {
    "longitudinal": "stable | marginal | unstable",
    "lateral": "stable | marginal | unstable",
    "notes": "string"
  },
  "performance_score": number,      // 0-100, feeds confidence signal
  "risk_flags": ["string"],         // e.g. "CG aft of aft limit under full payload"
  "confidence_signal": number,      // 0-1
  "reasoning_summary": "string",
  "source_was_mock": true,          // always true for MVP — no real JSBSim/X-Plane call
  "created_at": "timestamp"
}
```

## Pipeline Steps (mirrors Bay 04 pattern)
1. `simDesignRules.ts` — load vertical-specific performance thresholds (from `design_rules`) to bound
   the LLM's reasoning (e.g. GuardSky loiter time minimums, AgriSky payload-vs-range tradeoffs)
2. `simDesignGeneration.ts` — direct Claude API call: structured prompt with CAD design + design rules →
   structured JSON simulation result (schema above)
3. `simDesignPersistence.ts` — write to `Hangar_SimulationRuns`, `assertSimulationOwnership` check
4. `simDesignAgentPipeline.ts` — orchestrates steps 1–3, matches Bay 01–04 pipeline shape
5. API route (`/api/hangar/bay05/simulate`)
6. UI: simulation result view on `/destud` or Hangar bay UI, surfacing `source_was_mock` badge
   (same 3-location durability pattern as Bay 03+: result view, list row badge, detail view)
7. End-to-end live test against PR preview deployment
8. Merge via `feature/the-hangar-bay05` → `dev` → `main`

## Data Model
New table: `Hangar_SimulationRuns`
- `id` (uuid, pk)
- `cad_design_id` (uuid, fk → `Hangar_CADDesigns`)
- `user_id` (uuid, fk, RLS + `assertSimulationOwnership`)
- `flight_envelope` (jsonb)
- `stability` (jsonb)
- `performance_score` (numeric)
- `risk_flags` (jsonb array)
- `confidence_signal` (numeric)
- `reasoning_summary` (text)
- `source_was_mock` (boolean, default true)
- `created_at` (timestamptz, default now())

Standard patterns applied: `SET search_path = ''`, `supabaseAdmin` in persistence layer, `.limit(1)`
not `.single()`, RLS + `assertSimulationOwnership` at ownership check site.

## Downstream Consumers
- **Bay 06 (Manufacturing Agent)** — reads `performance_score`, `risk_flags` to inform manufacturability notes
- **Certification Agent** — reads full simulation result as part of compliance evidence trail

## Open Questions (resolve before/during scaffolding)
- Exact vertical-specific performance thresholds per `design_rules.vertical` — need source values for
  GuardSky/AgriSky/GeoSky/InfraSky (loiter time, payload-range curves, etc.)
- Whether `risk_flags` should be gate-then-score eligible (i.e., can a severe risk flag block progression
  to Bay 06?) or advisory-only for MVP
- UI surface: new tab on `/destud`, or a dedicated Hangar bay view?

## Out of Scope for MVP
- Real JSBSim/X-Plane engine calls
- Live 6-DOF numerical integration
- Wind tunnel / CFD data ingestion
