# Bay 13 — Documentation Agent

## Overview

**Agent ID:** `DOCUMENTATION_AGENT`
**Type:** Base Agent (Downstream)
**Stage:** 13 of 15
**Purpose:** AI Agent for Compiling Final Reports, Drawings Summary & Design Documentation

The Documentation Agent takes a validated design result from Bay 09 and compiles it into a report package — a summary, a structured logic record (SLR), and drawing-reference notes. It is a **sibling** of Bays 10–12, not a link in a chain: all four fan in from Bay 09 independently.

**Fan-in:** Single upstream source (Bay 09 only) for Phase 1. **Scope decision, disclosed:** the welcome-page description ("compiles final reports... from every upstream agent's output") conceptually wants multi-source context spanning the whole pipeline. Phase 1 deliberately keeps this single-source from Bay 09 instead, matching the diagram's actual wiring (`ln-9-13`) and every other Phase-1 bay's single-source-per-build discipline. Richer multi-source compilation (pulling CAD drawings, CFD/structural results, etc. directly) is a disclosed, known gap for a later phase.

## Phase 1 scope (this build)

- LLM-reasoning only — no real template engine or drawing-generation integration yet.
- `source_was_mock` OR-composed from Bay 09's result `source_was_mock` flag, plus this agent's own generation call.
- Multi-source compilation (reading directly from every upstream bay) is a known, disclosed Phase 1 gap — see Fan-in note above.

## 1. Inputs to Documentation Agent

| Input | Source |
|---|---|
| Validation Verdict, Compliance Matrix, Readiness Score | Bay 09 — Validation Agent (`validation_id`) |
| Non-Conformances | Bay 09's `non_conformances` |
| Constraints & KPIs | Carried from Mission Spec (Bay 01) |
| Full Upstream Design Data | Known, disclosed Phase 1 gap — not read directly; summarized only via Bay 09's own result |

## 13. Documentation Agent — Internal Architecture

### 13.1 Content Compilation
- **Summary Assembly** — narrative summary from Bay 09's verdict, compliance matrix, non-conformances
- **Structured Logic Record (SLR) Build** — traceable decision record
- **Drawing Reference Collation** — Phase 1: LLM-reasoned references, no real drawing generation

### 13.2 Report Structuring
- **Section Templating** — Phase 1: LLM-reasoned, no real template engine yet
- **Cross-Reference Linking** — ties report sections back to source `validation_id`
- **Formatting Normalization**

### 13.3 Output Generation
- **Final Report** — narrative + structured sections
- **SLR Export**
- **Documentation Completeness Flags**

### 13.4 Output Interface
- **Structured Data API** — JSON to Design Studio / downstream consumers
- **UI Dashboard View** — report preview
- **Event Publish** — to LangGraph/Event Bus

## 14. Outputs (consumed by)
- Design Studio Dashboard
- All Downstream Agents

**Stored in:** `Documentation DB` (write), `Knowledge Base` (read)

## 13.5 Tools used by Documentation Agent
- LLM (Anthropic Claude — Direct API)
- Template Engine (Phase 1: LLM-reasoned, not a real template engine)
- SLR Builder (structured decision record)
- Knowledge Graph (aerospace ontology)
- Document Parser (PDF / DOCX specs)

## 13.6 Data stores (read / write)

| Store | Access | Contents |
|---|---|---|
| `Hangar_Documentations` / `_specs` / `_runs` | Write | Reports, SLRs (versioned three-table pattern) |
| Validation DB | Read | Verdict, compliance matrix, non-conformances, readiness |
| Optimization DB | Read | Pareto sets, recommended configs |
| Projects DB | Read/Write | Project info, history, links |
| Knowledge Base | Read | Standards, best practices |
| Audit / Logs DB | Write | Agent runs, decisions, traces |

## 13.7 Integrations
- Auth Service (User & Roles)
- File Storage (Supabase / S3)
- Event Bus (LangGraph / RabbitMQ)
- Workflow Engine (LangGraph)
- API Gateway (Internal / External)
- Document Generator (report/SLR export)

## 16. Observability & Governance
- Logging (inputs, outputs)
- Tracing (LangSmith)
- Evaluation (report completeness / traceability)
- Guardrails (safety constraints)
- Access Control (RBAC)
- Audit Trail (who, when, what)
- Cost Tracking (tokens, API calls)

## Tech Stack (Documentation Agent)
- LangChain / LangGraph (orchestration)
- Anthropic Claude API (direct LLM calls)
- Supabase (Postgres + pgvector) — data & vector store
- FastAPI-equivalent route handlers (documentation API)

## 17. Interface Spec (I/O Contract)

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
  "documentation_id": "uuid",
  "validation_id": "uuid",
  "report": "string",
  "slr": [...],
  "completeness_flags": [...]
}
```

## Gate logic (Phase 1)

**DOC-001** — Referenced Bay 09 result must be `spec_ready`, not draft/processing/error.

**DOC-002** — Referenced Bay 09 readiness score must not be null or non-positive. Unlike Materials/Manufacturing/Certification, Documentation does NOT gate on verdict `FAIL` — a failed design still needs a documented record of why it failed, so `FAIL` results are allowed through and the report reflects that outcome honestly.

## File naming convention (matches Bay 09's pattern)

- `reference/the-hangar/DocumentationAgent.md` (this file)
- `src/lib/the-hangar/documentationRules.ts`
- `src/lib/the-hangar/documentationGeneration.ts`
- `src/lib/the-hangar/documentationPersistence.ts`
- `src/lib/the-hangar/documentationAgentPipeline.ts`
- `src/routes/api.hangar.documentations.ts`
- `src/routes/api.hangar.process-documentation.*.ts`
- `src/routes/the-hangar.documentation.tsx`
- `supabase/migrations/<timestamp>_hangar_documentation_agent.sql`
