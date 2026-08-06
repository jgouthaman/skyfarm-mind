# Mission Agent — Bay 01

**Status:** In development (build started — see [Build Status](#14-build-status))
**Agent ID:** `MISSION_AGENT`
**Type:** Base Agent (Upstream)
**Stage:** 1 of 15 — The Hangar
**Scope of this document:** full architecture, all 6 input sources — see [Section 15](#15-scope-of-this-document) for how this full spec relates to whatever gets built first.

---

## 1. Overview

Mission Agent is the entry point to The Hangar. It takes a mission brief — in whatever form it arrives — and turns it into a structured, gate-ready spec that every downstream agent builds against. It has no upstream agent; its output is the one artifact every other bay can trace itself back to.

**One-line contract:** brief in, structured mission spec out.

## 2. Position in the Pipeline

| | |
|---|---|
| Upstream | None — entry point |
| Downstream (next) | Bay 02 — Concept Agent |
| Also consumed by | Bay 03 — Aircraft Design Agent, and all downstream agents indirectly via shared memory |
| Reads/writes shared memory | Bay 15 — Knowledge Agent |

Full circuit reference: `welcome.html` (The Hangar interactive diagram).

**Standalone confirmed:** Mission Agent's intake UI is a new surface belonging entirely to The Hangar — it does not replace, extend, or connect to the existing Design Studio Step 1 (Mission) wizard form. No shared schema, no shared routes.

## 3. Inputs — Six Sources, In Detail

| # | Source | Form | Captured as | Feeds into stage 2.1 as |
|---|---|---|---|---|
| 1 | Natural Language | Chat / voice | Free text | `raw_text` |
| 2 | Mission Brief / Goals | Document (PDF/DOCX) or pasted text | Extracted text + file reference | `raw_text` + `source_document_id` |
| 3 | Requirements | Structured form | Typed fields (payload, range, endurance, altitude, environment, budget) | `structured_fields` |
| 4 | Existing Projects | Import from workspace | Reference to a past Hangar mission's stored spec | `imported_mission_id` |
| 5 | Regulations & Standards | Checkbox selection | List of regulation codes | `selected_regulations[]` |
| 6 | Market / Domain Data | Checkbox selection | List of connector references | `selected_market_refs[]` |

Sources are additive. A mission can combine any number of them — e.g. natural language + one imported project + two selected regulations — and Mission Agent treats the combination as a single intake passed into Stage 2.1.

### 3.1 At a Glance — Inputs → Mission Agent → Outputs

Before the stage-by-stage detail in Section 4, here's Mission Agent as a single black box — what goes in, what comes out, nothing about how it gets there:

```
┌────────────────────────────────┐
│       INPUTS (6 sources)        │
├────────────────────────────────┤
│ 1. Natural Language             │
│ 2. Mission Brief / Goals        │
│ 3. Requirements                 │
│ 4. Existing Projects            │
│ 5. Regulations & Standards      │
│ 6. Market / Domain Data         │
└────────────────────────────────┘
               │
               ▼
          ┌──────────────────────┐
          │    MISSION AGENT     │
          │        BAY 01        │
          └──────────────────────┘
               │
               ▼
┌────────────────────────────────┐
│     OUTPUTS (MissionSpec)       │
├────────────────────────────────┤
│ • Mission Specification         │
│ • Constraints List              │
│ • KPIs & Targets                │
│ • Mission Summary               │
│ • Confidence Score              │
└────────────────────────────────┘
```

Any combination of the 6 inputs is valid — a mission can use one or all six. The 5 outputs are always produced together as one `MissionSpec` object (Section 11), never individually. What happens inside the box is the entire rest of Section 4 — this diagram is deliberately the "explain it in one glance" version, not a replacement for the detailed stage-by-stage breakdown.

## 4. Internal Architecture — Stage-by-Stage I/O

Four stages, strictly in order. Each stage's output is the next stage's input — no stage reaches back upstream or skips ahead.

```
[6 Input Sources]
        │
        ▼
┌───────────────────┐
│ 2.1 INPUT          │  → outputs: ParsedMissionInput
│ PROCESSING          │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ 2.2 REASONING &     │  → outputs: MissionReasoningResult
│ PLANNING            │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ 2.3 OUTPUT          │  → outputs: MissionSpec
│ GENERATION          │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ 2.4 OUTPUT          │  → outputs: persisted row + API response + event
│ INTERFACE           │
└───────────────────┘
        │
        ▼
   Bay 02 — Concept Agent
```

### 4.1 Input Processing

| Step | Mechanism |
|---|---|
| Intent understanding | LLM |
| Entity extraction (mission, constraints, KPIs) | LLM |
| Context retrieval | RAG against Knowledge Base |
| Validation & normalization | Rules engine |

### 4.1.1 Internal Sequence & Merge Logic

**Quick reference — inputs and outputs:**

| # | Component | Takes as input | Gives as output |
|---|---|---|---|
| 0 | Direct Reference Resolution *(not one of the 4 named mechanisms — runs first)* | `imported_mission_id`, `selected_regulations[]`, `selected_market_refs[]` — raw values from sources 4/5/6 | Fetched past mission spec, regulation constraint tags, market data rows |
| 1 | Intent Understanding | `raw_text_combined` (sources 1+2) + `structured_fields` (source 3) + Step 0's fetched context | `detected_intent` |
| 2 | Entity Extraction | Same inputs as #1 — one combined LLM call, not a separate round trip | `extracted_entities` — `payload_hint`, `range_hint`, `endurance_hint`, `constraint_hints[]` |
| 3 | Context Retrieval (RAG) | `detected_intent` (from #1) — **stubbed**, always returns empty | `[]` today; real: relevant knowledge base chunks (Phase 2) |
| 4 | Validation & Normalization | Merged entities + explicit values + Step 0's regulation tags | `validation_flags[]` |

The table above lists four mechanisms — it does not mean four independent parallel processes with four separate outputs. They run in a specific order, feed into each other, and produce **one single combined output**. This subsection is the actual execution order Claude Code should build against.

**Step 0 — Group by source type.** All `Hangar_mission_sources` rows for the mission are grouped by `source_type`. Plain DB read, no processing yet.

**Step 1 — Direct reference resolution** *(not one of the 4 named mechanisms, but must run first — no LLM, deterministic)*

Sources 4, 5, and 6 (Existing Projects, Regulations & Standards, Market/Domain Data) are **explicit selections, not free text** — there's nothing to "understand" about a checkbox the user already ticked, they just need fetching:
- Source 4 → fetch the imported mission's stored `Hangar_mission_specs` row by `imported_mission_id`
- Source 5 → the selected regulation codes, passed through as known constraint tags
- Source 6 → the relevant rows from Market Data DB by the selected references

**This is explicitly not RAG.** RAG is semantic search over content the user didn't point to directly. Sources 4/5/6 are the opposite — the user selected them explicitly. That means all three are fully buildable now, independent of the RAG stub — only genuine semantic retrieval (Step 3 below) is blocked for Phase 2.

**Step 2 — Intent understanding + entity extraction** *(one combined LLM call, not two)*
- **Input:** `raw_text_combined` (sources 1 + 2 — Natural Language and Document text), `structured_fields` (source 3 — Requirements form), plus Step 1's fetched context as grounding.
- **Merge rule:** explicit structured values always win over LLM-inferred hints. If source 3 already states `payload: 25kg`, the LLM does not re-guess that field — it only fills in what's genuinely missing.
- **Output:** `detected_intent` + `extracted_entities` (provisional — not yet validated).
- Build as a single structured/JSON-mode API call covering both intent and entities. Two round trips for what the architecture diagram drew as two boxes wastes latency and cost for no real benefit — they're one call.

**Step 3 — Context retrieval (RAG)** *(stub only — Phase 2)*
- **Input when implemented:** `detected_intent` from Step 2 — retrieval is more accurate once intent is known, so this runs after extraction, not before.
- **Output today:** always `[]`.

**Step 4 — Validation & normalization** *(rules engine, runs last, deterministic)*
- **Input:** the full merge so far — LLM-extracted entities, the explicit values that overrode them, and Step 1's regulation constraint tags.
- **Why last:** nothing is validatable before it's been extracted and merged. This step also cross-checks combined values against combined constraints — e.g. a selected regulation implying a weight cap, checked against the merged payload value.
- **Output:** `validation_flags[]`.

**Single combined output, single consumer.** All four steps merge into one `ParsedMissionInput` object — there is no intermediate handoff of four separate outputs between them. Stage 2.2 (`reasonAndPlan`) is the **only** consumer of that object, and receives nothing else — it never sees the raw sources directly, only the merged result:

```
raw_text_combined   ┐
detected_intent      │
extracted_entities   ├──►  ParsedMissionInput  ──►  reasonAndPlan(parsed)
attached_regulations │         (one object)            [Stage 2.2]
imported_mission_ref │
validation_flags    ┘
```

**What each mechanism actually requires:**

**LLM (intent understanding + entity extraction).** No new infrastructure — existing LLM API access is sufficient. A single call with structured/JSON-mode output: feed in the raw mission text, get back `{ intent, payload_hint, range_hint, endurance_hint, constraint_hints[] }`. Build this first; it's a prompt plus an API call, testable against 10–15 sample mission briefs to tighten the prompt where it guesses wrong.

**Rules engine (validation & normalization).** Also no new infrastructure — plain deterministic TypeScript, not AI. Same pattern as `vehicleTypeRecommender.ts`'s gate logic, applied one stage earlier:
- `normalizeUnits(value, unit)` — collapse different phrasings ("5 kilos" / "5kg") into one format
- `validateRange(field, min, max)` — catch LLM hallucinations (e.g. a payload_hint of 500000kg)
- `flagMissingRequired(parsed)` — surface what's absent that should probably be asked about

**RAG against Knowledge Base (context retrieval).** The one mechanism that needs real infrastructure, most of which doesn't exist yet:
1. pgvector enabled on the Supabase project (same underlying capability already flagged for `reference_designs` — reused here, not duplicated)
2. `Hangar_knowledge_base` table — content chunks + embeddings + source metadata
3. Actual content to retrieve — the real gap today. Candidates: past mission specs once a few real ones exist, TorqWings' own design rules, domain glossaries
4. An embedding step (e.g. `text-embedding-3-small`) run whenever content is added
5. A retrieval step — embed the incoming mission text, similarity-search, pull top matches into the LLM prompt as context

**Build order recommendation:** LLM extraction and the rules engine can be built today — no blockers. RAG has no payoff until there's real content worth retrieving (an empty knowledge base just returns nothing), so stub context retrieval as an always-empty call until `Hangar_mission_specs` has enough real missions in it to be worth searching — same logic already applied to `design_outcomes` being a moat only once it holds data.

**Output — `ParsedMissionInput`:**
```json
{
  "raw_text_combined": "string",
  "source_types_used": ["natural_language", "regulations"],
  "detected_intent": "string",
  "extracted_entities": {
    "payload_hint": "string | null",
    "range_hint": "string | null",
    "endurance_hint": "string | null",
    "constraint_hints": ["string"]
  },
  "attached_regulations": ["FAR_107"],
  "imported_mission_ref": "uuid | null",
  "validation_flags": ["string"]
}
```

### 4.2 Reasoning & Planning

| Step | Mechanism |
|---|---|
| Mission decomposition | LLM + prompt templates |
| Constraint identification | Domain rules + LLM |
| KPI derivation (performance, cost, safety) | LLM + heuristics |
| Trade-off prioritization | Heuristic / multi-criteria |

### 4.2.1 Internal Sequence, Templates, Rules & Scoring Detail

**Quick reference — inputs and outputs:**

| # | Component | Takes as input | Gives as output |
|---|---|---|---|
| 1 | Mission Decomposition | `detected_intent` + `extracted_entities` (from `ParsedMissionInput`) | `decomposed_elements[]` |
| 2 | Constraint Identification | `decomposed_elements` (#1) + already-known explicit constraints (`attached_regulations`, validated form fields) | `identified_constraints[]` — domain-rule matches + LLM inferences, each tagged with `source` |
| 3 | KPI Derivation | `decomposed_elements` (#1) + `identified_constraints` (#2) | `derived_kpis[]` — `{name, target, unit}` |
| 4 | Trade-off Prioritization | `derived_kpis` (#3) + `identified_constraints` (#2) | `prioritized_tradeoffs[]` — `{item, rationale}` |

Same principle as 4.1.1: these four are a dependency chain, not four independent operations. Each step needs the previous step's output.

**Step 1 — Mission Decomposition** *(LLM + prompt templates, runs first)*

**Input:** `detected_intent` + `extracted_entities` from `ParsedMissionInput`.
**Output:** `decomposed_elements[]` — discrete functional pieces of the mission.

**Prompt template:**
```
SYSTEM:
You are Mission Agent's decomposition step for TorqWings' aerospace design
platform. Break the mission into discrete functional elements. Each element
should be a short phrase capturing one distinct aspect of the mission —
domain/vertical, platform class, operational profile, regulatory category.
Do not invent requirements not implied by the input. Return JSON only.

USER:
Mission intent: {{detected_intent}}
Extracted entities: {{extracted_entities_json}}

Return:
{ "decomposed_elements": ["string", ...] }
```

**Example output** for "fixed-wing crop survey, 25kg payload, 90 min endurance":
```json
{
  "decomposed_elements": [
    "aerial crop health monitoring",
    "fixed-wing platform class",
    "small-UAS weight category (≤25kg)",
    "extended-duration mission profile (>60min)"
  ]
}
```

---

**Step 2 — Constraint Identification** *(domain rules + LLM — two distinct mechanisms, merged)*

**Input:** `decomposed_elements` (Step 1) + everything already known explicitly from `ParsedMissionInput` (`attached_regulations`, validated structured fields).

**2a. Domain rules (deterministic, no LLM).** Known inputs map straight to constraints via a fixed rule table — no inference, just lookup. This table is the actual thing to implement as code, not prose to re-derive at runtime:

| Rule ID | Trigger | Implied constraint | Source tag |
|---|---|---|---|
| REG-001 | Regulation = FAR Part 107 selected | Max altitude 122m AGL (400ft); VLOS required | `regulation` |
| REG-002 | Regulation = EASA SORA selected | Formal risk assessment required; operational category must be declared | `regulation` |
| REG-003 | Regulation = DGCA CAR Section 3 selected | Weight category constraint applies (Nano <250g / Micro <2kg / Small <25kg / Medium <150kg); registration required | `regulation` |
| REG-004 | Regulation = MIL-STD-810 selected | Environmental hardening required (temperature, vibration, humidity resistance) | `regulation` |
| FORM-001 | `payload_hint` > 25kg | Exceeds small-UAS category — additional certification constraint | `user` |
| FORM-002 | `altitude_ceiling` > 120m | Beyond standard VLOS ceiling — special permission constraint | `user` |
| FORM-003 | `operating_environment` = "Urban" | Noise constraint + population-density safety constraint | `user` |
| FORM-004 | `operating_environment` = "Coastal / maritime" | Corrosion resistance / waterproofing constraint | `user` |
| FORM-005 | `budget_band` = "Under ₹5L" | Cost-conscious component constraint (COTS preference) | `user` |
| DOM-001 | Decomposed elements contain crop/agriculture terms | AgriSky vertical; low-altitude spray-drift avoidance constraint | `inferred` |
| DOM-002 | Decomposed elements contain perimeter/security/surveillance terms | GuardSky vertical; persistent-loiter endurance constraint | `inferred` |
| DOM-003 | Decomposed elements contain pipeline/infrastructure/inspection terms | InfraSky vertical; BVLOS (beyond visual line of sight) constraint | `inferred` |
| DOM-004 | Decomposed elements contain mapping/survey/terrain terms | GeoSky vertical; high-resolution imaging payload constraint | `inferred` |

This table is intentionally extensible — start with these, add rows as real missions surface patterns not covered yet. It's the same "gate-then-score" philosophy as the rest of the platform: hard rules first, nothing left to a model's judgment when a deterministic answer exists.

**2b. LLM (genuine inference, for what the rule table can't catch).**
```
SYSTEM:
You identify constraints a mission implies but the user never stated
explicitly. Only infer a constraint if it's a reasonable, defensible
consequence of the mission elements below — do not speculate broadly.
Tag every constraint you return with source "inferred". Return JSON only.

USER:
Decomposed mission elements: {{decomposed_elements_json}}
Constraints already known (do not repeat these): {{known_constraints_json}}

Return:
{ "identified_constraints": [ { "name": "string", "value": "string", "source": "inferred" } ] }
```

**Output:** `identified_constraints[]` — domain-rule matches plus LLM inferences, each carrying its `source` tag so nothing downstream has to guess whether a constraint was stated, selected, or inferred.

---

**Step 3 — KPI Derivation** *(LLM + heuristics — depends on Step 2, not just Step 1)*

**Input:** `decomposed_elements` **and** `identified_constraints` together. Where a constraint directly implies a KPI target (a 25kg payload constraint *is* the payload KPI — no re-deriving), the heuristic copies it straight across. The LLM is only used for KPIs that aren't a restatement of an existing constraint (e.g. a cost target inferred from a budget band).

**KPI value ranges** — used both here (as sanity bounds on derived/copied values) and in Section 4.1's `validateRange()`:

| KPI | Unit | Lower bound | Upper bound | Notes |
|---|---|---|---|---|
| Payload | kg | 0.1 | 150 | >25kg triggers FORM-001 |
| Range | km | 1 | 500 | |
| Endurance | min | 5 | 480 | >480 (8hr) flagged as hallucination-suspect |
| Altitude ceiling | m | 10 | 6000 | 120m is the VLOS default when unspecified |
| Budget | ₹ | 50,000 | 5,00,00,000 | Matches the intake form's budget bands |
| Confidence score | — | 0 | 1 | Computed (Section 4.3), never LLM-set |

Any derived or copied KPI value falling outside these bounds gets flagged in `validation_flags` retroactively — Stage 2.1's rules engine runs before extraction, but a KPI derived here from combined inputs can still land out of range even when each individual input looked fine alone.

**Prompt template (LLM portion only):**
```
SYSTEM:
Derive performance, cost, and safety KPIs for this mission. For any KPI
already implied directly by a listed constraint, copy that value — do not
re-derive it. Only infer new KPI values where no constraint already
states one. Stay within realistic bounds for a small UAS. Return JSON only.

USER:
Decomposed mission elements: {{decomposed_elements_json}}
Identified constraints: {{identified_constraints_json}}

Return:
{ "derived_kpis": [ { "name": "string", "target": "string", "unit": "string" } ] }
```

**Output:** `derived_kpis[]`.

---

**Step 4 — Trade-off Prioritization** *(heuristic / multi-criteria — no LLM at all)*

**Input:** `derived_kpis` + `identified_constraints` together.

This step deliberately has **no LLM call** — same reasoning as the platform's existing gate-then-score identity: a ranked priority order should be explainable and reproducible, not an unexplainable model judgment call.

**Gate tier (non-negotiable — never traded away against anything):**
1. Safety constraints (any constraint tagged with a safety implication, from rules or inference)
2. Regulatory compliance constraints (`source: "regulation"`)

Nothing in the score tier below can ever outrank a gate-tier item — a cost saving never wins against a regulatory constraint.

**Score tier (weighted multi-criteria, applied only among the remaining flexible KPIs):**

| Criterion | Default weight |
|---|---|
| Performance (range, endurance, altitude) | 35% |
| Cost | 30% |
| Payload capability | 20% |
| Schedule / build complexity | 15% |

**Override rule:** if the user's original input explicitly signaled a priority (e.g. "cost is not a concern, we need maximum range" — something Stage 2.1's entity extraction should already have flagged as a signal), that signal overrides the default weights for this specific mission rather than being silently ignored.

**Output:** `prioritized_tradeoffs[]` — not just a ranked list, but each entry paired with a short rationale string (e.g. `"Range prioritized over cost — user signaled range as primary driver"`), consistent with the platform-wide rule that every recommendation carries a traceable reason, not just a number.

---

**Efficiency note:** Steps 2b and 3's LLM portions can be one combined API call in practice (both operate on `decomposed_elements` and flow directly into each other) — same pattern as Stage 2.1 combining intent + entity extraction. Realistically: 1 LLM call for decomposition → 1 combined LLM call for constraint inference + KPI derivation → 1 deterministic pass for trade-offs. Three operations, not four round trips.

**Single combined output, single consumer.** All four steps merge into one `MissionReasoningResult` object. Only Stage 2.3 (`generateOutput`) consumes it:

```
decomposed_elements     ┐
identified_constraints   ├──►  MissionReasoningResult  ──►  generateOutput(reasoning)
derived_kpis             │           (one object)              [Stage 2.3]
prioritized_tradeoffs   ┘
```

**Output — `MissionReasoningResult`:**
```json
{
  "decomposed_elements": ["string"],
  "identified_constraints": [
    { "name": "string", "value": "string", "source": "user | regulation | inferred" }
  ],
  "derived_kpis": [
    { "name": "string", "target": "string", "unit": "string" }
  ],
  "prioritized_tradeoffs": [
    { "item": "string", "rationale": "string" }
  ]
}
```

### 4.3 Output Generation

| Step | Form |
|---|---|
| Mission specification | Structured JSON |
| Constraints list | Structured |
| KPIs & targets | Structured |
| Mission summary | Natural language |

### 4.3.1 Internal Sequence, Dedup Logic & Summary Template

**Quick reference — inputs and outputs:**

| # | Component | Takes as input | Gives as output |
|---|---|---|---|
| 1 | Mission Specification (Structured JSON) | `raw_text_combined` + `extracted_entities` (Stage 2.1) + `decomposed_elements` (Stage 2.2) | `mission_specs` object — domain, vehicle class, mission type, key operating parameters |
| 2 | Constraints List (Structured) | `identified_constraints` (Stage 2.2) | `constraints[]` — deduplicated, each `{name, value, sources[]}` |
| 3 | KPIs & Targets (Structured) | `derived_kpis` + `prioritized_tradeoffs` (both Stage 2.2) | `kpis[]` — each `{name, target, unit, priority}` |
| 4 | Mission Summary (Natural language) | the **finished outputs of #1, #2, #3** — not raw Stage 2.2 data | `summary` string |
| 5 | Confidence Score (computed, not one of the 4 named components) | field completeness across #1–#3, `source_types_used` and `validation_flags` from Stage 2.1 | `confidence_score` number |

**Execution sequence — origin at Stage 2.2:**

```
   ParsedMissionInput                 MissionReasoningResult
       (Stage 2.1)                          (Stage 2.2)
  raw_text_combined                              │
  extracted_entities                              │
         │                                        │
         │           ┌────────────────────────────┼────────────────────────────┐
         │           │                            │                            │
         └────────►  ▼                            ▼                            ▼
               ┌───────────────┐          ┌───────────────┐          ┌───────────────┐
               │ 1. Mission     │          │ 2. Constraints │          │ 3. KPIs &      │
               │  Specification │          │    List        │          │    Targets     │
               │ (deterministic,│          │ (deterministic,│          │ (deterministic,│
               │  runs anytime, │          │  runs anytime, │          │  runs anytime, │
               │  no LLM)       │          │  no LLM)       │          │  no LLM)       │
               └───────┬────────┘          └───────┬────────┘          └───────┬────────┘
                       │                            │                            │
                       └────────────────────────────┼────────────────────────────┘
                                                      ▼
                                          ┌───────────────────┐
                                          │ 4. Mission Summary │
                                          │  (LLM — must wait   │
                                          │   for 1, 2, 3 to    │
                                          │   finish first)     │
                                          └─────────┬─────────┘
                                                      ▼
                                          ┌───────────────────┐
                                          │ 5. Confidence Score│
                                          │   (deterministic)  │
                                          └─────────┬─────────┘
                                                      ▼
                                                 MissionSpec
                                                (→ Stage 2.4)
```

**Reading this diagram:** 1, 2, and 3 all branch out from Stage 2.2's output and can run in any order relative to each other — none of them depends on the other two, only on 2.2 (and, for #1 specifically, a bit of Stage 2.1 directly, shown as the side branch). 4 is the one genuine bottleneck — it can't start until 1, 2, and 3 have all finished, because it summarizes the finished record, not the raw reasoning behind it. 5 runs last, after everything else exists to measure completeness against.

Unlike 2.1 and 2.2, three of these four steps are deterministic assembly, not fresh inference — the only genuinely generative step is the summary. But the order still matters: each step needs the previous one's finished output.

**Step 1 — Assemble Mission Specification** *(deterministic merge, no LLM)*
**Input:** `raw_text_combined` + `extracted_entities` (from `ParsedMissionInput`) + `decomposed_elements` (from `MissionReasoningResult`).
**What it does:** maps these into the final `mission_specs` shape — domain, vehicle class, mission type, key operating parameters. Pure formatting/mapping, no new judgment calls at this point.
**Output:** `mission_specs` object.

**Step 2 — Finalize Constraints List** *(deterministic dedup, no LLM)*
**Input:** `identified_constraints` from `MissionReasoningResult`.
**Dedup rule:** when two rules produce a constraint on the same field (e.g. both REG-001 and FORM-002 producing a "max altitude" value), keep the **more restrictive** value — lower altitude ceiling, lower payload weight, whichever direction is safer — and merge the contributing rule IDs into one `sources[]` array on the surviving entry, rather than silently dropping one. Nothing gets discarded without a trace of why.
**Output:** `constraints[]`, deduplicated, still structured (not flattened to strings — see the schema note below).

**Step 3 — Finalize KPIs & Targets** *(deterministic formatting + priority annotation)*
**Input:** `derived_kpis` **and** `prioritized_tradeoffs` from `MissionReasoningResult`.
**What it does:** formats `derived_kpis`, and — this is the part that's easy to miss — attaches a `priority` field to each one based on where it landed in Stage 2.2's trade-off scoring. A KPI backed by a gate-tier constraint (safety, regulatory) gets `priority: "critical"`; everything else gets the rank order from the score tier. Without this step, Stage 2.2's entire trade-off prioritization work gets computed and then thrown away by the time it reaches the final spec — this is where it actually lands somewhere.
**Output:** `kpis[]`, each entry now `{name, target, unit, priority}`.

**Step 4 — Generate Mission Summary** *(the one genuinely generative step — LLM)*
**Input:** the **finished** `mission_specs`, `constraints`, and `kpis` from Steps 1–3 — not the raw reasoning output. The summary describes what's actually being saved, so it has to run last, after everything else is final.

**Prompt template:**
```
SYSTEM:
Write a concise, plain-language summary of this mission for a human
reviewer to confirm before it's saved. 3-5 sentences. State the mission
type, the platform class, the top 2-3 constraints, and the primary KPI
targets. Do not introduce any information not present in the structured
input below — this is a summary, not a new inference.

USER:
Mission specification: {{mission_specs_json}}
Constraints: {{constraints_json}}
KPIs: {{kpis_json}}

Return: { "summary": "string" }
```

**Output:** `summary` (natural language).

**Step 5 — Compute Confidence Score** *(deterministic formula, no LLM — detailed below)*

`confidence_score` is not a single LLM-reported number (too easy for a model to overstate) — it's a weighted blend of three measurable signals:

```
confidence_score = (0.4 × source_completeness)
                  + (0.4 × field_completeness)
                  − (0.05 × validation_flag_count, floored at 0)
```

- **`source_completeness`** — `min(sources_provided / 3, 1)`. Three or more of the six input sources combined counts as "full" — a mission built from natural language alone scores lower than one that also has a requirements form and an imported past mission backing it up.
- **`field_completeness`** — the fraction of core KPI fields (payload, range, endurance, at minimum) that Stage 2.2 derived with a real value rather than `null`. A spec missing endurance entirely is less trustworthy than a complete one.
- **`validation_flag_count`** — the number of flags Stage 2.1's rules engine raised (Section 4.1). Each flag subtracts 0.05, floored so the score never goes negative.

This keeps the score explainable and reproducible — anyone looking at a mission's `validation_flags` and `source_types_used` can recompute why its confidence landed where it did, rather than trusting an opaque model-generated number. This is also the exact number that flows into `design_outcomes` per the Decisions Log, so it needs to mean something consistent across every mission, not vary in method run to run.

---

**Schema note — constraints stay structured, not flattened.** An earlier version of this doc showed `MissionSpec.constraints` as a flat string array. That's now corrected: constraints carry their `source`/`sources` tags all the way through to the final spec, same as everywhere else in this document — flattening to strings here would throw away exactly the traceability the rest of the architecture is built around.

**Single combined output, single consumer.** All five steps merge into one `MissionSpec` object. Only Stage 2.4 (`publishOutput`) consumes it:

```
mission_specs   ┐
constraints      ├──►  MissionSpec  ──►  publishOutput(spec)
kpis (+priority) │       (one object)       [Stage 2.4]
summary          │
confidence_score ┘
```

**Output — `MissionSpec`** (this is the I/O contract — see [Section 11](#11-interface-contract-io)):
```json
{
  "mission_id": "uuid",
  "mission_specs": { "...": "..." },
  "constraints": [
    { "name": "Max altitude", "value": "122m", "sources": ["REG-001"] }
  ],
  "kpis": [
    { "name": "Range", "target": "1000 km", "unit": "km", "priority": "critical" },
    { "name": "Payload", "target": "25", "unit": "kg", "priority": "critical" },
    { "name": "Endurance", "target": "90", "unit": "min", "priority": 2 }
  ],
  "summary": "string",
  "confidence_score": 0.92
}
```

### 4.4 Output Interface

| Channel | Action |
|---|---|
| Structured data API | Returns `MissionSpec` as JSON to the calling client |
| Dashboard view | Renders `MissionSpec` in the mission overview UI |
| Export | PDF / DOCX / Excel (v2) |
| Event publish | Writes to `Hangar_agent_runs`, broadcasts to event bus for Concept Agent |

### 4.4.1 Internal Sequence, Parallelism & Placement

This stage is shaped differently from 2.1–2.3. Those three were dependency chains — each step needed the last one's output. Stage 2.4 is **four delivery channels for the same already-finished data** — none of them computes anything new, they just deliver `MissionSpec` to a different place. That means most of them run in **parallel**, with one prerequisite and one special case.

**Quick reference — inputs, outputs, and where each lands:**

| # | Component | Takes as input | Runs | Gives as output | Where placed |
|---|---|---|---|---|---|
| 0 | Persistence *(prerequisite — not one of the 4 named channels)* | `MissionSpec` (Stage 2.3's finished output) | **First — blocks everything below.** Nothing can be delivered before it's saved. | The persisted row, with its final `id`/`version` | `Hangar_mission_specs` table |
| 1 | Structured Data API | The persisted `MissionSpec` (#0) | **Synchronous.** The caller (the intake UI's "Process Mission" action) is directly waiting on this — it's the critical path. | `MissionSpec` serialized as JSON | Nowhere new — it's the HTTP response body, ephemeral, gone once the request completes |
| 2 | Dashboard View | **The API response from #1** — not a separate fetch of `MissionSpec` | Client-side, strictly after #1 returns. This is the one component that isn't parallel to the others — it's downstream of #1 specifically. | Rendered UI — full content spec in [Section 13.1](#131-dashboard-view--content-spec) | Browser only — no new stored artifact, it's a display of data already in `Hangar_mission_specs` |
| 3 | Export | The persisted `MissionSpec` (#0) | Async, on-demand — a user action taken later, not automatic on every mission. **Deferred (v2)**, same treatment as RAG — documented here, not built in this pass. | A generated file (PDF/DOCX/Excel) | Would live in Supabase Storage, tracked by a future `Hangar_mission_exports` table (not part of the current schema — add when this is actually built) |
| 4 | Event Publish | The persisted `MissionSpec` (#0) + `missionId` | Async, fire-and-forget — does **not** block #1's response to the caller | `mission.spec_ready` event — minimal payload, full spec fetched separately by the consumer. Full detail in [Section 4.4.3](#443-event-publish--type-bus-consumer--lifecycle) | No queryable store today (stub — logged via `logStageRun` only). Future: `Hangar_events` table |

**Execution diagram:**

```
                     MissionSpec (Stage 2.3 output)
                               │
                               ▼
                   ┌────────────────────────┐
                   │ 0. Persistence           │
                   │  (blocks everything      │
                   │   below — must finish    │
                   │   first)                 │
                   └────────────┬────────────┘
                                │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
 ┌────────────────┐    ┌────────────────┐     ┌────────────────┐
 │ 1. Structured    │    │ 3. Export       │     │ 4. Event        │
 │    Data API      │    │  (async, v2 —   │     │    Publish      │
 │  (synchronous —  │    │   deferred,      │     │  (async, fire-  │
 │   caller awaits) │    │   not built yet) │     │   and-forget,   │
 └────────┬────────┘    └─────────────────┘     │   stub for now) │
          │                                        └─────────────────┘
          ▼
 ┌────────────────┐
 │ 2. Dashboard     │
 │    View          │
 │  (renders #1's   │
 │   response —     │
 │   not parallel,   │
 │   downstream of   │
 │   #1 specifically)│
 └──────────────────┘
```

**Reading this diagram:** #0 is the one true bottleneck — nothing is "delivered" anywhere until it's saved. Once persisted, #1, #3, and #4 all fire independently and don't wait on each other — #1 happens to be the one the caller is synchronously blocked on (it's what makes "Process Mission" feel instant or slow to the user), while #3 and #4 can complete milliseconds or minutes later without anyone noticing. #2 is the odd one out: it's not really parallel to anything — it only exists once #1 has already returned something to render, so it's downstream of #1 specifically, not of `MissionSpec` directly.

**What this means for implementation:** `publishOutput` (Section 12) should persist first, then either `await` the API response path directly while firing Export-stub and Event-publish-stub without blocking on their completion (e.g. not awaited, or awaited but wrapped so a failure there doesn't fail the whole request) — a slow or failed event-bus stub should never be the reason a user sees an error after their mission spec was actually saved successfully.

### 4.4.2 Export Template (Documented, Not Built — v2)

Same treatment as RAG (Section 4.1.1): specified now so the shape is settled, not built in this pass. When Export is implemented, it should reuse the *exact* content structure already defined for Dashboard View (Section 13.1) — same 7 sections, same source data, just formatted for a static document instead of an interactive screen. Two format families, not one universal template:

**PDF / DOCX (narrative document):**

| Section | Content |
|---|---|
| Cover / header | TorqWings — The Hangar branding, mission code, generation date, `confidence_score` |
| Mission Summary | The `summary` string, as a paragraph |
| Mission Specification | `mission_specs`, as a two-column field/value table |
| Constraints | Table: constraint name, value, source tags |
| KPIs & Targets | Table: KPI name, target, unit, priority — critical KPIs visually distinguished (bold or highlighted row) |
| Validation Notes | Any `validation_flags`, shown plainly if present |
| Footer | "Generated by Mission Agent — Bay 01, The Hangar. Version {n}." |

**Excel (tabular only — no prose):**
- Sheet 1 "Overview" — `mission_specs` fields + `summary` + `confidence_score`, one row per field
- Sheet 2 "Constraints" — one row per constraint, columns: name, value, sources
- Sheet 3 "KPIs" — one row per KPI, columns: name, target, unit, priority

**When this gets built:** reuse Section 13.1's rendered content as the source of truth for both formats — don't write export logic that re-derives formatting independently of the dashboard, or the two will drift from each other over time.

### 4.4.3 Event Publish — Type, Bus, Consumer & Lifecycle

**Today, honestly:** there is no queue, no bus, no consumer. Bay 02 (Concept Agent) doesn't exist yet. "Event Publish" today is nothing more than the `Hangar_agent_runs` log row every stage already writes. The detail below is what this becomes once there's a real subscriber — same "specified now, built when needed" treatment as RAG (4.1.1) and Export (4.4.2), not something to build in this pass.

**Event type:** one named event, `mission.spec_ready` — dot-namespaced (`<domain>.<action>`), the standard convention. Only one type exists for now; future agents add their own (`concept.options_ready`, etc.) to the same mechanism rather than inventing a new one each time.

**Bus:** not RabbitMQ or a separate message broker — that's new infrastructure with no justification yet, same logic as not standing up pgvector before there's content worth searching. Use a `Hangar_events` table backed by **Supabase Realtime** (Postgres `LISTEN`/`NOTIFY` under the hood) — nothing new to run, it's the database already in use.

**Consumer:** today, nobody. Once built: Concept Agent subscribes to `mission.spec_ready`. The actual value of a real event mechanism over Mission Agent directly calling Concept Agent is that Mission Agent never needs to know who's listening — Knowledge Agent (Bay 15) could subscribe to the same event later with zero changes to Mission Agent's code.

**Lifecycle:** backed by a table row specifically so a momentarily-offline consumer doesn't lose the event — a pure broadcast with no consumer listening at that exact instant is gone forever; a row can be picked up whenever the consumer next checks. States: `pending` (published, unconsumed) → `consumed` (a subscriber processed it, timestamped, tagged with which agent) → kept indefinitely for audit trail, same retention posture as `Hangar_agent_runs`.

**Constructed from:** deliberately minimal — not the full `MissionSpec` duplicated into the event. Just `mission_id`, `version`, `event_type`, `published_at`. The consumer fetches the actual spec from `Hangar_mission_specs` by `mission_id` when it processes the event. Embedding the full spec in the event would create two copies of the same data that could silently drift apart if one gets updated and the other doesn't.

**Schema (documented now, created when Concept Agent is actually being built — not part of this pass's migration):**
```sql
create table Hangar_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,                         -- e.g. 'mission.spec_ready'
  mission_id uuid not null references Hangar_missions(id) on delete cascade,
  payload jsonb not null,                            -- minimal: {mission_id, version}
  status text not null default 'pending'
    check (status in ('pending','consumed','error')),
  published_at timestamptz not null default now(),
  consumed_at timestamptz null,
  consumed_by text null                              -- e.g. 'CONCEPT_AGENT'
);

alter table Hangar_events enable row level security;
create policy "Users view events on their own missions"
on Hangar_events
for select
using (mission_id in (select id from Hangar_missions where user_id = auth.uid()));
-- Publish (insert) and consume (update) are both service-role only —
-- same write pattern as Hangar_mission_specs and Hangar_agent_runs.
```

## 5. Tools Used

### 5.1 Active — used today or with a defined activation plan

| Tool | Open source? | Market names / options | Called by (input) | Output consumed by | Frequency per mission |
|---|---|---|---|---|---|
| **LLM** | Only Llama (self-hostable). Claude and GPT-4o are proprietary, API-only. | Claude (Anthropic), GPT-4o (OpenAI), Llama (Meta, via Together AI / Groq / Replicate) | Stage 2.1 (intent+entity), Stage 2.2 (decomposition; constraint+KPI combined), Stage 2.3 Step 4 (summary) — server-side only, Section 12.1 | The calling pipeline function itself, never the client directly | **4 calls** — 1 in 2.1, 2 in 2.2, 1 in 2.3 |
| **RAG / Vector Search** | Yes — pgvector is a fully open-source Postgres extension | pgvector (decided, Section 10.0) — alternatives: Pinecone (proprietary SaaS), Weaviate/Qdrant (open source, but new infrastructure) | Stage 2.1 Step 3 — `detected_intent` | Merged into `ParsedMissionInput` | 0 today (stubbed); 1 call once built |
| **Rules Engine** | Not a product — bespoke TypeScript. `json-rules-engine` (open source npm) if a framework is ever wanted instead. | — | Stage 2.1 Step 4 (validation/normalization); Stage 2.2 Step 2a (domain rule lookups) | `validation_flags[]` (2.1); `identified_constraints[]` (2.2) | Runs every mission — no network call, effectively free |
| **Document Parser** | Yes — both MIT licensed | `pdf-parse` (PDF→text), `mammoth` (DOCX→text) | The uploaded file, **at upload time** — not during "Process Mission" | `Hangar_mission_documents.extracted_text`, feeding Stage 2.1's `raw_text_combined` | Once per uploaded document |
| **Calculator** | Yes, if using a library | `convert-units` (open source npm), used inside `normalizeUnits` | Stage 2.1 Step 4, per field needing unit conversion | Normalized values, feeding validation and downstream KPI derivation | Several tiny calls per mission, no network cost |
| **Prompt Templates** | Not a product — the template strings already written in Sections 4.1.1/4.2.1/4.3.1. LangChain's `PromptTemplate` (open source) if templating infrastructure is ever wanted. | — | Every LLM-calling step | Filled prompt string → LLM | Paired 1:1 with LLM calls — 4 per mission |

### 5.2 Not used — and why, specifically

Two tools appear in the original architecture reference but are **not wired into any stage's logic** in this document. Unlike RAG (stubbed *with* an activation plan — Section 4.1.1 Step 3), these have no plan at all. Listed honestly rather than left ambiguous:

**Knowledge Graph (Aerospace Ontology)**
- No stage in Section 4 ever calls it — every active tool above has a defined trigger point; this one doesn't.
- The domain rules table (Section 4.2.1, `REG-001`–`DOM-004`) already does its job here — flat lookup, not graph traversal. Nothing documented needs multi-hop relationship reasoning that would justify a graph database over a table.
- New infrastructure (Neo4j) with no demonstrated need — same discipline applied everywhere else in this document (pgvector deferred, Supabase Realtime instead of RabbitMQ). If it were built: Neo4j Community Edition (open source, self-hosted) or Neo4j Aura (managed, not free).

**Web Search (Market/Domain Data)**
- Source 6 (Market/Domain Data) already has a working, fully specified mechanism that isn't this — Section 4.1.1 Step 1 handles it as a deterministic DB lookup against user-selected references.
- Live web search would solve a different, undefined problem — enriching data the user *didn't* select — but nothing in this document defines how a raw search result would earn the same traceability every other input carries (`sources[]`, `validation_flags`). Wiring it in now would add a data path with no trust model behind it.
- Cost and integration overhead (Brave Search API, SerpAPI, Google Custom Search — all paid/metered, none open source) with no requirement currently driving the need.

**Action item:** decide whether these two stay in this document as explicitly-not-used (current treatment) or get removed from Section 5 entirely — leaving them in Section 5's original one-line list without this callout was exactly what let them look active when they weren't.

## 6. Integrations

Auth Service · File Storage (Supabase Storage) · Event Bus · Workflow Engine · API Gateway · Notification Service · Version Control (Git) · Monitoring

### 6.1 Each Integration, Explained

**Auth Service**
- **What it is:** Supabase's built-in `auth.users` — already the decided approach, Section 10.2. Not a separate product to integrate; it's the auth layer Supabase already provides.
- **Role in Mission Agent:** authenticates the user via Flight Deck, and populates `auth.uid()` — the value every single RLS policy in Section 10.1 checks against. Without this working correctly, every table's access control breaks silently.
- **Status:** decided, not yet built for real (Flight Deck currently runs on the stub credential from earlier in this build).

**File Storage**
- **What it is:** Supabase Storage — same project, no new service.
- **Role in Mission Agent:** holds uploaded documents (source type: document — PDF/DOCX), referenced by `Hangar_mission_documents.storage_path` (Section 10). Also where generated exports (Section 4.4.2, v2) would live once built.
- **Status:** table schema exists (`Hangar_mission_documents`); the actual upload-to-Storage wiring isn't built yet.

**Event Bus**
- **What it is:** Supabase Realtime, backed by the `Hangar_events` table — fully specified in Section 4.4.3. Not RabbitMQ or a separate broker, deliberately (no new infrastructure with no consumer to justify it).
- **Role in Mission Agent:** publishes `mission.spec_ready` once a spec is persisted, so Concept Agent (once it exists) can pick up new work without Mission Agent needing to know who's listening.
- **Status:** fully specified, not built (stub only — logged via `Hangar_agent_runs`, no real event today, per 4.4.3).

**Workflow Engine**
- **What it is — and importantly, what it is NOT:** within Mission Agent itself, this is just the plain TypeScript orchestrator function (`runMissionAgent`, Section 12) chaining Stages 2.1→2.2→2.3→2.4 in sequence. It does **not** require LangGraph or any graph-based framework — that's overkill for one agent's own internal 4-step sequence.
- **Where a real framework becomes justified:** once multiple *agents* need orchestrating together — Bay 01 handing off to Bay 02 handing off to Bay 03, with branching and parallel stages across agents (the way Section 4.4.1's diagram shows a single agent's internal parallelism) — that's the point where LangGraph or a similar graph-based orchestrator earns its place, at The Hangar level, not inside a single bay.
- **Status:** the simple version (the orchestrator function) is specified in Section 12; the multi-agent version doesn't need to exist until Bay 02 is being built.

**API Gateway**
- **What it is:** no dedicated gateway product — the server route(s) Mission Agent's pipeline runs behind (Section 12.1's "server function or API route, whichever this codebase already uses") *is* the gateway at this scale. A dedicated API gateway product (Kong, AWS API Gateway) only starts to matter with many independent services or external consumers needing centralized routing/rate-limiting — not the case yet with one agent and one internal caller.
- **Role in Mission Agent:** the single entry point the intake UI calls to trigger `runMissionAgent` — enforces the server-side-only execution boundary from Section 12.1.
- **Status:** depends on Claude Code confirming the codebase's existing server-route pattern (explicitly asked as a preflight step in the wiring prompt).

**Notification Service**
- **What it is:** genuinely undecided — no tool picked yet. Two realistic options: (a) no separate service at all — the client polls or subscribes to the same Supabase Realtime mechanism as the Event Bus, since mission processing isn't instant (4 sequential LLM calls, Section 5.1); (b) actual email notifications via a transactional email provider (Resend, SendGrid, Postmark) if "your mission spec is ready" needs to reach someone who isn't watching the screen.
- **Role in Mission Agent:** telling a user their spec finished generating — relevant specifically because processing takes real time, not because of any hard requirement documented elsewhere.
- **Status:** not decided. For an MVP, option (a) is simpler and reuses infrastructure already being built (Realtime) rather than adding a new provider.

**Version Control**
- **What it is:** Git — already the actual working process (feature/the-hangar branch, isolated from `/destud`, per every Claude Code prompt in this build). Not a runtime integration Mission Agent calls — it's how the code and schema changes themselves get tracked.
- **Role in Mission Agent:** none at runtime. Worth listing here only because the original architecture diagram did — it's development process, not a service Mission Agent integrates with while running.
- **On DVC/LFS:** the reference slide also lists DVC and Git LFS (large-file/data versioning) alongside Git. Neither applies here — Mission Agent has no large binary assets or dataset versioning need; uploaded documents (Section 6, File Storage) live in Supabase Storage, not in the Git repo.

**Monitoring**
- **What it is:** undecided specifically for Mission Agent. The broader DeStud tech stack context mentions Prometheus + Grafana generally, but nothing in this document has wired Mission Agent's own metrics (LLM call latency, error rates per stage) into any monitoring tool yet.
- **Role in Mission Agent:** would surface things like "Stage 2.2 is timing out more than usual" before a user reports it. Distinct from `Hangar_agent_runs` (Section 9), which is per-run audit data, not aggregated operational metrics.
- **Status:** not built. `Hangar_agent_runs` already gives you the raw data (duration_ms, status per stage) — real monitoring would be built as queries/dashboards over that table, not a separate data pipeline, at least initially.

## 7. Outputs & Consumers

**Consumed by:** Concept Agent, Aircraft Design Agent, all downstream agents (indirectly, via shared memory).

**Stored in:** `Hangar_missions` + `Hangar_mission_specs` (Mission DB — Section 10.0), `Hangar_knowledge_base` once built (Knowledge Base, Phase 2). Not Projects DB — same correction as Section 8.0: the original reference lists Projects DB here too, and it doesn't exist in this architecture (Section 16).

## 8. Agent Execution Flow — User Input to Event Published

### 8.0 Reference Diagram — Original Architecture

This is the source reference (DeStud internal architecture deck, "4. Agent Execution Flow"), transcribed exactly:

```
1. User Input Received          (UI / Chat / API)
2. Input Parsed & Context Loaded (Intent, Entities, RAG)
3. Mission Reasoning & Planning  (Decomposition, Constraints, KPIs)
4. Outputs Generated             (Specs, Constraints, KPIs)
5. Outputs Validated             (Rules, Consistency Check)
6. Persisted to Datastores       (Mission DB, Projects DB)
7. Published to Event Bus        (For downstream agents)
```

**One correction against this reference, carried over from an earlier decision:** Step 6 names "Projects DB" — Section 16's Decisions Log already resolved that this doesn't exist as a separate store; "Existing Projects" means past Hangar missions, and persistence in this architecture is to `Hangar_missions`/`Hangar_mission_specs` only (Section 10.0). The reference diagram predates that resolution — Step 6 below should read "Mission DB" only.

### 8.1 How the 7 Reference Steps Map to the Detailed Stages

| Reference step | Maps to | Detail in |
|---|---|---|
| 1. User Input Received | Sources added, `Hangar_missions` created | Section 3, Section 12 |
| 2. Input Parsed & Context Loaded | Stage 2.1 — Input Processing | Section 4.1.1 |
| 3. Mission Reasoning & Planning | Stage 2.2 | Section 4.2.1 |
| 4. Outputs Generated | Stage 2.3, Steps 1–3 (spec/constraints/KPIs) | Section 4.3.1 |
| 5. Outputs Validated | Folded into Stage 2.1 Step 4 (rules engine) — not a separate stage in this implementation | Section 4.1.1 |
| 6. Persisted to Datastores | Stage 2.4, component #0 (Persistence) | Section 4.4.1 |
| 7. Published to Event Bus | Stage 2.4, component #4 (Event Publish) | Section 4.4.3 |

**Confirmed:** the reference shows "Outputs Validated" as its own step (5), separate from "Outputs Generated" (4). In this implementation, validation is intentionally folded into Stage 2.1 instead — the rules engine validates continuously as data comes in (Section 4.1.1, Step 4), rather than as one discrete pass after generation. This is a deliberate architectural choice, not a gap against the reference: catching a bad value at intake, before three more stages build on top of it, is strictly better than catching it after generation and having to unwind downstream work. There is no standalone "step 5" in the built pipeline, and there shouldn't be one.

### 8.2 Full Detailed Walkthrough — User Input to Event Published

The full path, start to finish, cross-referenced to where each step is actually specified in detail:

```
 User adds sources (Section 3)
        │
        ▼
 "Process Mission" clicked
        │
        ▼
 Hangar_missions row created — status: draft (Section 12 ordering requirement)
        │
        ▼
 Server route calls runMissionAgent(missionId, sources) — server-side only (12.1)
        │
        ▼
 ┌─────────────────────────────────────────────────────────────┐
 │  STAGE 2.1 — Input Processing (4.1.1)                        │
 │  Group sources → Direct reference resolution → Combined LLM  │
 │  call (intent + entities) → RAG (stubbed, [] today) →        │
 │  Rules engine (validate/normalize)                            │
 │  Output: ParsedMissionInput   →  logged: Hangar_agent_runs    │
 └─────────────────────────────────────────────────────────────┘
        │
        ▼
 ┌─────────────────────────────────────────────────────────────┐
 │  STAGE 2.2 — Reasoning & Planning (4.2.1)                     │
 │  Decomposition → Constraint ID (domain rules + LLM) →         │
 │  KPI derivation → Trade-off prioritization (deterministic)    │
 │  Output: MissionReasoningResult → logged: Hangar_agent_runs   │
 └─────────────────────────────────────────────────────────────┘
        │
        ▼
 ┌─────────────────────────────────────────────────────────────┐
 │  STAGE 2.3 — Output Generation (4.3.1)                        │
 │  Spec + Constraints + KPIs (parallel, order-independent) →    │
 │  Mission Summary (LLM, waits for all three) →                 │
 │  Confidence Score (computed last)                              │
 │  Output: MissionSpec  →  logged: Hangar_agent_runs             │
 └─────────────────────────────────────────────────────────────┘
        │
        ▼
 ┌─────────────────────────────────────────────────────────────┐
 │  STAGE 2.4 — Output Interface (4.4.1)                          │
 │  Persistence (blocking) → Hangar_mission_specs                 │
 │       │                                                        │
 │       ├──► API response (synchronous, caller awaits)           │
 │       ├──► Export stub (v2, not built — 4.4.2)                 │
 │       └──► Event Publish stub (4.4.3)                          │
 └─────────────────────────────────────────────────────────────┘
        │
        ▼
 Dashboard View renders the API response (13.1)
        │
        ▼
 User reviews → "Save as final" (status: finalized) or
                "Edit and regenerate" (new version) — (13.2)
        │
        ▼
 mission.spec_ready published to Hangar_events (4.4.3)
        │
        ▼
 Concept Agent (Bay 02) subscribes, fetches by mission_id (17)
```

**What's real today vs. planned — cross-check against Section 14.** Every box above is fully *specified*; not every box is *built*. As of this document: the intake UI exists as a mockup (not wired to a backend), RAG returns `[]` by design, Export is deferred (v2), and Event Publish is a stub — there is no real Concept Agent subscribing yet. This diagram shows the complete intended path; Section 14's Build Status table is the source of truth for what's actually running.

## 9. Observability & Governance

Logging · Tracing (LangSmith / OpenTelemetry) · Evaluation · Guardrails · Access control (RBAC) · Audit trail · Data lineage · Cost tracking

### 9.1 Each Item, Explained

**Logging**
- **Layer:** application-level — every stage's execution within a mission run.
- **Where stored:** `Hangar_agent_runs` (Section 10) — already built. Input/output snapshots, status, duration per stage, via `logStageRun` (Section 12).
- **Tool:** none needed beyond the table itself — plain structured inserts, not a third-party service. Vercel's own function logs (included, no setup) catch anything printed to console as a free secondary layer.
- **Open source?** N/A — it's your own schema, not a product to adopt.

**Tracing**
- **Layer:** following one mission's full LLM call graph — all 4 calls (Section 5.1), their prompts, tokens, and latency, connected as one trace rather than 4 disconnected log rows.
- **Where stored:** depends on tool choice — see below.
- **Open source options:** **OpenTelemetry** (CNCF project, fully open, vendor-neutral standard) paired with an open-source backend like **Jaeger** or **Grafana Tempo** to actually store/view traces. **LangSmith** (from LangChain) is the LLM-specific alternative — purpose-built, nicer prompt/completion views, but proprietary SaaS (has a free tier, not open source).
- **Distinction worth knowing:** `Hangar_agent_runs` already gives you a lightweight, home-grown version of this — per-stage status and duration, queryable directly. Real distributed tracing infrastructure is a step up from that, not a replacement for it.

**Evaluation**
- **Layer:** quality of LLM outputs over time — is intent detection actually accurate, does `confidence_score` correlate with real spec quality across many missions.
- **Where stored:** manual review needs no storage (a person periodically samples missions); automated eval results would need their own table once that stage is reached.
- **Open source options:** **promptfoo** (npm-based LLM eval framework) or **Ragas** (RAG-specific evaluation) — both open source, both need real mission volume to be meaningful.

**Guardrails**
- **Layer:** input/output safety — preventing prompt injection via `mission_brief` text, catching wildly-out-of-bounds LLM output.
- **Where it already partially exists:** Section 4.1's structured/JSON-mode LLM output plus the rules engine's `validateRange`/`flagMissingRequired` (Section 4.1, Section 4.2.1's KPI bounds table) already function as a guardrail — hallucinated values get caught, just not under this label.
- **Open source options if a dedicated layer is ever needed:** **Guardrails AI** or **NeMo Guardrails** (NVIDIA) — both open source.

**Access Control (RBAC)**
- **Layer:** who can read/write what.
- **Where enforced:** Supabase RLS (Section 10.1) — already built, Postgres-native, open source by virtue of being a Postgres feature. Every policy checks `auth.uid()` against `Hangar_missions.user_id`.
- **What's NOT covered yet:** admin/support roles — e.g. a TorqWings staff member needing to view a user's mission for support purposes. No such role exists in the current schema; every policy is strictly "you see your own."

**Audit Trail**
- **Layer:** two distinct things, worth not conflating — *what did the agent do* vs. *what did the user do*.
- **Agent-level (built):** `Hangar_agent_runs` — every stage, every run, already an audit trail.
- **User-level (partially covered):** `Hangar_missions.status` + its `updated_at` trigger (Section 10) implicitly captures lifecycle changes (draft → spec_ready → finalized), but there's no dedicated log of *which user action* caused each transition — e.g. distinguishing "Save as final" from "Edit and regenerate" (Section 13.2) after the fact.

**Data Lineage**
- **Layer:** tracing any value in the final spec back to where it came from.
- **Where it already lives:** this isn't a separate tool — it's built into the data model itself. `constraints[].sources[]` (Section 4.3) and `identified_constraints[].source` (Section 4.2.1) carry lineage inline, in the data, rather than needing a dedicated lineage system bolted on afterward.
- **What's missing:** a UI to actually walk that chain visually (click a KPI, see its full derivation path) — the data supports it, nothing renders it yet.

**Cost Tracking**
- **Layer:** LLM API spend — 4 calls per mission (Section 5.1) adds up at volume.
- **Where stored today:** nowhere Hangar-specific — the LLM provider's own dashboard (Anthropic Console / OpenAI usage page) shows aggregate spend with zero setup.
- **Open source options for a dedicated layer:** **Langfuse** (open source, full LLM observability including cost) or **Helicone** (open source LLM usage/cost proxy) — both would sit in front of the LLM calls and track token/cost per request, joinable back to `mission_id`.

### 9.2 Phase 1 vs. Phase 2 — Prioritized by Actual Need

| Item | Phase | Why |
|---|---|---|
| Logging | **Phase 1 — done** | `Hangar_agent_runs` already covers this; it's also how Section 12.1's "no silent failures" rule gets enforced. |
| Access Control (RBAC) | **Phase 1 — done** | RLS (Section 10.1) already built; nothing runs without it given every table has per-user data. |
| Data Lineage | **Phase 1 — done, by design** | Already baked into the JSON shapes (`sources[]`), not a bolt-on system to build separately. |
| Basic Guardrails | **Phase 1 — done, implicitly** | Structured output + the rules engine already catch the failure modes that matter most (hallucinated values, malformed extraction). |
| Basic Audit Trail | **Phase 1 — mostly done** | Agent-level via `Hangar_agent_runs`; user-level is a thinner gap, not urgent. |
| Tracing | **Phase 2** | `Hangar_agent_runs` already gives adequate per-stage visibility for one agent; full distributed tracing earns its cost once there's real concurrent production traffic to debug. |
| Evaluation | **Phase 2** | Needs real mission volume to evaluate against — building this before there's data to evaluate is premature. |
| Dedicated Cost Tracking | **Phase 2** | The LLM provider's own dashboard is sufficient until cost becomes a per-user or per-mission concern (e.g. usage-based billing). |
| Admin/Support RBAC roles | **Phase 2** | No support workflow exists yet that would need cross-user visibility — build when that workflow is actually needed, not speculatively. |
| Dedicated user-action audit log | **Phase 2** | `Hangar_missions.status` changes already give a coarse trail; a fine-grained one matters more once compliance or support needs grow. |
| Lineage visualization UI | **Phase 2** | The underlying data already supports it (Phase 1); rendering it is a UI investment, not infrastructure. |

Minimum for beta: every stage run writes one row to `Hangar_agent_runs` (see schema below) — that alone gives you input/output snapshots, timing, and pass/fail per run without standing up a full observability stack.

## 10. Supabase Table Schema

All Hangar tables are prefixed `Hangar_` to keep them clearly separate from existing `Destud_*` tables — no shared schema, no risk of collision. Same Supabase project, new namespace.

### 10.0 What These Stores Actually Are

The original architecture named eight conceptual stores. Only two are actually built as of this document; the rest range from "resolved away" to "a real gap worth fixing." Precise status before the raw SQL below:

| Store | Role | Loaded earlier or generated live? | Status |
|---|---|---|---|
| **Mission DB** | The mission record itself + its generated spec | Generated live — one record per mission run | ✅ Built |
| **Projects DB** | Umbrella "project" grouping multiple missions together | N/A | ❌ Doesn't exist — resolved, Section 16 |
| **Knowledge Base** | Semantic search corpus for RAG (past missions, design rules, glossaries) | **Loaded earlier** — must be pre-ingested/embedded before Stage 2.1 can retrieve anything | 🟡 Stubbed — Phase 2 (Section 4.1.1) |
| **Concept DB** | Originally: Mission Agent reads existing concepts for reference | Would be loaded earlier, populated by Concept Agent over time | ❌ Not built — see note below |
| **Regulations DB** | Master catalog of available regulations (FAR 107, EASA SORA, DGCA CAR, MIL-STD-810) that populate the intake UI and the domain rules table | **Should be loaded earlier** | ❌ Real gap — see note below |
| **Market Data DB** | Master catalog of market/domain data connectors | **Should be loaded earlier** | ❌ Real gap — see note below |
| **User Preferences DB** | Org-level standards/templates/defaults | Loaded earlier, org-admin configured | ❌ Not built at all |
| **Audit / Logs DB** | Every stage's run — input/output snapshots, timing, pass/fail | Generated live, append-only | ✅ Built |

**On "Projects DB":** the Decisions Log (Section 16) already resolved this — Hangar has no external Projects table dependency at all. "Existing Projects" in the intake UI means *past Hangar missions*, not a separate project-grouping concept, so `Hangar_mission_project_imports` references `Hangar_missions` itself, below.

**On "Concept DB":** originally something Mission Agent would read from. Its intended purpose got absorbed into the self-referential "Existing Projects" mechanism once Section 16 resolved what that source actually means. It becomes relevant again once Concept Agent (Bay 02) exists and produces something worth referencing back — a real future need, not part of this document's build.

**On "Regulations DB" and "Market Data DB" — the two that were quietly not real.** The intake UI's Regulations and Market Data checkboxes (Section 3, sources 5 and 6) look like they're backed by a real dataset — they aren't. They're hardcoded directly in the `mission-agent.html` mockup, and the domain rules table's `REG-001`–`REG-004` (Section 4.2.1) reference regulation names as plain strings, not foreign keys to anything. Nothing is actually "loaded earlier" today — nothing is loaded at all. **Fixed below:** `Hangar_regulations_catalog` and `Hangar_market_data_catalog`, seeded reference tables that the intake UI and the domain rules should read from instead of hardcoded values — see the schema. `Hangar_mission_regulations` now references the catalog by `code` rather than duplicating `name`/`region` as free text on every mission row, so a catalog correction applies everywhere at once instead of needing an edit on every mission that ever selected it.

**Mission DB — Supabase Postgres, no extensions needed.**
- Written by: the intake UI creates the `Hangar_missions` row before the pipeline runs (Section 12's ordering requirement); Stage 2.4's Persistence step (Section 4.4.1, component #0) writes the finished spec to `Hangar_mission_specs`.
- Read by: the Structured Data API / Dashboard View (Section 4.4.1, #1/#2); Concept Agent (Bay 02), per the Handover section (17).

**Knowledge Base — Supabase Postgres + pgvector, populated via an embedding model (e.g. `text-embedding-3-small`).**
- Written by: nothing today. Once built, this needs a *separate ingestion process* — not part of Mission Agent's own pipeline — that embeds content: likely finalized `MissionSpec`s over time, plus TorqWings' own design rules and domain glossaries.
- Read by: Stage 2.1's Context Retrieval (Section 4.1.1, Step 3) — currently always returns `[]`.

**Regulations DB / Market Data DB — Supabase Postgres, no extensions needed.**
- Written by: nobody at runtime — these are curated, service-role-maintained reference tables (seeded ahead of time, updated occasionally by an admin, not generated by any mission).
- Read by: the intake UI (to populate the Regulations/Market Data checkboxes for real, instead of hardcoded HTML) and the domain rules table's lookups (Section 4.2.1).

```sql
-- Core mission record
create table Hangar_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  mission_code text unique,                       -- Hangar-native generated code, see trigger below
  status text not null default 'draft'
    -- spec_ready = version 1 generated, awaiting review on the dashboard (13.2)
    -- finalized = user clicked "Save as final" -- distinct from spec_ready
    -- so the mission lifecycle actually reflects the review step, not just generation
    check (status in ('draft','processing','spec_ready','finalized','error')),
  source_types_used text[] not null default '{}',
  confidence_score numeric null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Generates a human-readable mission_code: first 8 chars of user_id + YY + HH + MI + SS + 2 random chars
-- e.g. user_id 'a1b2c3d4-...' created 2026-08-04 14:32:07 -> 'A1B2C3D4261432079F'
-- SS (seconds) + a 2-char random suffix guard against collisions when the same
-- user creates two missions inside the same minute (e.g. retry after an error).
-- Hangar is standalone (no Design Studio Projects table dependency), so this
-- code is the mission's own identity, not a foreign reference.
create or replace function generate_hangar_mission_code()
returns trigger language plpgsql as $$
begin
  new.mission_code := upper(substr(new.user_id::text, 1, 8)) ||
                       to_char(new.created_at, 'YY') ||
                       to_char(new.created_at, 'HH24') ||
                       to_char(new.created_at, 'MI') ||
                       to_char(new.created_at, 'SS') ||
                       upper(substr(md5(random()::text), 1, 2));
  return new;
end;
$$;

create trigger trg_hangar_mission_code
before insert on Hangar_missions
for each row execute function generate_hangar_mission_code();

-- Keeps updated_at current on every write — the column's default only
-- fires on insert, so without this trigger it would stay frozen forever.
create or replace function set_hangar_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_hangar_missions_updated_at
before update on Hangar_missions
for each row execute function set_hangar_updated_at();

-- One row per input source added to a mission
create table Hangar_mission_sources (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references Hangar_missions(id) on delete cascade,
  source_type text not null
    check (source_type in ('natural_language','document','requirements_form','existing_project','regulations','market_data')),
  raw_input jsonb not null,
  added_at timestamptz not null default now()
);

-- Uploaded documents (source type: document)
create table Hangar_mission_documents (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references Hangar_missions(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  file_type text not null,
  extracted_text text null,
  uploaded_at timestamptz not null default now()
);

-- Reference catalogs -- these are seeded ahead of time (loaded earlier),
-- not generated per mission. The intake UI's Regulations and Market Data
-- checkboxes should read from these instead of the hardcoded lists in the
-- current mockup -- see Section 10.0 for why this matters.
create table Hangar_regulations_catalog (
  code text primary key,              -- e.g. 'FAR_107'
  name text not null,                 -- e.g. 'FAR Part 107'
  region text not null,
  description text null,
  active boolean not null default true
);

create table Hangar_market_data_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text null,
  data_source text null,
  active boolean not null default true
);

-- Selected regulations (source type: regulations)
-- References the catalog above by code rather than duplicating name/region
-- as free text on every mission -- a catalog update (e.g. fixing a typo in
-- a regulation's name) now applies everywhere at once instead of needing
-- an edit on every mission row that ever selected it.
create table Hangar_mission_regulations (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references Hangar_missions(id) on delete cascade,
  regulation_code text not null references Hangar_regulations_catalog(code)
);

-- Imported past missions (source type: existing_project)
-- "Existing Projects" in the intake UI means past Hangar missions, not
-- Design Studio projects -- The Hangar has no dependency on that table.
create table Hangar_mission_project_imports (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references Hangar_missions(id) on delete cascade,
  imported_mission_id uuid not null references Hangar_missions(id),
  imported_at timestamptz not null default now()
);

-- Final structured output (Stage 2.3 result)
create table Hangar_mission_specs (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references Hangar_missions(id) on delete cascade,
  version int not null default 1,
  mission_specs jsonb not null,
  constraints jsonb not null default '[]',
  kpis jsonb not null default '[]',
  summary text not null,
  confidence_score numeric not null,
  created_at timestamptz not null default now()
);

-- Per-stage execution log (observability)
create table Hangar_agent_runs (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references Hangar_missions(id) on delete cascade,
  agent_id text not null default 'MISSION_AGENT',
  stage text not null
    check (stage in ('2.1_input_processing','2.2_reasoning_planning','2.3_output_generation','2.4_output_interface')),
  input_snapshot jsonb null,
  output_snapshot jsonb null,
  status text not null check (status in ('success','error')),
  error_message text null,
  duration_ms int null,
  created_at timestamptz not null default now()
);

-- Bay-level status tracker for The Hangar's circuit diagram (optional, replaces hardcoded JS)
create table Hangar_agent_status (
  agent_id text primary key,
  bay_number int not null,
  status text not null check (status in ('online','design')),
  route text null,
  updated_at timestamptz not null default now()
);
```

### 10.1 Row Level Security

Every `Hangar_*` table with a `user_id` (directly or via `mission_id`) gets RLS enabled and an explicit policy — this is non-negotiable given the exact class of bug already hit once with `destud_users` (no SELECT policy for anon → silent empty results that look like "no data" rather than "no permission"). Policies below assume Hangar's own auth (see Section 10.2) populates `auth.uid()` the same way any Supabase-authenticated session does.

```sql
-- Hangar_missions: users can only see/modify their own missions
alter table Hangar_missions enable row level security;

create policy "Users manage their own missions"
on Hangar_missions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Child tables have no direct user_id column — ownership is checked via
-- their parent mission_id. Same pattern repeats across all five below.

alter table Hangar_mission_sources enable row level security;
create policy "Users manage sources on their own missions"
on Hangar_mission_sources
for all
using (mission_id in (select id from Hangar_missions where user_id = auth.uid()))
with check (mission_id in (select id from Hangar_missions where user_id = auth.uid()));

alter table Hangar_mission_documents enable row level security;
create policy "Users manage documents on their own missions"
on Hangar_mission_documents
for all
using (mission_id in (select id from Hangar_missions where user_id = auth.uid()))
with check (mission_id in (select id from Hangar_missions where user_id = auth.uid()));

alter table Hangar_mission_regulations enable row level security;
create policy "Users manage regulations on their own missions"
on Hangar_mission_regulations
for all
using (mission_id in (select id from Hangar_missions where user_id = auth.uid()))
with check (mission_id in (select id from Hangar_missions where user_id = auth.uid()));

alter table Hangar_mission_project_imports enable row level security;
create policy "Users manage imports on their own missions"
on Hangar_mission_project_imports
for all
using (mission_id in (select id from Hangar_missions where user_id = auth.uid()))
with check (mission_id in (select id from Hangar_missions where user_id = auth.uid()));

alter table Hangar_mission_specs enable row level security;
create policy "Users view specs on their own missions"
on Hangar_mission_specs
for select
using (mission_id in (select id from Hangar_missions where user_id = auth.uid()));
-- Insert/update on this table happens server-side (the pipeline, using the
-- service role key, which bypasses RLS) — no client-side write policy needed.

alter table Hangar_agent_runs enable row level security;
create policy "Users view run logs on their own missions"
on Hangar_agent_runs
for select
using (mission_id in (select id from Hangar_missions where user_id = auth.uid()));
-- Same as above: writes are server-side only, via service role.

-- Hangar_agent_status has no per-user ownership — it's a shared, public
-- read table driving the circuit diagram for every visitor.
alter table Hangar_agent_status enable row level security;
create policy "Anyone can read bay status"
on Hangar_agent_status
for select
using (true);
-- No insert/update/delete policy — only the service role (admin tooling) writes this.

-- Same public-read pattern for the two catalogs -- every authenticated user
-- needs to see the full regulation/market-data list to populate the intake
-- UI's checkboxes, and neither carries per-user data.
alter table Hangar_regulations_catalog enable row level security;
create policy "Anyone can read the regulations catalog"
on Hangar_regulations_catalog
for select
using (true);

alter table Hangar_market_data_catalog enable row level security;
create policy "Anyone can read the market data catalog"
on Hangar_market_data_catalog
for select
using (true);
-- Both catalogs: no insert/update/delete policy -- only service role (admin
-- tooling) maintains them. This is seeded/curated reference data, not
-- something any mission or user writes to.
```

### 10.2 Auth — Decoupled from Destud

Hangar does **not** read, write, or depend on `Destud_user` in any way — no shared table, no shared logic, no fallback to it. This was already true of the Flight Deck isolation work; this section makes it explicit at the schema level too.

`user_id uuid references auth.users(id)` uses Supabase's own built-in auth table — this is the standard identity layer any Supabase-authenticated session already populates, not a dependency on Destud's user model. Flight Deck's real (non-stub) implementation should authenticate against `auth.users` directly (e.g. `supabase.auth.signInWithPassword` or magic link), giving Hangar its own fully independent sign-in path. If Hangar later needs its own profile/tier data the way `Destud_user` does for Design Studio, that becomes a new `Hangar_user_profiles` table — not a reuse of `Destud_user` — but nothing in this spec requires that yet.

**Notes:**
- `mission_code` is generated by the `trg_hangar_mission_code` trigger at insert time — human-readable, unique, and self-contained within The Hangar (no dependency on Design Studio's Projects table, since The Hangar is a standalone surface — see Section 16).
- **Implementation note:** `mission_code` is built via a `plpgsql` trigger, not a Postgres generated column, deliberately. Generated columns require immutable expressions, and `to_char()` on a timestamp isn't immutable — so a generated-column version of this would fail. Keep it as a `before insert` trigger; don't "simplify" it into a generated column.
- `imported_mission_id` in `Hangar_mission_project_imports` references `Hangar_missions` itself — "Existing Projects" in the intake UI means past Hangar missions a user has already run, not Design Studio projects.
- Apply via SQL Editor per your existing workflow. Flag: this hits the shared dev/prod Supabase project immediately — worth doing this after the dev/prod split, not before, per your own non-negotiable. Confirmed: all `Hangar_*` tables land only after that split.
- `Hangar_mission_specs` is versioned (`version` column) rather than overwritten, so a re-run doesn't destroy the previous spec — useful once the review/edit step exists.
- **Follow-up needed:** `mission-agent.html`'s Regulations and Market Data panels currently render hardcoded checkbox options. Once `Hangar_regulations_catalog`/`Hangar_market_data_catalog` are seeded, those panels should fetch their options from these tables instead — otherwise the schema fix here doesn't actually reach the UI it was meant to fix.

## 11. Interface Contract (I/O)

**Input schema (abstract shape).** This is what `runMissionAgent` actually receives — an array of sources (Section 3), not a single flat object. Matches `MissionSourceInput` in Section 12:
```json
{
  "mission_id": "uuid",
  "sources": [
    {
      "source_type": "natural_language | document | requirements_form | existing_project | regulations | market_data",
      "raw_input": { "...": "..." }
    }
  ]
}
```

**Input — realistic filled example.** Same crop-survey mission used throughout this document — natural language plus a requirements form plus one selected regulation, combined (Section 3: sources are additive):
```json
{
  "mission_id": "b7e4a1c2-9f3d-4e21-8a6b-5c9d2f1e8a4b",
  "sources": [
    {
      "source_type": "natural_language",
      "raw_input": {
        "text": "We need a fixed-wing platform for crop health surveys across 200 hectares, under 25kg, 90 min endurance."
      }
    },
    {
      "source_type": "requirements_form",
      "raw_input": {
        "payload_kg": 25,
        "endurance_min": 90,
        "operating_environment": "Agricultural / rural"
      }
    },
    {
      "source_type": "regulations",
      "raw_input": {
        "regulation_codes": ["FAR_107"]
      }
    }
  ]
}
```

**Output schema (abstract shape):**
```json
{
  "mission_id": "uuid",
  "mission_specs": { "...": "..." },
  "constraints": [
    { "name": "string", "value": "string", "sources": ["string"] }
  ],
  "kpis": [
    { "name": "string", "target": "string", "unit": "string", "priority": "critical | number" }
  ],
  "summary": "string",
  "confidence_score": 0.92
}
```

**Output — realistic filled example.** Same crop-survey mission used throughout this document, shown as an actual instance rather than a shape:
```json
{
  "mission_id": "b7e4a1c2-9f3d-4e21-8a6b-5c9d2f1e8a4b",
  "mission_specs": {
    "domain": "UAV",
    "vertical": "AgriSky",
    "vehicle_class": "Fixed-wing",
    "mission_type": "Aerial crop health monitoring",
    "phase": "Conceptual",
    "operating_environment": "Agricultural / rural"
  },
  "constraints": [
    { "name": "Max altitude", "value": "122m", "sources": ["REG-001"] },
    { "name": "Max payload weight", "value": "25kg", "sources": ["REG-003", "FORM-001"] },
    { "name": "VLOS required", "value": "true", "sources": ["REG-001"] },
    { "name": "Spray-drift avoidance", "value": "Low-altitude flight path required", "sources": ["DOM-001"] }
  ],
  "kpis": [
    { "name": "Payload", "target": "25", "unit": "kg", "priority": "critical" },
    { "name": "Endurance", "target": "90", "unit": "min", "priority": 1 },
    { "name": "Range", "target": "40", "unit": "km", "priority": 2 },
    { "name": "Cost", "target": "450000", "unit": "INR", "priority": 3 }
  ],
  "summary": "This mission targets aerial crop health monitoring across agricultural land using a fixed-wing platform. Operating under FAR Part 107, the design must stay within a 25kg payload and 122m altitude ceiling while achieving 90 minutes of endurance and 40km range at a cost target of ₹4.5L. Low-altitude flight paths are required to avoid spray drift.",
  "confidence_score": 0.87
}
```

Two things worth reading off this example: the "Max payload weight" constraint carries two source tags (`REG-003` and `FORM-001`) — this is Section 4.3's dedup logic in action, where two different rules independently produced the same constraint and got merged rather than duplicated. And `Payload`'s `priority` is `"critical"` (string) while `Range`'s is `2` (number) — the two valid states of that field per the `'critical' | number` type in Section 12.
```

## 12. Sample Source Files

Skeletons only — types and function signatures, not full implementations. These are the shapes Claude Code should build against.

### 12.1 Execution Architecture — Server-Side Only

Every function in `pipeline/mission-agent.pipeline.ts` runs **server-side** — never in the browser. This is not a style preference, it's a hard requirement, for two independent reasons:

1. **LLM API keys.** `processInput` and `reasonAndPlan` call the LLM directly. If that code runs client-side, the API key ships inside the JS bundle to every visitor. The existing `VITE_ANTHROPIC_API_KEY` pattern used for Academy's quiz generator is acceptable there because it's low-stakes and read-only — it is **not** acceptable here, since this pipeline writes real user data to `Hangar_mission_specs`. Use a server-only env var (no `VITE_` prefix) accessed only from a server route/function.
2. **Supabase service role key.** `logStageRun` and `publishOutput` need to write to `Hangar_mission_specs` and `Hangar_agent_runs` — tables where Section 10.1's RLS policies intentionally have no client-side insert/update policy (only `select`, scoped to the mission's owner). The only way those writes succeed is via `SUPABASE_SERVICE_ROLE_KEY`, which bypasses RLS entirely — and that key must never reach the client, or RLS on every Hangar table becomes theater.

**Concretely:** the intake UI's "Process Mission" button calls a server route (a TanStack Router server function, or a Vercel serverless/API route — whichever this codebase already uses for similar server-side work) which runs `runMissionAgent` internally and returns the finished `MissionSpec` to the client. The client never imports `mission-agent.pipeline.ts` directly, and never sees an LLM or service-role key.

**Other pipeline-level design rules:**
- **Validate before calling the LLM**, not after. The rules-engine checks (Section 4.1) that catch empty or nonsense input should run first, so a bad submission fails fast without burning an API call.
- **Idempotent mission creation.** The `Hangar_missions` row is created once, before `runMissionAgent` is invoked — not inside it (see the ordering requirement below). If "Process Mission" is clicked twice on the same intake, that's a UI-level double-submit guard (disable the button while processing), not a pipeline concern.
- **No silent failures.** Every stage's error is logged to `Hangar_agent_runs` (see `logStageRun`) and surfaced to the UI as a real error state — never a blank screen or a spinner that hangs forever.

**`types/hangar-mission.ts`**
```typescript
export type SourceType =
  | 'natural_language'
  | 'document'
  | 'requirements_form'
  | 'existing_project'
  | 'regulations'
  | 'market_data';

export interface MissionSourceInput {
  sourceType: SourceType;
  rawInput: Record<string, unknown>;
}

export interface ParsedMissionInput {
  rawTextCombined: string;
  sourceTypesUsed: SourceType[];
  detectedIntent: string;
  extractedEntities: {
    payloadHint: string | null;
    rangeHint: string | null;
    enduranceHint: string | null;
    constraintHints: string[];
  };
  attachedRegulations: string[];
  importedMissionRef: string | null;
  validationFlags: string[];
}

export interface MissionReasoningResult {
  decomposedElements: string[];
  identifiedConstraints: { name: string; value: string; source: 'user' | 'regulation' | 'inferred' }[];
  derivedKpis: { name: string; target: string; unit: string }[];
  prioritizedTradeoffs: { item: string; rationale: string }[];
}

export interface MissionSpec {
  missionId: string;
  missionSpecs: Record<string, unknown>;
  constraints: { name: string; value: string; sources: string[] }[];
  kpis: { name: string; target: string; unit: string; priority: 'critical' | number }[];
  summary: string;
  confidenceScore: number;
}
```

**`pipeline/mission-agent.pipeline.ts`**

> **Ordering requirement:** a `Hangar_missions` row (and its `Hangar_mission_sources` rows) must already exist before `runMissionAgent` is called — the pipeline consumes an existing `missionId`, it does not create the mission record itself. The caller (the intake UI's "Process Mission" action) is responsible for that insert first.
>
> **Logging requirement:** per Section 9, every stage writes one row to `Hangar_agent_runs` — win or fail. The skeleton below shows this explicitly via `logStageRun(...)`, wrapping each stage call rather than leaving it implicit.

```typescript
import type {
  MissionSourceInput,
  ParsedMissionInput,
  MissionReasoningResult,
  MissionSpec,
} from '../types/hangar-mission';

// Logs one row to Hangar_agent_runs for a given stage — called by runMissionAgent
// around every stage, so success and failure are both always recorded.
async function logStageRun(
  missionId: string,
  stage: '2.1_input_processing' | '2.2_reasoning_planning' | '2.3_output_generation' | '2.4_output_interface',
  input: unknown,
  output: unknown,
  status: 'success' | 'error',
  durationMs: number,
  errorMessage?: string
): Promise<void> {
  throw new Error('not implemented'); // insert into Hangar_agent_runs
}

// Stage 2.1 — Input Processing
// LLM intent + entity extraction, RAG context retrieval, rules-engine validation.
export async function processInput(
  sources: MissionSourceInput[]
): Promise<ParsedMissionInput> {
  throw new Error('not implemented');
}

// Stage 2.2 — Reasoning & Planning
// LLM decomposition, constraint identification, KPI derivation, trade-off prioritization.
export async function reasonAndPlan(
  parsed: ParsedMissionInput
): Promise<MissionReasoningResult> {
  throw new Error('not implemented');
}

// Stage 2.3 — Output Generation
// Assembles the structured MissionSpec from the reasoning result.
export async function generateOutput(
  reasoning: MissionReasoningResult,
  missionId: string
): Promise<MissionSpec> {
  throw new Error('not implemented');
}

// Stage 2.4 — Output Interface
// Persists to Hangar_mission_specs, logs the run, publishes to the event bus.
export async function publishOutput(spec: MissionSpec): Promise<void> {
  throw new Error('not implemented');
}

// Orchestrator — connects all four stages in strict sequence.
// Requires an existing missionId (see ordering requirement above).
// Each stage is individually timed and logged to Hangar_agent_runs, on both
// success and failure, so a failure at any stage is traceable to that stage
// specifically rather than surfacing as one opaque pipeline failure.
export async function runMissionAgent(
  missionId: string,
  sources: MissionSourceInput[]
): Promise<MissionSpec> {
  let start = Date.now();
  try {
    const parsed = await processInput(sources);
    await logStageRun(missionId, '2.1_input_processing', sources, parsed, 'success', Date.now() - start);

    start = Date.now();
    const reasoning = await reasonAndPlan(parsed);
    await logStageRun(missionId, '2.2_reasoning_planning', parsed, reasoning, 'success', Date.now() - start);

    start = Date.now();
    const spec = await generateOutput(reasoning, missionId);
    await logStageRun(missionId, '2.3_output_generation', reasoning, spec, 'success', Date.now() - start);

    start = Date.now();
    await publishOutput(spec);
    await logStageRun(missionId, '2.4_output_interface', spec, null, 'success', Date.now() - start);

    return spec;
  } catch (err) {
    // Illustrative only — track the actual current stage in a variable and
    // log against that, rather than hardcoding one stage as shown here.
    await logStageRun(missionId, '2.1_input_processing', sources, null, 'error', Date.now() - start, String(err));
    throw err;
  }
}
```

## 13. UI / UX Design

Reference mockup: `mission-agent.html` — functional intake screen, not a marketing/doc page.

**Layout:** left rail lists all six input sources; selecting one swaps the main panel to that source's dedicated input surface. Sources are additive — each has its own "Add to mission" action, which checks it off in the rail and increments a running counter at the bottom of the screen. "Process Mission →" activates once at least one source is added.

The internal 4-stage architecture is intentionally **not** shown on this screen — it lives in this document, not the working UI. The screen is for doing the work, not explaining how the work happens.

### 13.1 Dashboard View — Content Spec

This is Stage 2.4's Dashboard View channel (Section 4.4.1, component #2) — currently unbuilt, no results display exists anywhere in the UI yet. Content, in reading order:

1. **Header strip** — mission code/title (from `mission_specs`), a status badge, and `confidence_score` shown prominently (e.g. `92%` with a label), not buried in a details panel.
2. **Mission Summary** — the `summary` string. Reads first, deliberately — it's the one field written specifically to be human-readable, everything below it is structured data.
3. **Mission Specification** — `mission_specs` rendered as labeled fields, same visual pattern as the existing Requirements form panel (label above value, IBM Plex Mono labels).
4. **Constraints** — each `constraints[]` entry with its `sources[]` shown as small tags (e.g. "Max altitude: 122m" next to a `FAR Part 107` chip). This is where Section 4.3's dedup/traceability work actually becomes visible to a human, not just data sitting in a table.
5. **KPIs & Targets** — each `kpis[]` entry, with `priority` driving visual treatment: `"critical"` KPIs (gate-tier — safety or regulatory backed) get an amber/highlighted treatment, ranked KPIs show their rank more quietly. This is where Stage 2.2's trade-off prioritization becomes visible, rather than being computed and never seen.
6. **Validation flags** (if any) — shown honestly, not hidden, since they already factored into the confidence score at the top.
7. **Actions** — "Save as final" / "Edit and regenerate" (see 13.2 below), and "Continue to Concept Agent" shown **disabled**, honestly labeled "Bay 02 not yet built" — same honesty pattern as every other not-yet-built bay in The Hangar, not a dead link pretending to work.

### 13.2 Review-Before-Save, Resolved via Versioning

Two things could look like they conflict: Section 4.4.1 has persistence happen *before* delivery (the spec is written to `Hangar_mission_specs` before the dashboard ever renders it), while earlier beta scoping wanted a human review step *before* anything saves. Resolution — they don't actually conflict:

- The first generation is saved immediately as **version 1** (a draft) — `Hangar_mission_specs.version` already supports this, no schema change needed.
- The dashboard (13.1) is where a human reviews that draft. "Save as final" simply confirms version 1 as-is (a status flip, not a new row). "Edit and regenerate" creates **version 2** rather than mutating version 1 — so a correction never destroys the original generation, and `Hangar_agent_runs` keeps a clean trail of which version came from which run.
- Practically: nothing is ever silently overwritten, and "review before save" becomes "review before *finalize*" — the draft always exists in the database from the moment it's generated, which is also what makes the dashboard possible to render in the first place.

## 14. Build Status

| Item | Phase | Status |
|---|---|---|
| Input intake UI (all six sources) | Phase 1 | UI mockup complete — not wired to backend |
| `Hangar_*` Supabase tables | Phase 1 | Not created |
| Stage 2.1 — LLM extraction (intent + entities) | Phase 1 | Not started |
| Stage 2.1 — Rules engine (validation & normalization) | Phase 1 | Not started |
| Stage 2.1 — RAG context retrieval | Stub | Stubbed (always-empty) for now — full implementation planned for Phase 2, once `Hangar_mission_specs` has enough real missions to be worth searching |
| Stage 2.2 — Reasoning & Planning | Phase 1 | Not started |
| Stage 2.3 — Output Generation | Phase 1 | Not started |
| Stage 2.4 — Output Interface | Phase 1 | Not started |
| Handoff to Concept Agent | Phase 1 | Not started |

## 15. Scope of This Document

This document specs the **full** Mission Agent — all 6 input sources, all 4 stages fully featured (RAG, knowledge graph, rules engine, trade-off heuristics). This is the reference architecture in its entirety, not a cut-down build target.

Whatever gets built first (a smaller slice, a single source, a phased rollout) is a separate build-sequencing decision to make when implementation starts — this document stays the complete, uncut spec regardless of that choice, so it doesn't need revisiting each time the build scope changes.

## 16. Decisions Log

All four items previously open here are resolved:

- **Standalone confirmed.** Mission Agent's intake UI is new, part of The Hangar only — not connected to Design Studio's Step 1 (Mission) wizard. See Section 2.
- **FK targets resolved.** No external Projects table dependency exists. `Hangar_missions` gets a self-generated `mission_code` (user_id + timestamp + random suffix, via trigger — see Section 10 for collision-resistance detail) instead of a `project_id` FK. `Hangar_mission_project_imports.imported_mission_id` references `Hangar_missions` itself — "Existing Projects" means past Hangar missions, not Design Studio projects. See Section 10.
- **`design_outcomes` will include `confidence_score` from day one**, sourced from `Hangar_mission_specs.confidence_score`. That score is computed via a defined formula (source completeness + field completeness − validation flag penalty), not an LLM self-report — see Section 4.3 for the exact calculation.
- **Dev/prod Supabase split lands first**, before any `Hangar_*` table is created — confirmed non-negotiable. Every table created for Mission Agent (and every future Hangar agent) is prefixed `Hangar_*`, no exceptions.
- **Hangar auth is fully decoupled from `Destud_user`.** No shared table, no shared logic. `user_id` references Supabase's built-in `auth.users` directly — Hangar's own independent identity path, not a dependency on Design Studio's user model. See Section 10.2.
- **Validation folded into Stage 2.1, not a standalone step.** The original architecture reference (Section 8.0) shows "Outputs Validated" as its own step, separate from generation. Confirmed: this implementation validates continuously at intake instead (Section 4.1.1, Step 4) — deliberately, since catching a bad value before three more stages build on it beats catching it after and unwinding downstream work. No standalone validation stage exists or is planned. See Section 8.1.
- **Docker and FastAPI confirmed removed from the tech stack; Vercel confirmed sufficient for the compute layer.** The reference slide's containerized-Python assumption doesn't match this project's actual TypeScript/Vercel/Supabase stack — every job Docker would do (running the backend, hosting stateful services) is already covered by Vercel (compute) + Supabase (everything stateful). **Redis resolved too — deliberately no cache layer for now**, not left open; Postgres serves every current read directly, with two specific trigger conditions identified (the regulations/market data catalogs and `Hangar_agent_status`, both read-heavy) for when to revisit with Upstash Redis. See Section 18.6.

## 17. Handover to Bay 02 — Concept Agent

This section exists for whoever writes `ConceptAgent.md` next — everything Concept Agent needs to know about what it's receiving, in one place, rather than scattered across 16 sections.

**What Concept Agent receives:** a `MissionSpec` object, exact abstract shape in [Section 11](#11-interface-contract-io), realistic filled example in the same section. Fetched from `Hangar_mission_specs` by `mission_id` — Concept Agent does not receive the spec embedded in whatever triggers it (see below).

**How Concept Agent knows a mission is ready:** the `mission.spec_ready` event, [Section 4.4.3](#443-event-publish--type-bus-consumer--lifecycle). Not built yet — until `Hangar_events` exists, Concept Agent's own build will need its own interim trigger (e.g. polling `Hangar_missions` where `status = 'spec_ready'` or `'finalized'`). Whichever is chosen, don't have Concept Agent poll `Hangar_mission_specs` directly for new rows — go through `Hangar_missions.status`, which is the field that actually reflects lifecycle state (Section 13.2).

**What's guaranteed on every `MissionSpec`:**
- `confidence_score` is always present and always computed via the Section 4.3 formula — never absent, never an LLM self-report.
- `constraints[]` may be empty but is never null — an entry always has `sources[]`, even if only one source contributed.
- `kpis[]` always has a `priority` on every entry — `"critical"` or a rank number, never unset.
- `summary` is always plain natural language, safe to display or read aloud without further processing.

**What's NOT guaranteed — don't assume these:**
- `mission_specs` fields are **not** a fixed schema across every mission. A mission built from Natural Language alone will have thinner `mission_specs` than one that also used the Requirements form and an imported past mission. Concept Agent should handle sparse `mission_specs` gracefully, not assume every field is populated.
- Context retrieval (RAG) contributed **nothing** to any spec generated before Phase 2 ships (Section 4.1.1, Step 3) — every spec today was reasoned about using only what the user directly provided or explicitly selected, with no semantic enrichment from prior missions or domain knowledge.
- A `"finalized"` mission (Section 13.2) is a human-confirmed spec; a `"spec_ready"` mission is still an unreviewed draft. If Concept Agent should only ever act on human-confirmed specs, it must check `status = 'finalized'` specifically — don't treat `spec_ready` as equivalent.

**What Concept Agent should NOT read directly:** `Hangar_mission_sources`, `Hangar_mission_documents`, `Hangar_mission_regulations`, `Hangar_mission_project_imports` — these are Mission Agent's internal working tables (the raw, pre-processing inputs). Concept Agent's contract is with the finished `MissionSpec` only. Reaching into Mission Agent's internal tables directly would couple the two agents to each other's internal schema instead of to the interface contract, which defeats the point of having one.

## 18. Tech Stack — Open Source, Licensing & Hosting

Pricing below was checked live against current sources rather than assumed — still worth re-verifying at each provider's pricing page before committing budget, since these change.

### 18.1 Application & Hosting

| Component | Purpose | Open source? | License | Startup-friendly? | Vercel-hostable? | Pricing |
|---|---|---|---|---|---|---|
| React, Vite, TypeScript, TanStack Router, Tailwind CSS | Frontend stack | Yes, all | MIT / Apache 2.0 | Yes, no restrictions | N/A — libraries, ship inside the app | Free |
| **Vercel** | Hosting/deployment | No — proprietary platform | Proprietary | Hobby tier **forbids commercial use** — not viable for this project | This *is* the host | **Hobby:** free, non-commercial only. **Pro:** $20/user/month + usage (bandwidth, edge requests, compute) — real-world small-team bills commonly land $60–400/month depending on traffic. **Enterprise:** custom, often $3,500+/month. |
| Git | Version control | Yes | GPL v2 | Yes | N/A | Free |
| GitHub | Git hosting | No — proprietary (Microsoft) | Proprietary | Yes | N/A | Free tier available; paid tiers for teams |

### 18.2 Backend & Data (Supabase)

| Component | Purpose | Open source? | License | Vercel-hostable? | Pricing |
|---|---|---|---|---|---|
| Supabase (Postgres core) | Database engine | **Yes** — fully open source, self-hostable via Docker if ever needed | Apache 2.0 (core) | N/A — Supabase Cloud is a separate hosted service; Vercel just connects to it | **Free:** $0, 500MB DB, 50K MAU, auto-pauses after 7 days idle — not viable for production. **Pro:** $25/month + usage overages (storage, egress, MAU beyond included). **Team:** $599/month (SOC2/compliance). **Enterprise:** custom. |
| pgvector | Vector search extension (RAG, Phase 2) | Yes | PostgreSQL License (permissive) | Runs inside Supabase Postgres | Included free with Supabase, no extra charge |
| Supabase Auth / Storage / Realtime | Auth, file storage, event bus | Yes (part of Supabase core) | Apache 2.0 | Same as above | Included in Supabase pricing above, usage-based overage beyond included quota |

**Realistic base floor for this project:** Vercel Pro ($20/seat) + Supabase Pro ($25) ≈ **$45/month minimum**, before any LLM token usage or traffic-driven overages — Hobby/Free tiers on both don't hold up for a real production app (non-commercial restriction on Vercel; auto-pausing on Supabase Free).

### 18.3 AI / LLM Layer

| Component | Purpose | Open source? | Startup-friendly? | Vercel-hostable? | Pricing |
|---|---|---|---|---|---|
| Claude (Anthropic) | LLM — all Stage 2.1/2.2/2.3 calls | No — proprietary API | Yes, standard usage-based terms, no seat licensing | Called via HTTPS from a Vercel serverless function — Vercel hosts the caller, not the model | Pay-per-token. Roughly (**verify at anthropic.com/pricing before committing** — these shift often): Haiku ≈ $1/$5 per million input/output tokens, Sonnet ≈ $2–3/$10–15, Opus ≈ $5/$25. |
| GPT-4o (OpenAI) | Alternative LLM | No — proprietary API | Yes | Same pattern as Claude | Pay-per-token, check platform.openai.com/pricing |
| Llama (Meta) | Alternative, self-hostable LLM | **"Open-weight," not OSI-approved open source** — Meta's Llama license has conditions (large-scale commercial users above a certain MAU threshold need a separate license from Meta) | Mostly yes at this project's scale — but read the license, don't assume unlimited free commercial use | Not hostable on Vercel directly (needs GPU inference) — accessed via Together AI / Groq / Replicate, called from Vercel same as the others | Pay-per-token via the hosting provider, generally cheaper than Claude/GPT-4o |
| LangChain (`PromptTemplate`) | Optional prompt templating | Yes | MIT | Yes | Free — LangSmith (their separate observability product) is proprietary, not part of this |

**At 4 LLM calls per mission (Section 5.1), LLM spend is the one line item that scales directly with usage, not a fixed monthly fee** — worth modeling per-mission cost explicitly once real token counts are known, rather than budgeting it like the flat-fee items above.

### 18.4 Processing Utilities

| Component | Purpose | Open source? | License | Pricing |
|---|---|---|---|---|
| `pdf-parse` | PDF text extraction (Section 5.1) | Yes | MIT | Free |
| `mammoth` | DOCX text extraction | Yes | BSD-2-Clause | Free |
| `convert-units` | Unit conversion (Calculator) | Yes | MIT | Free |
| `json-rules-engine` (optional) | Rules engine framework | Yes | MIT | Free — though the current design (Section 4.1) uses plain TypeScript functions instead; no dependency required |

All four are trivially Vercel-hostable — pure npm packages running inside the same serverless function as everything else.

### 18.5 Phase 2 Observability Tools (Section 9.2 — not built yet)

| Component | Purpose | Open source? | License | Vercel-hostable? | Pricing |
|---|---|---|---|---|---|
| OpenTelemetry | Tracing standard | Yes | Apache 2.0 | Instrumentation runs in-app; needs a separate backend to view traces | Free (the standard itself) |
| Jaeger / Grafana Tempo | Tracing backend/viewer | Yes | Jaeger: Apache 2.0. Tempo core: AGPL v3 | No — separate hosted service | Free if self-hosted; managed Grafana Cloud has paid tiers |
| LangSmith | LLM-specific tracing | No — proprietary | — | No — separate hosted service | Free tier available, paid plans beyond that |
| promptfoo | LLM evaluation | Yes | MIT | Runs as a CLI/CI step, not hosted on Vercel | Free (core); optional paid cloud add-on |
| Ragas | RAG evaluation | Yes | Apache 2.0 | Same as promptfoo | Free |
| Langfuse | LLM observability + cost tracking | Yes (core, self-hostable) | MIT | Self-hosted: your own infra, not Vercel. Managed cloud: separate service | Free self-hosted; managed cloud has free tier + paid plans |
| Helicone | LLM usage/cost proxy | Yes | Apache 2.0 | Same pattern as Langfuse | Free self-hosted; managed cloud free tier + paid plans |
| Guardrails AI / NeMo Guardrails | Output safety validation | Yes, both | Apache 2.0 | Yes — runs as a library in the app | Free |

None of these are needed for Phase 1 per Section 9.2 — listed here for cost-planning purposes when Phase 2 actually starts, not as a current line item.

### 18.6 Reference Slide's Tech Stack — Docker / FastAPI / Redis

The original architecture slide names Docker, FastAPI, and Redis as part of Mission Agent's tech stack. **Docker and FastAPI are confirmed removed** from this project's stack — not under-documented, actively not needed:

| Component | Reference slide's role | Resolution |
|---|---|---|
| **Docker** | Containerization | **Removed.** Vercel's serverless functions (Section 18.1) do this job. Nothing in this architecture runs as a long-lived container. |
| **FastAPI** | API framework | **Removed.** FastAPI is Python; this codebase (`skyfarm-mind`) is TypeScript/React/Vite throughout (Section 18.1) — the server routes in Section 12.1 are Node-based. |
| **Redis** | Cache | **Resolved: no cache layer, deliberately, for now.** Not unresolved — a decision. Supabase Postgres serves every read this architecture has today directly, with no demonstrated need for anything in front of it. Same discipline applied to RAG, Knowledge Graph, and Web Search elsewhere in this document: no infrastructure until a real need shows up. See below for the specific conditions that would change this. |

**Is Vercel sufficient for this architecture — confirmed.** Vercel covers the compute/application layer (frontend, server routes, the pipeline in Section 12) — exactly what it's built for. The architecture was never meant to be Vercel alone, though: it's **Vercel (compute) + Supabase (everything stateful — database, auth, storage, vector search, realtime/event bus)** working together, which is what every section of this document already assumes. Every job Docker would traditionally do in a containerized architecture — running the backend, hosting the database, hosting a queue, hosting vector search — is already covered by that Vercel + Supabase split, which is exactly why Docker turned out to be unnecessary rather than just undocumented.

**What would actually change the Redis decision.** Two specific, already-identified things in this document are the real candidates — not a generic "maybe someday":
1. **`Hangar_regulations_catalog` / `Hangar_market_data_catalog` reads (Section 10)** — these populate the intake UI's checkboxes on every page load, rarely change, and are read by every user. A natural caching candidate once traffic is high enough that repeated identical queries are worth avoiding.
2. **`Hangar_agent_status` reads (Section 10)** — drives The Hangar's circuit diagram for every visitor to `welcome.html`, public and read-heavy by nature.

If either becomes a measured bottleneck, **Upstash Redis** (serverless-native, free tier, built for the Vercel pattern already in use) is the right fit — not traditional self-hosted Redis, which needs an always-on server this architecture doesn't otherwise have. Until then, Postgres serves both directly.

**One boundary worth tracking, not a blocker today:** the 4 sequential LLM calls per mission (Section 5.1) need to fit inside Vercel's function execution window — comfortable on Pro's extended limits, worth reconfirming once real per-call latency is measured. Separately, if Phase 2's Knowledge Base ingestion (Section 4.1.1) ever needs heavy batch embedding of a large corpus, that's the kind of long-running background job that fits less naturally on serverless functions than a dedicated worker — a Phase 2 decision to revisit then, not a Phase 1 concern.

## 19. References

- Architecture source: "Mission Agent – Detailed Architecture" (DeStud internal architecture deck)
- UI mockup: `mission-agent.html`
- Full Hangar circuit: `welcome.html`
- Landing page: `the-hangar-landing-page.html`
