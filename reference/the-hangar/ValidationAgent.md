# Bay 09 — Validation Agent

## Overview

**Agent ID:** `VALIDATION_AGENT`
**Type:** Base Agent (Downstream)
**Stage:** 9 of 15
**Purpose:** AI Agent for Design Verification, Regulatory Compliance Checking & Certification Readiness Assessment

The Validation Agent takes a completed Optimization Agent result (Bay 08) and checks it against regulatory standards (FAR / EASA / MIL / ISO), mission constraints, and structural/CAD carry-through data. It produces a pass/fail/conditional verdict, a list of non-conformances, and a weighted certification readiness score.

**Fan-in:** Single upstream source (Bay 08 only) — unlike Bay 08, which fans in from two sources (Bay 06 + Bay 07). This means a single-picker UI, not a two-picker, and no cross-source lineage gate beyond tracing `optimization_id` back to its `source_cad_design_id`.

## Phase 1 scope (this build)

- LLM-reasoning only — no real rules-engine or certification-database integration. Matches the Bay 08 precedent (LLM-reasoning only, no real Optuna/PyGMO search).
- `source_was_mock` OR-composed from: Bay 08's result `source_was_mock` flag, plus this agent's own generation call.
- Output field names avoid overclaiming precision the system doesn't have — e.g. `readiness_score` is a weighted heuristic, not a certified compliance calculation.

## 1. Inputs to Validation Agent

| Input | Source |
|---|---|
| Optimized Design Set | Bay 08 — Optimization Agent (`optimization_id`) |
| Recommended Configuration | Bay 08's `recommended_config` (ranked Pareto-optimal design) |
| Structural Safety Margins | Carried from Bay 07 — Structural Agent |
| Constraints & KPIs | Carried from Mission Spec (Bay 01) |
| CAD Model & BOM | Bay 04 — CAD Agent |
| Validation Checklists | Certification rule templates (static reference data) |

## 9. Validation Agent — Internal Architecture

### 9.1 Compliance Checking
- **Standards Mapping** — match design parameters against FAR / EASA / MIL / ISO clauses
- **Requirement Traceability** — link each Mission KPI to the design element that satisfies it
- **Regulatory Gap Detection** — flag missing or failed clauses

### 9.2 Validation Execution
- **Cross-Domain Consistency Check** — CFD + FEA + CAD results all trace to the same design lineage
- **Safety Margin Verification** — structural/aero margins checked against certification thresholds
- **Test Case Simulation** — LLM-reasoned virtual qualification runs (Phase 1: no real simulation)

### 9.3 Output Generation
- **Validation Verdict** — `PASS` / `FAIL` / `CONDITIONAL`
- **Non-Conformance Report** — issue + severity + suggested fix reference, per finding
- **Certification Readiness Score** — weighted compliance index (0–100)

### 9.4 Output Interface
- **Structured Data API** — JSON to Bay 10 (next agent, not yet defined)
- **UI Dashboard View** — compliance matrix preview
- **Event Publish** — to LangGraph/Event Bus

## 10. Outputs (consumed by)
- Next Agent (Bay 10 — planned, not yet scoped)
- Design Studio Dashboard
- All Downstream Agents

**Stored in:** `Validation DB` (write), `Compliance DB` (write), `Knowledge Base` (read)

## 9.5 Tools used by Validation Agent
- LLM (Anthropic Claude — Direct API)
- Compliance Rule Engine (regulatory clause matching — Phase 1: LLM-reasoned, not a real rules engine)
- Requirements Tracer (traceability matrix builder)
- Simulation Cross-Checker (CFD / FEA / CAD consistency)
- Certification Scorer (weighted readiness index)
- Knowledge Graph (aerospace ontology)
- Document Parser (PDF / DOCX specs)

## 9.6 Data stores (read / write)

| Store | Access | Contents |
|---|---|---|
| `Hangar_Validations` / `_specs` / `_runs` | Write | Verdicts, non-conformance reports (versioned three-table pattern, matching Bay 07/08's shape) |
| Optimization DB | Read | Pareto sets, recommended configs |
| CAD DB | Read | Model files, versions |
| Projects DB | Read/Write | Project info, history, links |
| Regulations DB | Read | FAR, EASA, MIL, ISO |
| Knowledge Base | Read | Standards, best practices |
| Audit / Logs DB | Write | Agent runs, decisions, traces |

## 9.7 Integrations
- Auth Service (User & Roles)
- File Storage (Supabase / S3)
- Event Bus (LangGraph / RabbitMQ)
- Workflow Engine (LangGraph)
- API Gateway (Internal / External)
- Document Generator (compliance report export)

## 12. Observability & Governance
- Logging (inputs, outputs)
- Tracing (LangSmith)
- Evaluation (compliance accuracy / false-negative rate)
- Guardrails (safety constraints)
- Access Control (RBAC)
- Audit Trail (who, when, what)
- Cost Tracking (tokens, API calls)

## Tech Stack (Validation Agent)
- LangChain / LangGraph (orchestration)
- Anthropic Claude API (direct LLM calls)
- Supabase (Postgres + pgvector) — data & vector store
- FastAPI-equivalent route handlers (validation API)

## 13. Interface Spec (I/O Contract)

**Input schema** (from Bay 08, matches Bay 08's output schema exactly):

```json
{
  "optimization_id": "uuid",
  "cad_id": "uuid",
  "pareto_set": [...],
  "recommended_config": {...},
  "sensitivity": {...}
}
```

**Output schema** (proposed, not yet built):

```json
{
  "validation_id": "uuid",
  "optimization_id": "uuid",
  "verdict": "PASS | FAIL | CONDITIONAL",
  "non_conformances": [...],
  "readiness_score": ...
}
```

## Gate logic (Phase 1)

**VAL-001** — Input `optimization_id` must trace back to the same `source_cad_design_id` chain as the referenced Bay 08 result. Mirrors Bay 08's `OPT-003` two-source lineage check, adapted for a single-source fan-in.

## File naming convention (matches Bay 07/08 pattern)

- `reference/the-hangar/ValidationAgent.md` (this file)
- `src/lib/the-hangar/validationRules.ts`
- `src/lib/the-hangar/validationGeneration.ts`
- `src/lib/the-hangar/validationPersistence.ts`
- `src/lib/the-hangar/validationAgentPipeline.ts`
- `src/routes/api.hangar.validations.ts`
- `src/routes/api.hangar.process-validation.*.ts`
- `src/routes/the-hangar.validation.tsx`
- `supabase/migrations/<timestamp>_hangar_validation_agent.sql`
