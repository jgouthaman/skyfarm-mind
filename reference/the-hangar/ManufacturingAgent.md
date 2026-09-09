# Bay 11 — Manufacturing Agent

## Overview

**Agent ID:** `MANUFACTURING_AGENT`
**Type:** Base Agent (Downstream)
**Stage:** 11 of 15
**Purpose:** AI Agent for Manufacturability Assessment, Build Planning & Bill of Materials Generation

The Manufacturing Agent takes a validated design result from Bay 09 and assesses manufacturability — a DFM (design-for-manufacture) review, a build plan, and a bill of materials. It is a **sibling** of Bays 10, 12, and 13, not a link in a chain: all four fan in from Bay 09 independently.

**Fan-in:** Single upstream source (Bay 09 only), same single-source pattern Bay 09 itself uses against Bay 08.

## Phase 1 scope (this build)

- LLM-reasoning only — no real DFM rule engine or cost-modeling integration yet.
- `source_was_mock` OR-composed from Bay 09's result `source_was_mock` flag, plus this agent's own generation call.
- Manufacturing standards/tolerances reference is a Phase 1 known, disclosed gap — no live source; passed as empty/null and reasoned about qualitatively.

## 1. Inputs to Manufacturing Agent

| Input | Source |
|---|---|
| Validation Verdict & Readiness Score | Bay 09 — Validation Agent (`validation_id`) |
| Non-Conformances | Bay 09's `non_conformances` (manufacturability-relevant flags carried through) |
| CAD Model & BOM | Carried from Bay 04 — CAD Agent (via Bay 08/09 chain) |
| Constraints & KPIs | Carried from Mission Spec (Bay 01) |
| Manufacturing Standards & Tolerances | Known, disclosed Phase 1 gap — no live source; empty/null |

## 11. Manufacturing Agent — Internal Architecture

### 11.1 Manufacturability Review
- **DFM Rule Check** — LLM-reasoned, no real DFM rule engine yet
- **Tolerance Stack-up Review** — fit & assembly checks
- **Process Suitability** — matches process to component geometry/material

### 11.2 Build Planning
- **Assembly Sequencing** — step-by-step build order
- **Tooling & Fixture Identification**
- **Lead-time Estimation** — qualitative, Phase 1 no real cost/schedule models

### 11.3 Output Generation
- **DFM Report** — issue + severity + suggested fix reference
- **Manufacturing Plan** — sequence, tooling, process notes
- **Bill of Materials** — traceable component list

### 11.4 Output Interface
- **Structured Data API** — JSON to Design Studio / downstream consumers
- **UI Dashboard View** — DFM report & BOM preview
- **Event Publish** — to LangGraph/Event Bus

## 12. Outputs (consumed by)
- Design Studio Dashboard
- All Downstream Agents

**Stored in:** `Manufacturing DB` (write), `Knowledge Base` (read)

## 11.5 Tools used by Manufacturing Agent
- LLM (Anthropic Claude — Direct API)
- DFM Rule Engine (Phase 1: LLM-reasoned, not a real rules engine)
- Cost Model (Phase 1: LLM-reasoned, not real cost tables)
- Assembly Sequencer (build order planning)
- Knowledge Graph (aerospace ontology)
- Document Parser (PDF / DOCX specs)

## 11.6 Data stores (read / write)

| Store | Access | Contents |
|---|---|---|
| `Hangar_Manufacturings` / `_specs` / `_runs` | Write | DFM reports, build plans, BOMs (versioned three-table pattern) |
| Validation DB | Read | Verdict, non-conformances, readiness |
| Optimization DB | Read | Pareto sets, recommended configs |
| CAD DB | Read | Model files, versions |
| Projects DB | Read/Write | Project info, history, links |
| Knowledge Base | Read | Standards, best practices |
| Audit / Logs DB | Write | Agent runs, decisions, traces |

## 11.7 Integrations
- Auth Service (User & Roles)
- File Storage (Supabase / S3)
- Event Bus (LangGraph / RabbitMQ)
- Workflow Engine (LangGraph)
- API Gateway (Internal / External)
- Manufacturing Standards Catalog (Phase 1: known, disclosed gap — no live source)

## 14. Observability & Governance
- Logging (inputs, outputs)
- Tracing (LangSmith)
- Evaluation (DFM accuracy / plan feasibility)
- Guardrails (safety constraints)
- Access Control (RBAC)
- Audit Trail (who, when, what)
- Cost Tracking (tokens, API calls)

## Tech Stack (Manufacturing Agent)
- LangChain / LangGraph (orchestration)
- Anthropic Claude API (direct LLM calls)
- Supabase (Postgres + pgvector) — data & vector store
- FastAPI-equivalent route handlers (manufacturing API)

## 15. Interface Spec (I/O Contract)

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
  "manufacturing_id": "uuid",
  "validation_id": "uuid",
  "dfm_report": [...],
  "build_plan": [...],
  "bill_of_materials": [...]
}
```

## Gate logic (Phase 1)

**MFG-001** — Referenced Bay 09 result must be `spec_ready`, not draft/processing/error.

**MFG-002** — Referenced Bay 09 verdict must not be `FAIL`. Never plan manufacturing for a design that has already failed validation outright — `CONDITIONAL` still proceeds.

**MFG-003** — Referenced Bay 09 readiness score must not be null or non-positive.

## File naming convention (matches Bay 09's pattern)

- `reference/the-hangar/ManufacturingAgent.md` (this file)
- `src/lib/the-hangar/manufacturingRules.ts`
- `src/lib/the-hangar/manufacturingGeneration.ts`
- `src/lib/the-hangar/manufacturingPersistence.ts`
- `src/lib/the-hangar/manufacturingAgentPipeline.ts`
- `src/routes/api.hangar.manufacturings.ts`
- `src/routes/api.hangar.process-manufacturing.*.ts`
- `src/routes/the-hangar.manufacturing.tsx`
- `supabase/migrations/<timestamp>_hangar_manufacturing_agent.sql`
