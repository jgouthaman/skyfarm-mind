# Structural Agent (Bay 07) — Spec

**Agent ID:** `STRUCTURAL_AGENT`
**Type:** Base Agent (Downstream)
**Stage:** 7 of 15
**Status:** Planned — not yet built

## Purpose

AI agent for structural assessment — mesh/material setup, load-case reasoning, and safety-factor
evaluation. Consumes Bay 04's CAD model data (mass properties, geometry validation) and produces
structured structural-assessment data — stress/deformation estimates, safety factors, critical
locations — as JSON. Follows the established Hangar pattern: LLM + rules + structured JSON, no
real FEA solver calls (no CalculiX/Code_Aster/Abaqus integration in this phase, despite the
architecture slide's "tools" list naming them as the conceptual analogue — same convention as
Bay 03's OpenVSP/XFLR5, Bay 04's FreeCAD/OpenSCAD, and Bay 05's JSBSim/X-Plane references).

**Scope note:** the architecture deck (`4.5`/`7.5` "Tools Used") names a real solver stack —
CalculiX, Code_Aster, Gmsh/Salome, ParaView, on a Kubernetes/HPC compute cluster. That is
explicitly out of scope for this bay. Confirmed 2026-09-03: Bay 07 follows the LLM-reasoning-only
MVP convention, matching every bay built so far.

**Input scope note:** the architecture deck's Bay 07 diagram shows a second input, "Job
Configuration (from Bay 05 — Simulation Orchestrator)." Bay 05 is not yet merged and Bay 06 (CFD
Agent) does not exist. Confirmed 2026-09-03: Bay 07 reads Bay 04's CAD output only for this pass;
the Bay 05 input is dropped, not stubbed. Revisit once Bay 05 is merged and its own output shape
is known — do not guess it now (same reasoning `simDesignRules.ts` gave for deferring
`evaluateSimulationValidation`).

## 1. Inputs to Structural Agent

| Input | Source |
|---|---|
| CAD Model Data | From Bay 04 — CAD Agent |
| CAD Design ID | Traceable reference |
| Mass Properties (weight, CG, MOI) | Bay 04 output |
| Geometry Validation (interference/DFM) | Bay 04 output |
| Constraints & KPIs | Carried from Mission Spec |
| Material Properties | Materials DB (aspirational — see §5 gap note) |

## 2. Internal Architecture

### 7.1 Mesh & Material Setup
- **Geometry Cleanup** — defeaturing/surface-repair framed as a reasoning step over Bay 04's
  validation output, not a real mesh operation
- **Material Assignment** — heuristic assignment against a materials reference (rules), not a
  real materials database lookup this pass (see §5 gap note)
- **Load Case Definition** — static/modal/fatigue case selection (LLM + prompt templates over
  mass properties and mission KPIs)

### 7.2 Solver Setup & Execution
- **FE Mesh Generation** — represented as structured metadata (element type, density), not a
  real mesh
- **Boundary Condition Application** — fixtures/constraints reasoning (rules engine)
- **Convergence Monitoring** — represented as a status field, not real solver iteration

### 7.3 Output Generation
- **Stress & Deformation Extraction** — Von Mises stress, displacement estimates (LLM reasoning
  over load cases and mass distribution, not real FEA)
- **Safety Factor Calculation** — vs. material allowables (heuristic/rules)
- **FEA Report** — structured summary, critical locations, narrative explanation for UI display

### 7.4 Output Interface
- Structured Data API (JSON — see §3 for consumers)
- UI Dashboard View (stress contour preview — rendered from structured params, not a real
  contour plot)
- Event Publish (to LangGraph/Event Bus)

## 3. Outputs (Consumed By)

The architecture deck lists Optimization Agent (Bay 09) and a Validation Agent as consumers.
Neither is built or specced yet (Bay 08 is also unspecced — the deck's own numbering skips
straight from Bay 07 to Bay 09 here). Carried forward as aspirational, same treatment
`SimulationOrchestratorAgent.md` gave Bay 06/Manufacturing Agent before Bay 06 existed.

- Optimization Agent (Bay 09) — not yet built
- Validation Agent — not yet built
- All downstream agents

**Stored in:** `Hangar_Structurals` (parent), `Hangar_Structural_specs` (versioned results),
`Hangar_Structural_runs` (per-stage audit trail), Knowledge Base. No `Hangar_Projects` table —
confirmed absent from the codebase (no tracked migration, no reference anywhere), same gap
`cadDesignPersistence.ts` already documents; not written here either.

## 4. Tools Used
- LLM (direct Claude API — GPT-4o/Claude/Llama labels on the architecture slide are illustrative;
  actual implementation uses direct Anthropic Claude API only, per standing architecture rule)
- Rules Engine (material assignment, safety-factor checks against allowables)
- Structural Estimator (stress/deformation — heuristic, not a real solver)
- Knowledge Graph (aerospace ontology)
- Document Parser (PDF/DOCX specs)

## 5. Data Stores (Read/Write)

| Store | Access | Contents |
|---|---|---|
| `Hangar_Structurals` | Write | Parent record — status, confidence_score, source_cad_design_id |
| `Hangar_Structural_specs` | Write | Versioned results — stress_results, safety_factor, critical_locations |
| `Hangar_Structural_runs` | Write | Per-stage audit trail — input/output snapshots, status, duration |
| `Hangar_CADDesigns` via `get_latest_cad_design_spec` RPC | Read | CAD params, mass properties (Bay 04 output — same RPC Bay 05 already reads) |
| Materials DB | Read | **Gap** — no such table exists in the codebase yet (confirmed: no tracked migration, no reference). The deck's `7.6` names it; not invented here. Material allowables must be hardcoded/approximated in `structuralRules.ts` until a real table exists — flag honestly in code comments, per `simDesignRules.ts`'s precedent for undocumented gaps. |
| Regulations DB | Read | FAR, EASA, MIL, ISO (aspirational — not built, same as every prior bay) |
| Knowledge Base | Read | Standards, best practices (aspirational) |
| `Hangar_AuditLogs` | Write | Agent runs, decisions, traces |

## 6. Integrations
Auth Service, File Storage (Supabase/S3), Event Bus (LangGraph), Workflow Engine (LangGraph),
API Gateway, Version Control (Git) — same as Bay 01–05. The deck's `7.7` also lists "Compute
Cluster (Kubernetes/HPC)" — dropped, since it only applies to the real-solver path this spec
explicitly excludes (§ Purpose).

## 7. Interface Spec (I/O Contract)

Note on id fields: `structural_id`/`cad_id` are assembled by `structuralAgentPipeline.ts`, not by
`structuralGeneration.ts` itself — matching the precedent set by `simDesignGeneration.ts` and
`cadDesignGeneration.ts`, neither of which threads its own entity id through the generation
function.

**Generation input (from Bay 04's CAD output — mass properties + validation only, per Input
scope note above):**
```json
{
  "mass_properties": { "weight_kg": 0, "cg": { "x": 0, "y": 0, "z": 0 } },
  "validation": { "interference_clear": true, "dfm_flags": [] },
  "constraints": { "max_load_factor": null, "material_class": null }
}
```

**Generation output (proposed):**
```json
{
  "mesh_material": {
    "element_type": "string",
    "material_assigned": "string",
    "modulus_gpa": 0,
    "yield_strength_mpa": 0
  },
  "load_cases": [
    { "case": "static | modal | fatigue", "description": "string" }
  ],
  "stress_results": {
    "von_mises_max_mpa": 0,
    "max_displacement_mm": 0,
    "critical_locations": ["string"]
  },
  "safety_factor": 0.0,
  "convergence_status": "converged | not_converged | not_applicable",
  "risk_flags": ["string"],
  "confidence_score": 0.0,
  "reasoning_summary": "string",
  "source_was_mock": false
}
```

**Persisted record (pipeline layer adds ids before writing — parent row in
`Hangar_Structurals`, versioned result in `Hangar_Structural_specs`, per-stage audit entries in
`Hangar_Structural_runs`):**
```json
{
  "structural_id": "uuid",
  "cad_id": "uuid",
  "...generation output fields above": "..."
}
```

## 8. Tech Stack
LangChain/LangGraph (orchestration) · Direct Anthropic Claude API (LLM) · Supabase Postgres +
pgvector (data & vector store) · FastAPI-equivalent route (TanStack Start API route)

## Implementation Notes (carry forward from Bay 01–05)

- Files to build, mirroring Bay 05's naming: `structuralRules.ts`, `structuralGeneration.ts`,
  `structuralPersistence.ts`, `structuralAgentPipeline.ts`
- Tables: `Hangar_Structurals` (parent) / `Hangar_Structural_specs` (versioned,
  `unique(structural_id, version)`) / `Hangar_Structural_runs` (per-stage audit trail) — mirrors
  Bay 04/05's parent/specs/runs split exactly, not a flat table
- `get_next_structural_spec_version` RPC for version numbering, matching
  `get_next_simulation_spec_version`
- Reads Bay 04 output via the existing `get_latest_cad_design_spec` RPC — no new RPC needed on
  Bay 04's schema for this bay's benefit
- RPC conventions: `LANGUAGE sql`, `STABLE`, `SET search_path = ''`, not `SECURITY DEFINER`
  unless it needs to bypass RLS for a client-callable function
- Ownership pattern: add `assertStructuralOwnership`, called at all relevant call sites,
  alongside existing `assertSimulationOwnership`
- `supabaseAdmin` used throughout pipeline persistence (RLS inert but retained as
  defense-in-depth)
- `source_was_mock` set honestly on both sides of the pipeline, surfaced durably (result view,
  list row badge, past-design detail) — same as Bay 03/04/05, not transient like Bay 02
- `.limit(1)` not `.single()` on Supabase queries
- Branch flow: `feature/the-hangar-bay07` → `dev` → `main`
- Verify this spec doc lands at `reference/the-hangar/StructuralAgent.md` before the PR (see:
  `AircraftDesignAgent.md` incident, and Bay 05's own repo-root-vs-`reference/the-hangar/`
  mislocation)

## Open Questions (resolve before/during scaffolding)
- Real material allowables source — hardcoded table in `structuralRules.ts` for MVP, or is a
  `Materials DB` table planned soon enough to design around now?
- Whether `risk_flags` (e.g. safety_factor below allowable) should be gate-then-score eligible
  (block progression to Bay 09) or advisory-only for MVP — same open question Bay 05 carried
  forward unresolved for its own `risk_flags`
- UI surface: new tab on `/destud`, or a dedicated Hangar bay view? (same open question as Bay 05)
- When Bay 05 merges and its output shape is known: does Bay 07 gain a second real input (job
  configuration / simulation results), and does that change the safety-factor reasoning?
