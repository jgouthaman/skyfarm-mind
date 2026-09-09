# Optimization Agent — Bay 08 Specification

**Agent ID:** `OPTIMIZATION_AGENT`
**Type:** Base Agent (Downstream), fan-in from two parallel upstream bays
**Stage:** 8 of 15
**Branch:** `feature/the-hangar-bay08` → `dev` → `main`
**Spec location:** `reference/the-hangar/OptimizationAgent.md`
**Status:** Planned — not yet built

---

## 1. MVP Scope Decision

The welcome-page diagram and architecture deck describe Bay 08 as running a real
multi-objective search (Optuna / PyGMO / NSGA-II / surrogate models) across a population of
candidate designs to produce a Pareto-optimal set. **That is out of scope for this spec.**
Bay 08 has no design-generation loop back to Bay 02/03/04 in the current pipeline — there is
exactly one CFD result and one structural result per CAD design, not a population of
candidates to search over. Building a real optimizer against a population of one would be
fiction dressed up as optimization.

**Phase 1 (this spec, MVP):** LLM-reasoning-only, same pattern as every prior bay. Claude
reasons over the single CFD result (Bay 06) and single structural result (Bay 07) for one CAD
design and produces:
- normalized objective scores (weight, drag, cost proxy, safety) for the *current* design,
- a qualitative trade-off narrative,
- directional recommendations (e.g. "reducing frontal area would likely improve drag at some
  structural margin cost") — guidance for a human or a future closed-loop iteration, not a new
  geometry,
- an overall optimization score reflecting how close the LLM judges the current design to be
  to a reasonable trade-off point.

No literal Pareto *set* is produced (there is only one candidate). The output field is named
`trade_off_analysis`, not `pareto_set`, specifically so the schema doesn't overclaim what
Phase 1 actually does — same reasoning CFDAgent.md gives for calling its own output "Phase 1 —
mocked, not simulated" rather than dressing it up as a real solve.

**Phase 2 (separate, later spec):** Real multi-objective search (Optuna/PyGMO) across multiple
CAD candidates, which requires either re-running Bays 03/04/06/07 for several configurations or
a closed-loop generate → evaluate → refine cycle. Out of scope here — needs its own spec once
Bay 08 has more than one candidate to search over.

This spec covers **Phase 1 only**.

### Dependency note
Bay 08 reads Bay 06 (CFD, live) and Bay 07 (Structural, live) directly — it does **not** wait on
or read Bay 05 (Simulation Orchestrator, still unbuilt). This mirrors Bay 06/07's own precedent
of not blocking on an unbuilt upstream bay whose output isn't actually needed for their inputs.

---

## 2. Inputs

| Input | Source | Required (Phase 1) |
|---|---|---|
| CFD Result (forces, coefficients, flow description) | Bay 06 — CFD Agent | Yes |
| Structural Result (stress, safety factor, risk flags) | Bay 07 — Structural Agent | Yes |
| Constraints & KPIs | Carried from Mission Spec | Not available (see Known Gap below) |

The user selects one completed CFD analysis (`Hangar_CFDAnalyses`, `status = 'spec_ready'`) and
one completed structural analysis (`Hangar_Structurals`, `status = 'spec_ready'`). **Both must
trace back to the same `source_cad_design_id`** — optimizing across two different CAD designs'
results makes no sense and is rejected by the gate (§4, OPT-003).

**Known gap (carried forward, not re-litigated):** `vertical`-scoped performance thresholds and
mission-level constraints still don't thread through Bays 02–04 (documented in
`SimulationOrchestratorAgent.md` and repeated in `StructuralAgent.md`'s own constraints note).
Bay 08 has the identical gap — `constraints` is always `null` here too, and
`optimizationGeneration.ts`'s system prompt handles a null constraints object by reasoning
qualitatively and saying so, same degrade-honestly pattern as Bay 07.

**Input schema (from Bay 06, already live):**
```json
{ "cfd_id": "uuid", "forces": { "cl": 0, "cd": 0 }, "coefficients": { "cm": 0 }, "flow_fields": { "description": "string" } }
```

**Input schema (from Bay 07, already live):**
```json
{ "structural_id": "uuid", "stress_results": { "von_mises_max_mpa": 0, "max_displacement_mm": 0, "critical_locations": ["string"] }, "safety_factor": 0.0, "risk_flags": ["string"] }
```

---

## 3. Internal Architecture (Phase 1 — LLM-reasoning)

**3.1 Objective Formulation**
Claude frames the multi-objective trade-off (weight, drag, cost proxy, safety) from the CFD
forces/coefficients and structural stress/safety-factor inputs. No real design-variable mapping
happens (there's only one design) — this step is folded into the single generation call's
prompt, not a separate stage with its own DB row, same reasoning `cfdAnalysisAgentPipeline.ts`
and `structuralAgentPipeline.ts` give for their own single-call stages.

**3.2 Optimization Execution (reasoning only)**
No real search algorithm runs. Claude reasons about where the current design sits relative to
typical trade-off curves for the vehicle class and produces directional "what-if" guidance.

**3.3 Output Generation**
Structured objective scores, trade-off narrative, directional recommendations, and an overall
optimization score — grounded in the two upstream results, no invented figures.

**3.4 Output Interface**
Structured JSON — Validation Agent (Bay 09). Same `source_was_mock` badge convention as every
prior bay.

---

## 4. Gate (Deterministic, Pre-Generation)

Mirrors `cfdAnalysisRules.ts` / `structuralRules.ts`'s exact pattern (flat rule table + evaluate
function, no DB), run before any LLM call:

| ID | Trigger | Reason |
|---|---|---|
| OPT-001 | Structural `safety_factor` is null or ≤ 0 | No valid structural result to optimize against |
| OPT-002 | CFD `forces.cd` (drag coefficient) is ≤ 0 | No physically valid CFD result to optimize against |
| OPT-003 | CFD analysis and structural analysis reference different `source_cad_design_id` | Can't jointly optimize results from two different CAD designs |

---

## 5. Outputs (Consumed By)

- Validation Agent (Bay 09) — not yet built
- Design Studio Dashboard (human review)
- All downstream agents

**Stored in:** `Hangar_Optimizations` (parent), `Hangar_Optimization_specs` (versioned results),
`Hangar_Optimization_runs` (per-stage audit trail). Follows the classic parent/specs/runs split
(Bay 02/03/04/05/07's convention), not CFD's simplified combined-row shape — Bay 08's output
benefits from versioning (re-running optimization reasoning after either upstream result
changes should produce a new version, same as Structural's own re-run story), so this spec
resolves in favor of the majority convention rather than Bay 06's one-off simplification.

---

## 6. Tools (Phase 1)

- LLM — direct Anthropic Claude API (no gateway), via the existing `llmGateway.ts` helper
- Rules Engine (gate checks, §4)
- Knowledge Graph / Document Parser — reused from the existing intelligence layer if present

**Deferred to Phase 2:** Optuna, PyGMO, NSGA-II, surrogate models (the welcome-page diagram's
aspirational tool list — same treatment as CFD's deferred OpenFOAM/SU2/Fluent).

---

## 7. Data Stores (Read/Write)

| Store | Access | Contents |
|---|---|---|
| `Hangar_Optimizations` | Write | Parent record — status, confidence_score, source_cfd_analysis_id, source_structural_id |
| `Hangar_Optimization_specs` | Write | Versioned results — objective_scores, trade_off_analysis, recommended_adjustments, overall_optimization_score |
| `Hangar_Optimization_runs` | Write | Per-stage audit trail — input/output snapshots, status, duration |
| `Hangar_CFDAnalyses` | Read | Forces, coefficients, flow fields (Bay 06 output) |
| `Hangar_Structurals` + `Hangar_Structural_specs` via `getSpecsForStructurals` | Read | Stress results, safety factor, risk flags (Bay 07 output — reuse existing reader, no new RPC) |
| `Hangar_AuditLogs` | Write | Agent runs, decisions, traces |

`assertOptimizationOwnership` is defined locally/unexported in `optimizationAgentPipeline.ts` —
no downstream bay (Bay 09 doesn't exist yet) consumes it, matching every prior bay's own
export-only-when-needed rule.

---

## 8. Interface Spec (I/O Contract)

**Generation input:**
```json
{
  "cfdForces": { "cl": 0, "cd": 0 },
  "cfdCoefficients": { "cm": 0 },
  "structuralStress": { "von_mises_max_mpa": 0, "max_displacement_mm": 0 },
  "safetyFactor": 0.0,
  "riskFlags": ["string"],
  "constraints": null
}
```

**Generation output (proposed):**
```json
{
  "objective_scores": { "weight": 0.0, "drag": 0.0, "cost": 0.0, "safety": 0.0 },
  "trade_off_analysis": "string",
  "recommended_adjustments": [
    { "parameter": "string", "direction": "increase | decrease", "rationale": "string" }
  ],
  "overall_optimization_score": 0.0,
  "risk_flags": ["string"],
  "confidence_score": 0.0,
  "reasoning_summary": "string",
  "source_was_mock": false
}
```

**Persisted record** (pipeline layer adds ids before writing — parent row in
`Hangar_Optimizations`, versioned result in `Hangar_Optimization_specs`, per-stage audit entries
in `Hangar_Optimization_runs`):
```json
{
  "optimization_id": "uuid",
  "source_cfd_analysis_id": "uuid",
  "source_structural_id": "uuid",
  "...generation output fields above": "..."
}
```

---

## 9. UI

- New route `/the-hangar/optimization`, mirroring `/the-hangar/cfd-analysis` and
  `/the-hangar/structural`'s conventions exactly
- `source_was_mock` badge in: result view, list row, detail view
- Selector UI needs two pickers (a completed CFD analysis, a completed structural analysis),
  not one — first bay in the pipeline that fans in from two upstream sources instead of one

---

## 10. Tech Stack
LangChain/LangGraph (orchestration, aspirational) · Direct Anthropic Claude API (LLM) ·
Supabase Postgres + pgvector (data & vector store) · TanStack Start API route

---

## 11. Implementation Notes

- Files to build, mirroring Bay 07's naming: `optimizationRules.ts`, `optimizationGeneration.ts`,
  `optimizationPersistence.ts`, `optimizationAgentPipeline.ts`
- Tables: `Hangar_Optimizations` (parent) / `Hangar_Optimization_specs` (versioned,
  `unique(optimization_id, version)`) / `Hangar_Optimization_runs` (per-stage audit trail) —
  mirrors Bay 07's migration structure field-for-field, not Bay 06's simplified shape (§5)
- `get_next_optimization_spec_version` RPC for version numbering, matching
  `get_next_structural_spec_version`
- Reads Bay 06 output via a new `getCFDAnalysis` call (already exported from
  `cfdAnalysisPersistence.ts`) and Bay 07 output via the existing `getSpecsForStructurals`
  (already exported from `structuralPersistence.ts`) — no new RPCs needed on either upstream
  bay's schema
- RPC conventions: `LANGUAGE sql`, `STABLE`, `SET search_path = ''`
- Ownership pattern: add `assertOptimizationOwnership` (local/unexported) in
  `optimizationAgentPipeline.ts`, alongside the existing `assertCFDAnalysisOwnership`-equivalent
  pattern (note: Bay 06's own ownership check is local/unexported too — Bay 08 reads
  `Hangar_CFDAnalyses`/`Hangar_Structurals` directly via each bay's own persistence-layer getter,
  not through their ownership-assert functions, since Bay 08's user already owns the analysis by
  virtue of it appearing in their own "your CFD analyses" / "your structural analyses" list —
  same reasoning `structuralAgentPipeline.ts` gives for reusing `getLatestCADDesignSpec` instead
  of re-deriving ownership through Bay 04)
- `supabaseAdmin` used throughout pipeline persistence
- `source_was_mock` computed honestly: `true` if either upstream result was itself
  `source_was_mock`, OR if this bay's own LLM call fell back to mock — same OR-composition
  `structuralAgentPipeline.ts` already uses for its own `finalSourceWasMock`
- `.limit(1)` not `.single()` on Supabase queries
- Avoid `createServerFn` — plain async functions throughout, per the standing Bay 04/05
  incident and Bay 06/07's confirmed intentional pattern for every bay since
- Branch flow: `feature/the-hangar-bay08` → `dev` → `main`
- Commit this spec doc to `reference/the-hangar/OptimizationAgent.md` before scaffolding

## Open Questions (resolve before/during scaffolding)
- Should `recommended_adjustments` ever feed back into a re-run of Bay 03/04 automatically, or
  is it always advisory-only for a human to act on manually in this MVP? (Same
  gate-then-score-vs-advisory-only shape of open question Bay 05/07 carried forward for their
  own risk flags — resolving it here doesn't need to block scaffolding.)
- UI surface: dedicated Hangar bay view (matching Bay 06/07's own `/the-hangar/*` routes) —
  confirmed as the default per §9, but flag if Design Studio integration is wanted instead
- Whether OPT-001/OPT-002 should be gate-then-score eliminations (as written) or advisory-only
  flags, same unresolved shape as every prior bay's own risk-flag question
