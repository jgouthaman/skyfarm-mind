# CFD Agent — Bay 06 Specification

**Agent ID:** `CFD_AGENT`
**Type:** Base Agent (Downstream), Worker-class
**Stage:** 6 of 15
**Branch:** `feature/the-hangar-bay06` → `dev` → `main`
**Spec location:** `reference/the-hangar/CFDAgent.md` (confirmed against real convention — `CADAgent.md`, `SimulationOrchestratorAgent.md` live here, not `docs/`)
**Status:** Planned — not yet built

---

## 1. MVP Scope Decision

Bay 06 is architecturally a **worker agent** (real CFD execution runs off Vercel, per the
hosting table on the master architecture slide), unlike Bays 01–04 which are pure
LLM-reasoning agents. To stay on the established shipping cadence, this spec splits the
work into two phases:

- **Phase 1 (this spec, MVP):** LLM-reasoning-only, same pattern as Bays 01–04.
  Claude produces a structured, plausible CFD result (forces, coefficients, qualitative
  flow description) from the CAD geometry and settings — no real solver runs.
  `source_was_mock: true` on every result, surfaced in the same three UI locations as
  prior bays (result view, list row badge, detail view).
- **Phase 2 (separate, later spec):** Real OpenFOAM/SU2/Fluent execution on dedicated
  workers/HPC, behind a job queue. Out of scope here — needs its own infra spec
  (compute cluster, job dispatch, artifact storage for mesh/result files).

This spec covers **Phase 1 only**.

### Open decision — Bay 05 dependency
Bay 05 (`feature/the-hangar-bay05`) still has the open `createServerFn` bug and isn't
merged. Bay 06's primary input (CAD geometry) comes from Bay 04, which is live — so
Bay 06 does **not** need to wait on Bay 05. The "Job Configuration" input from Bay 05 is
stubbed with a default config object for Phase 1 and wired to the real Bay 05 output
once that bay is fixed and merged. Flag this stub the same way `source_was_mock` flags
mocked LLM output, so it's visible and not silently forgotten.

---

## 2. Inputs

| Input | Source | Required (Phase 1) |
|---|---|---|
| CAD Model Files | Bay 04 — CAD Agent | Yes |
| CFD Settings (solver type, turbulence model) | User input / defaults | Yes |
| Boundary Conditions (inlet/outlet, walls, symmetry) | User input / defaults | Yes |
| Constraints & KPIs | Carried from Mission Spec | Yes |
| Job Configuration | Bay 05 — Simulation Orchestrator | Stubbed (see above) |
| Mesh Templates | Static config, not agent-generated | Optional |

**Input schema (from Bay 04, already live):**
```json
{
  "cad_id": "uuid",
  "geometry_id": "uuid",
  "model_files": { "step": "url", "iges": "url" },
  "bom": [...],
  "mass_kg": ...
}
```

---

## 3. Internal Architecture (Phase 1 — LLM-reasoning)

**3.1 Mesh Generation (reasoning only)**
Claude reasons about a plausible mesh strategy given geometry complexity — no real mesh
file is produced. Output: mesh type recommendation, approximate cell count, quality
notes.

**3.2 Solver Setup & Execution (reasoning only)**
Claude reasons about solver choice (RANS/LES/Euler) given the mission's flight regime,
and produces plausible convergence behavior — no real solve runs.

**3.3 Output Generation**
Claude produces structured force/coefficient estimates (Cl, Cd, Cm) and a qualitative
flow field description, grounded in `design_rules` / `reference_designs` where
available (same defensibility pattern as the Design Studio).

**3.4 Output Interface**
Structured JSON — Optimization Agent (Bay 09). Same `source_was_mock` badge convention
as prior bays.

---

## 4. Outputs (Consumed By)

- Optimization Agent (Bay 09)
- Validation Agent
- All Downstream Agents

---

## 5. Data Stores

Naming follows the real convention confirmed against Bay 04's migration
(`Hangar_CADDesigns` / `Hangar_CADDesign_specs` / `Hangar_CADDesign_runs`):
`Hangar_<Entity>s` (main output), `Hangar_<Entity>_specs` (input config), `Hangar_<Entity>_runs`
(invocation tracking). Entity for this bay: `CFDAnalysis`.

1. `Hangar_CFDAnalyses` — structured CFD output: forces, coefficients, flow summary
2. `Hangar_CFDAnalysis_inputs` — input config: CFD settings, boundary conditions
3. `Hangar_CFDAnalysis_runs` — one row per invocation: input refs, status, `source_was_mock`, timestamps

Migration file: `supabase/migrations/<timestamp>_hangar_cfd_agent.sql`, mirroring
`supabase/migrations/20260831120000_hangar_cad_agent.sql` in structure (RLS policies included).

`assertCFDAnalysisOwnership` is defined in the pipeline file and stays **local /
unexported** — Bay 04's `assertCADDesignOwnership` is only exported because Bay 05
consumes it as a downstream reader. No bay currently consumes Bay 06's ownership check,
so export only if and when a real downstream consumer needs it.

---

## 6. Tools (Phase 1)

- LLM — direct Anthropic Claude API (no gateway)
- Reference Matcher — reused from Design Studio's `referenceMatcher.ts` if applicable to aero configs
- Knowledge Graph / Document Parser — reused from existing intelligence layer if present

**Deferred to Phase 2:** OpenFOAM, SU2, Fluent, Gmsh/snappyHexMesh, ParaView.

---

## 7. Interface Spec (I/O Contract)

**Output schema (Phase 1, proposed):**
```json
{
  "cfd_id": "uuid",
  "cad_id": "uuid",
  "forces": { "cl": ..., "cd": ... },
  "coefficients": { ... },
  "flow_fields": { ... },
  "source_was_mock": true
}
```

---

## 8. UI

- New route consistent with existing bay page conventions (e.g. `/hangar/bay06-cfd`)
- `source_was_mock` badge in: result view, list row, detail view

---

## 9. Bay Closure Checklist (for this spec)

1. ✅ Spec doc (this file) committed to `feature/the-hangar-bay06`
2. ⬜ Claude Code scaffolding — four core TS files + API route + UI page
3. ⬜ Lint / typecheck
4. ⬜ Vercel preview end-to-end click-through
5. ⬜ PR → `dev` → `main`

---

## 10. Resolved during Bay 06 kickoff

- ✅ Spec path: `reference/the-hangar/CFDAgent.md`
- ✅ DB naming: `Hangar_CFDAnalyses` / `Hangar_CFDAnalysis_inputs` / `Hangar_CFDAnalysis_runs`
- ✅ `assertCFDAnalysisOwnership` stays local/unexported (no downstream consumer yet)
- ✅ Bay 05's real output is a flight-envelope/stability assessment, not a "sim plan" —
  irrelevant to Bay 06's input either way, since Bay 06 stubs the Job Configuration
  input as a hardcoded default regardless of Bay 05's actual shape.

## 11. Still to confirm before scaffolding

- [ ] Route path / nav placement for the new UI page (mirror Bay 04's page location)

## 12. Resolved post-scaffold

- Hangar_CFDAnalysis_specs renamed to Hangar_CFDAnalysis_inputs before migration
  applied, to preserve the _specs = output convention used everywhere else.
- createServerFn: Bay 06 deliberately uses plain async functions instead of
  createServerFn, to avoid the 'Server function info not found' bug hit in
  Bay 04/05. This is now the intentional pattern for worker-class bays
  (Bay 07 Structural Agent should follow it too, not re-litigate).
