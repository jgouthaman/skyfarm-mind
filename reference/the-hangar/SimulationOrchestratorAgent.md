# Simulation Orchestrator Agent (Bay 05) — Spec

**Agent ID:** `SIMULATION_ORCHESTRATOR_AGENT`
**Type:** Base Agent (Downstream)
**Stage:** 5 of 15
**Status:** Planned — not yet built

## Purpose

AI agent for flight simulation assessment, stability analysis, and performance envelope generation. Consumes Bay 04's CAD model data (geometry, mass properties, structural layout) and produces structured simulation result data — flight envelope, stability classification, risk flags — as JSON. Follows the established Hangar pattern: LLM + rules + structured JSON, no real physics/simulation engine calls (no JSBSim/X-Plane integration in this phase, despite the pattern's "tools" list naming them as the conceptual analogue — same convention as Bay 03's OpenVSP/XFLR5 and Bay 04's FreeCAD/OpenSCAD references).

## 1. Inputs to Simulation Orchestrator Agent

| Input | Source |
|---|---|
| CAD Model Data | From Bay 04 — CAD Agent |
| CAD Design ID | Traceable reference |
| Mass Properties (weight, CG, MOI) | Bay 04 output |
| Mission KPIs (range, endurance, payload) | Carried from Mission Spec |
| Vertical-Specific Performance Thresholds | `design_rules` (loiter time, payload-range curves, etc.) |
| Regulatory Performance Constraints | Regulations DB (FAR/EASA/MIL/ISO) |

## 2. Internal Architecture

### 5.1 Flight Dynamics Assessment
- **Flight Envelope Estimation** — max speed, stall speed, service ceiling, range, endurance (LLM + prompt templates over mass/geometry params)
- **Performance Scoring** — 0–100 composite score feeding confidence signal (heuristic/rules)

### 5.2 Stability Analysis
- **Longitudinal/Lateral Stability Classification** — stable/marginal/unstable (rules engine over CG, control surface, mass distribution — not real 6-DOF integration)
- **Risk Flagging** — e.g. CG aft of aft limit under full payload, insufficient control authority

### 5.3 Output Generation
- **Simulation Result Record** — structured params representing a simulation run (not real JSBSim/X-Plane output)
- **Reasoning Summary** — narrative explanation of the assessment for UI display

### 5.4 Output Interface
- Structured Data API (JSON to Manufacturing Agent — Bay 06, and Certification Agent)
- UI Dashboard View (flight envelope + stability summary — rendered from structured params, not real simulation traces)
- Event Publish (to LangGraph/Event Bus)

## 3. Outputs (Consumed By)
- Manufacturing Agent (Bay 06)
- Certification Agent
- All downstream agents

**Stored in:** `Hangar_Simulations` (parent), `Hangar_Simulation_specs` (versioned results), `Hangar_Simulation_runs` (per-stage audit trail), `Hangar_Projects`, Knowledge Base

## 4. Tools Used
- LLM (direct Claude API — GPT-4o/Claude/Llama labels on the architecture slide are illustrative; actual implementation uses direct Anthropic Claude API only, per standing architecture rule)
- Rules Engine (stability/risk-flag checks against vertical thresholds)
- Performance Estimator (flight envelope — heuristic)
- Knowledge Graph (aerospace ontology)
- Document Parser (PDF/DOCX specs)

## 5. Data Stores (Read/Write)

| Store | Access | Contents |
|---|---|---|
| `Hangar_Simulations` | Write | Parent record — status, confidence_score, source_cad_design_id |
| `Hangar_Simulation_specs` | Write | Versioned results — flight_envelope, stability, risk_flags |
| `Hangar_Simulation_runs` | Write | Per-stage audit trail — input/output snapshots, status, duration |
| `Hangar_CADDesigns` / via `get_latest_cad_design_spec` RPC | Read | CAD params, mass properties (Bay 04 output, added to Bay 04 schema for this bay's benefit) |
| `Hangar_Projects` | Read/Write | Project info, history, links |
| Regulations DB | Read | FAR, EASA, MIL, ISO |
| Knowledge Base | Read | Standards, best practices |
| `Hangar_AuditLogs` | Write | Agent runs, decisions, traces |

## 6. Integrations
Auth Service, File Storage (Supabase/S3), Event Bus (LangGraph), Workflow Engine (LangGraph), API Gateway, Version Control (Git) — same as Bay 01–04.

## 7. Interface Spec (I/O Contract)

Note: id fields (`simulation_id`, `cad_id`) are assembled by `simDesignAgentPipeline.ts`, not
by `simDesignGeneration.ts` itself — matching the precedent set by `cadDesignGeneration.ts` and
`aircraftDesignGeneration.ts`, neither of which threads its own entity id through the generation
function. The schemas below reflect the generation-layer shape actually implemented; the
pipeline layer adds ids on top before persistence. An earlier draft of this doc included
`geometry_id` and id fields at the generation layer — corrected here since Bay 04's real
`Stage1Result` doesn't carry `geometry_id` forward at all, and threading ids through generation
broke from established convention without a real reason to.

**Generation input (from Bay 04's CAD output, mass properties + validation only):**
```json
{
  "mass_properties": { "weight_kg": 0, "cg": { "x": 0, "y": 0, "z": 0 } },
  "validation": { "interference_clear": true, "dfm_flags": [] },
  "thresholds": { "flight_time_min": 0, "payload_range_curve": null, "stability_margin": null }
}
```

**Generation output (proposed):**
```json
{
  "flight_envelope": {
    "max_speed_kmh": 0,
    "stall_speed_kmh": 0,
    "service_ceiling_m": 0,
    "range_km": 0,
    "endurance_min": 0
  },
  "stability": {
    "longitudinal": "stable | marginal | unstable",
    "lateral": "stable | marginal | unstable",
    "notes": "string"
  },
  "performance_score": 0.0,
  "risk_flags": ["string"],
  "confidence_score": 0.0,
  "reasoning_summary": "string",
  "source_was_mock": false
}
```

**Persisted record (pipeline layer adds ids before writing — parent row in `Hangar_Simulations`, versioned result in `Hangar_Simulation_specs`, per-stage audit entries in `Hangar_Simulation_runs`):**
```json
{
  "simulation_id": "uuid",
  "cad_id": "uuid",
  "...generation output fields above": "..."
}
```

## 8. Tech Stack
LangChain/LangGraph (orchestration) · Direct Anthropic Claude API (LLM) · Supabase Postgres + pgvector (data & vector store) · FastAPI-equivalent route (TanStack Start API route)

## Implementation Notes (carry forward from Bay 01–04)

- Files to build, mirroring Bay 04's naming: `simDesignRules.ts`, `simDesignGeneration.ts`, `simDesignPersistence.ts`, `simDesignAgentPipeline.ts`
- Tables: `Hangar_Simulations` (parent) / `Hangar_Simulation_specs` (versioned, `unique(simulation_id, version)`) / `Hangar_Simulation_runs` (per-stage audit trail) — mirrors Bay 04's `Hangar_CADDesigns`/`_specs`/`_runs` split exactly, not a flat table (an earlier flat `Hangar_SimulationRuns` table was created and dropped before this pattern was confirmed)
- `get_next_simulation_spec_version` RPC for version numbering, matching `get_next_cad_design_spec_version`
- Reads Bay 04 output via the new `get_latest_cad_design_spec` RPC, added to Bay 04's schema specifically because Bay 05 is the consumer that RPC was deferred for
- RPC conventions: `LANGUAGE sql`, `STABLE`, `SET search_path = ''`, not `SECURITY DEFINER` unless it needs to bypass RLS for a client-callable function
- Ownership pattern: add `assertSimulationOwnership`, called at all relevant call sites, alongside existing `assertCADDesignOwnership`
- `supabaseAdmin` used throughout pipeline persistence (RLS inert but retained as defense-in-depth)
- `source_was_mock` set honestly on both sides of the pipeline, surfaced durably (result view, list row badge, past-design detail) — same as Bay 03/04, not transient like Bay 02
- `.limit(1)` not `.single()` on Supabase queries
- Branch flow: `feature/the-hangar-bay05` → `dev` → `main`
- Verify this spec doc lands on the correct branch/path before the PR (see: `AircraftDesignAgent.md` incident, and this bay's own repo-root-vs-`reference/the-hangar/` mislocation)

## Open Questions (resolve before/during scaffolding)
- Exact vertical-specific performance thresholds per `design_rules.vertical` — need source values for GuardSky/AgriSky/GeoSky/InfraSky (loiter time, payload-range curves, etc.)
- Whether `risk_flags` should be gate-then-score eligible (can a severe risk flag block progression to Bay 06?) or advisory-only for MVP
- UI surface: new tab on `/destud`, or a dedicated Hangar bay view?
