# Bay 12 — Certification Agent

## Overview

**Agent ID:** `CERTIFICATION_AGENT`
**Type:** Base Agent (Downstream)
**Stage:** 12 of 15
**Purpose:** AI Agent for Regulatory Mapping, Compliance Gap Analysis & Certification Checklist Generation

The Certification Agent takes a validated design result from Bay 09 and maps it against applicable regulations and standards, producing a compliance checklist and early gap flags. It is a **sibling** of Bays 10, 11, and 13, not a link in a chain: all four fan in from Bay 09 independently.

**Fan-in:** Single upstream source (Bay 09 only), same single-source pattern Bay 09 itself uses against Bay 08.

**Note on overlap with Bay 09:** Bay 09 already does a Phase-1 compliance pass of its own (`ValidationAgent.md` Section 9.1). Bay 12 is deliberately scoped one level up — it works from Bay 09's compliance matrix and non-conformances as a starting point and produces a formal certification checklist and gap-closure plan, rather than re-deriving compliance from scratch. This keeps the two agents from duplicating the same reasoning.

## Phase 1 scope (this build)

- LLM-reasoning only — no real regulatory clause database or certification-body integration yet, same known gap as Bay 09's own.
- `source_was_mock` OR-composed from Bay 09's result `source_was_mock` flag, plus this agent's own generation call.

## 1. Inputs to Certification Agent

| Input | Source |
|---|---|
| Compliance Matrix & Non-Conformances | Bay 09 — Validation Agent (`validation_id`) |
| Validation Verdict & Readiness Score | Bay 09's own verdict/readiness |
| Constraints & KPIs | Carried from Mission Spec (Bay 01) |
| Applicable Regulations | Known, disclosed Phase 1 gap — no live source; empty/null |

## 12. Certification Agent — Internal Architecture

### 12.1 Regulatory Mapping
- **Standards Enumeration** — which regulatory frameworks apply (FAR/EASA/MIL/ISO)
- **Clause Cross-Reference** — link Bay 09's compliance matrix entries to formal clause IDs
- **Jurisdiction Scoping** — qualitative, Phase 1 no live jurisdiction data

### 12.2 Gap Analysis
- **Gap Closure Planning** — for each Bay 09 non-conformance, a remediation path
- **Severity Re-Ranking** — certification-readiness-weighted, distinct from Bay 09's engineering-weighted severity
- **Precedent Check** — LLM-reasoned, no real precedent database yet

### 12.3 Output Generation
- **Certification Checklist** — item + status + owner-ready description
- **Gap Report** — issue + remediation + estimated effort
- **Certification Readiness Verdict** — separate from Bay 09's own verdict, certification-specific

### 12.4 Output Interface
- **Structured Data API** — JSON to Design Studio / downstream consumers
- **UI Dashboard View** — checklist preview
- **Event Publish** — to LangGraph/Event Bus

## 13. Outputs (consumed by)
- Design Studio Dashboard
- All Downstream Agents

**Stored in:** `Certification DB` (write), `Knowledge Base` (read)

## 12.5 Tools used by Certification Agent
- LLM (Anthropic Claude — Direct API)
- Regulatory Clause Matcher (Phase 1: LLM-reasoned, not a real rules engine)
- Checklist Generator
- Precedent Matcher (Phase 1: LLM-reasoned, not a real precedent database)
- Knowledge Graph (aerospace ontology)
- Document Parser (PDF / DOCX specs)

## 12.6 Data stores (read / write)

| Store | Access | Contents |
|---|---|---|
| `Hangar_Certifications` / `_specs` / `_runs` | Write | Checklists, gap reports (versioned three-table pattern) |
| Validation DB | Read | Compliance matrix, non-conformances, verdict, readiness |
| Optimization DB | Read | Pareto sets, recommended configs |
| Projects DB | Read/Write | Project info, history, links |
| Regulations DB | Read | FAR, EASA, MIL, ISO |
| Knowledge Base | Read | Standards, best practices |
| Audit / Logs DB | Write | Agent runs, decisions, traces |

## 12.7 Integrations
- Auth Service (User & Roles)
- File Storage (Supabase / S3)
- Event Bus (LangGraph / RabbitMQ)
- Workflow Engine (LangGraph)
- API Gateway (Internal / External)
- Document Generator (checklist export)

## 15. Observability & Governance
- Logging (inputs, outputs)
- Tracing (LangSmith)
- Evaluation (checklist completeness / gap accuracy)
- Guardrails (safety constraints)
- Access Control (RBAC)
- Audit Trail (who, when, what)
- Cost Tracking (tokens, API calls)

## Tech Stack (Certification Agent)
- LangChain / LangGraph (orchestration)
- Anthropic Claude API (direct LLM calls)
- Supabase (Postgres + pgvector) — data & vector store
- FastAPI-equivalent route handlers (certification API)

## 16. Interface Spec (I/O Contract)

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
  "certification_id": "uuid",
  "validation_id": "uuid",
  "checklist": [...],
  "gap_report": [...],
  "certification_readiness": "READY | GAPS_OPEN | BLOCKED"
}
```

## Gate logic (Phase 1)

**CERT-001** — Referenced Bay 09 result must be `spec_ready`, not draft/processing/error.

**CERT-002** — Referenced Bay 09 verdict must not be `FAIL`. A hard-failed design has no certification path worth checklisting yet — `CONDITIONAL` still proceeds, since certification review can inform whether the condition is closeable.

**CERT-003** — Referenced Bay 09 readiness score must not be null or non-positive.

## File naming convention (matches Bay 09's pattern)

- `reference/the-hangar/CertificationAgent.md` (this file)
- `src/lib/the-hangar/certificationRules.ts`
- `src/lib/the-hangar/certificationGeneration.ts`
- `src/lib/the-hangar/certificationPersistence.ts`
- `src/lib/the-hangar/certificationAgentPipeline.ts`
- `src/routes/api.hangar.certifications.ts`
- `src/routes/api.hangar.process-certification.*.ts`
- `src/routes/the-hangar.certification.tsx`
- `supabase/migrations/<timestamp>_hangar_certification_agent.sql`
