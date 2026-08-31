\# CAD Agent (Bay 04) — Spec



\*\*Agent ID:\*\* `CAD\_AGENT`

\*\*Type:\*\* Base Agent (Downstream)

\*\*Stage:\*\* 4 of 15

\*\*Status:\*\* Planned — not yet built



\## Purpose



AI agent for CAD model generation, design validation, and manufacturing-ready file output. Consumes Bay 03's aircraft geometry and produces structured CAD model data — parametric build parameters, validation results, drawing/BOM metadata — as JSON. Follows the established Hangar pattern: LLM + rules + structured JSON, no real geometry engine calls (no FreeCAD/OpenSCAD integration in this phase, despite the pattern's "tools" list naming them as the conceptual analogue — same convention as Bay 03's OpenVSP/XFLR5 references).



\## 1. Inputs to CAD Agent



| Input | Source |

|---|---|

| Aircraft Geometry | From Bay 03 — Aircraft Design Agent |

| Geometry Version ID | Traceable reference |

| Component Specs \& Materials | Structural, propulsion, payload |

| Constraints \& KPIs | Carried from Mission Spec |

| Manufacturing Standards | Tolerances, DFM / DFA rules |

| CAD Template Library | Parametric base models |



\## 2. Internal Architecture



\### 4.1 Model Generation

\- \*\*Parametric CAD Build\*\* — from geometry parameters (LLM + prompt templates)

\- \*\*Component Assembly\*\* — airframe, propulsion, payload bay placement

\- \*\*Mass Property Calculation\*\* — CG, MOI, weight breakdown (heuristic/rules)



\### 4.2 Design Validation

\- \*\*Interference Checking\*\* — clash/collision detection (rules engine, not real geometry collision)

\- \*\*Manufacturability Review\*\* — DFM/DFA rule checks

\- \*\*Tolerance Stack-up\*\* — fit \& assembly checks



\### 4.3 Output Generation

\- \*\*CAD Model Files\*\* — structured params representing STEP/IGES/native metadata (not real files)

\- \*\*Drawing Package\*\* — 2D manufacturing drawing metadata

\- \*\*Bill of Materials\*\* — BOM entries with traceable IDs



\### 4.4 Output Interface

\- Structured Data API (JSON to Simulation Orchestrator — Bay 05)

\- UI Dashboard View (3D model preview — rendered from structured params, not real geometry)

\- Event Publish (to LangGraph/Event Bus)



\## 3. Outputs (Consumed By)

\- Simulation Orchestrator (Bay 05)

\- Manufacturing Agent

\- All downstream agents



\*\*Stored in:\*\* `Hangar\_CADDesigns`, `Hangar\_Projects`, Knowledge Base



\## 4. Tools Used

\- LLM (direct Claude API — GPT-4o/Claude/Llama labels on the architecture slide are illustrative; actual implementation uses direct Anthropic Claude API only, per standing architecture rule)

\- Rules Engine (interference/manufacturability checks)

\- Mass Properties Calculator (CG/MOI/weight — heuristic)

\- Drawing Generator (2D technical drawing metadata)

\- Knowledge Graph (aerospace ontology)

\- Document Parser (PDF/DOCX specs)



\## 5. Data Stores (Read/Write)



| Store | Access | Contents |

|---|---|---|

| `Hangar\_CADDesigns` | Write | Model files (metadata), versions |

| `Hangar\_AircraftDesigns` | Read | Aircraft params, versions (Bay 03 output) |

| `Hangar\_Projects` | Read/Write | Project info, history, links |

| Component \& Materials DB | Read | Catalog, specs, costs |

| Regulations DB | Read | FAR, EASA, MIL, ISO |

| Knowledge Base | Read | Standards, best practices |

| `Hangar\_AuditLogs` | Write | Agent runs, decisions, traces |



\## 6. Integrations

Auth Service, File Storage (Supabase/S3), Event Bus (LangGraph), Workflow Engine (LangGraph), API Gateway, Version Control (Git) — same as Bay 01–03.



\## 7. Interface Spec (I/O Contract)



\*\*Input schema (from Bay 03):\*\*

```json

{

&#x20; "geometry\_id": "uuid",

&#x20; "concept\_id": "uuid",

&#x20; "params": { "wingspan": "...", "fuselage\_len": "...", "..." : "..." },

&#x20; "rationale": "string"

}

```



\*\*Output schema (proposed):\*\*

```json

{

&#x20; "cad\_id": "uuid",

&#x20; "geometry\_id": "uuid",

&#x20; "model\_files": { "step": "url", "iges": "url" },

&#x20; "bom": \[ { "part": "string", "qty": 0, "material": "string" } ],

&#x20; "mass\_properties": { "weight\_kg": 0, "cg": { "x": 0, "y": 0, "z": 0 } },

&#x20; "validation": { "interference\_clear": true, "dfm\_flags": \[] },

&#x20; "confidence\_score": 0.0,

&#x20; "source\_was\_mock": false

}

```



\## 8. Tech Stack

LangChain/LangGraph (orchestration) · Direct Anthropic Claude API (LLM) · Supabase Postgres + pgvector (data \& vector store) · FastAPI-equivalent route (TanStack Start API route)



\## Implementation Notes (carry forward from Bay 01–03)



\- Files to build, mirroring Bay 03's naming: `cadDesignRules.ts`, `cadDesignGeneration.ts`, `cadDesignPersistence.ts`, `cadDesignAgentPipeline.ts`

\- Table prefix: `Hangar\_CADDesigns` (RPC conventions: `LANGUAGE sql`, `STABLE`, `SET search\_path = ''`, not `SECURITY DEFINER` unless it needs to bypass RLS for a client-callable function)

\- Ownership pattern: add `assertCADDesignOwnership`, called at all relevant call sites, alongside existing `assertAircraftDesignOwnership`

\- `supabaseAdmin` used throughout pipeline persistence (RLS inert but retained as defense-in-depth)

\- `source\_was\_mock` set honestly on both sides of the pipeline, surfaced durably (result view, list row badge, past-design detail) — same as Bay 03, not transient like Bay 02

\- `.limit(1)` not `.single()` on Supabase queries

\- Branch flow: `feature/the-hangar-bay04` → `dev` → `main`

\- Verify this spec doc lands on the correct branch before the PR (see: `AircraftDesignAgent.md` incident)

