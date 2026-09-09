# Bay 10 — Materials Agent

## Overview

**Agent ID:** `MATERIALS_AGENT`
**Type:** Base Agent (Downstream)
**Stage:** 10 of 15
**Purpose:** AI Agent for Material Selection, Property Matching & Sourcing Justification

The Materials Agent takes a validated design result from Bay 09 and recommends materials per component — matched against structural and environmental requirements, with a ranked justification and sourcing risk flags. It is a **sibling** of Bays 11–13, not a link in a chain: all four fan in from Bay 09 independently (matches the welcome-page diagram's `ln-9-10`..`ln-9-13` edges, which all originate from Bay 09, not from each other).

**Fan-in:** Single upstream source (Bay 09 only), same single-source pattern Bay 09 itself uses against Bay 08.

## Phase 1 scope (this build)

- LLM-reasoning only — no real materials database, supplier catalog, or property-simulation integration yet. Matches every prior bay's Phase 1 precedent.
- `source_was_mock` OR-composed from Bay 09's result `source_was_mock` flag, plus this agent's own generation call.
- Operating environment and material catalog are Phase 1 known, disclosed gaps — no live source exists anywhere upstream yet; passed as empty/null and reasoned about qualitatively, same pattern as Bay 09's own `applicableStandards` gap.

## 1. Inputs to Materials Agent

| Input | Source |
|---|---|
| Validation Verdict & Readiness Score | Bay 09 — Validation Agent (`validation_id`) |
| Non-Conformances | Bay 09's `non_conformances` (material-relevant flags carried through) |
| Structural Safety Margins | Carried from Bay 07 — Structural Agent (via Bay 08/09 chain) |
| Constraints & KPIs | Carried from Mission Spec (Bay 01) |
| Operating Environment | Known, disclosed Phase 1 gap — no live source; empty/null |
| Material Catalog Reference | Known, disclosed Phase 1 gap — no live source; empty/null |

## 10. Materials Agent — Internal Architecture

### 10.1 Requirement Mapping
- **Property Target Derivation** — strength, weight, cost, environmental resistance targets
- **Constraint Aggregation** — structural + mission bounds
- **Component Classification** — airframe / propulsion / payload

### 10.2 Material Selection
- **Candidate Matching** — LLM-reasoned, no real materials DB/RAG yet
- **Trade-off Scoring** — weighted cost/strength/availability
- **Substitution Check** — alternate material ranking

### 10.3 Output Generation
- **Material Recommendations** — per-component, ranked
- **Selection Rationale** — justification narrative
- **Sourcing Risk Flags**

### 10.4 Output Interface
- **Structured Data API** — JSON to Design Studio / downstream consumers
- **UI Dashboard View** — material selection preview
- **Event Publish** — to LangGraph/Event Bus

## 11. Outputs (consumed by)
- Design Studio Dashboard
- All Downstream Agents

**Stored in:** `Materials DB` (write), `Knowledge Base` (read)

## 10.5 Tools used by Materials Agent
- LLM (Anthropic Claude — Direct API)
- Material Matcher (Phase 1: LLM-reasoned, not real pgvector similarity)
- Property Calculator (strength/weight/cost scoring)
- Substitution Engine (alternate ranking)
- Knowledge Graph (aerospace ontology)
- Document Parser (PDF / DOCX specs)

## 10.6 Data stores (read / write)

| Store | Access | Contents |
|---|---|---|
| `Hangar_Materials` / `_specs` / `_runs` | Write | Recommendations, justifications (versioned three-table pattern) |
| Validation DB | Read | Verdict, non-conformances, readiness |
| Optimization DB | Read | Pareto sets, recommended configs |
| Projects DB | Read/Write | Project info, history, links |
| Regulations DB | Read | FAR, EASA, MIL, ISO (materials-relevant clauses) |
| Knowledge Base | Read | Standards, best practices |
| Audit / Logs DB | Write | Agent runs, decisions, traces |

## 10.7 Integrations
- Auth Service (User & Roles)
- File Storage (Supabase / S3)
- Event Bus (LangGraph / RabbitMQ)
- Workflow Engine (LangGraph)
- API Gateway (Internal / External)
- Materials Supplier Catalog (Phase 1: known, disclosed gap — no live source)

## 13. Observability & Governance
- Logging (inputs, outputs)
- Tracing (LangSmith)
- Evaluation (recommendation accuracy / justification quality)
- Guardrails (safety constraints)
- Access Control (RBAC)
- Audit Trail (who, when, what)
- Cost Tracking (tokens, API calls)

## Tech Stack (Materials Agent)
- LangChain / LangGraph (orchestration)
- Anthropic Claude API (direct LLM calls)
- Supabase (Postgres + pgvector) — data & vector store
- FastAPI-equivalent route handlers (materials API)

## 14. Interface Spec (I/O Contract)

**Input schema** (from Bay 09, matches Bay 09's output schema exactly):

```json
{
  "validation_id": "uuid",
  "optimization_id": "uuid",
  "verdict": "PASS | FAIL | CONDITIONAL",
  "non_conformances": [...],
  "readiness_score": ...
}
```

**Output schema** (proposed, not yet built):

```json
{
  "materials_id": "uuid",
  "validation_id": "uuid",
  "recommendations": [...],
  "rationale": "string",
  "sourcing_risk_flags": [...]
}
```

## Gate logic (Phase 1)

**MAT-001** — Referenced Bay 09 result must be `spec_ready`, not draft/processing/error. Same single-source-completion pattern as Bay 09's own `VAL-002`.

**MAT-002** — Referenced Bay 09 verdict must not be `FAIL`. Never select materials for a design that has already failed validation outright — `CONDITIONAL` still proceeds (materials selection can inform whether the condition is fixable), only a hard `FAIL` gates.

**MAT-003** — Referenced Bay 09 readiness score must not be null or non-positive. Same "nothing valid to build on" pattern as Bay 09's own `VAL-001`.

## File naming convention (matches Bay 09's pattern)

- `reference/the-hangar/MaterialsAgent.md` (this file)
- `src/lib/the-hangar/materialsRules.ts`
- `src/lib/the-hangar/materialsGeneration.ts`
- `src/lib/the-hangar/materialsPersistence.ts`
- `src/lib/the-hangar/materialsAgentPipeline.ts`
- `src/routes/api.hangar.materials.ts`
- `src/routes/api.hangar.process-materials.*.ts`
- `src/routes/the-hangar.materials.tsx`
- `supabase/migrations/<timestamp>_hangar_materials_agent.sql`
