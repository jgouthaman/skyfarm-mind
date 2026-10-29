# Bernoulli Agent — Bay 14

**Status:** built and live for two caller bays, Mission Agent (Bay 01) and Concept Agent (Bay 02). The checks are managed in Mission Hub. This document describes the shipped implementation as of 2026-10-29 (production `0e986c4`). For the original Bay 01 design, see `Ask BernoulliMission Spec Review Implementation Spec.md`.

**Agent ID:** `BERNOULLI_AGENT`
**Type:** Cross-cutting validation service. It is not a link in the sequential Bay 01–13 chain.
**Advisory only:** a FAIL never blocks the calling bay's own pipeline. It is a physics review the user reads before moving on.

---

## 1. Overview

Bernoulli reviews the **output of the bay that called it** against physics, dimensional consistency and aerospace reference ranges.

- **From Bay 01** it checks the mission spec (BERN-M01–M06).
- **From Bay 02** it checks the generated concepts (BERN-C01–C04), judged against the source mission's KPIs.

Each review is a mix of rule-based checks (plain maths in code) and TorqWings AI checks (LLM judgement grounded in reference figures). Admins can add their own TorqWings AI rules from Mission Hub.

Every review is saved. The most recent one is reloaded on the Bernoulli page and shown at the end of finalized missions and concepts.

## 2. Call points

| Caller | Trigger | Link carries | What is reviewed |
|---|---|---|---|
| Bay 01 Mission Agent | "Ask Bernoulli →" on the Spec Ready dashboard | `source=mission`, `missionId` | The mission spec |
| Bay 02 Concept Agent | "Ask Bernoulli →" on a Concept Ready dashboard or past concept | `source=concept`, `missionId` (the source mission), `sourceId` (the concept) | The concept run's candidates, trade-offs and ranking, judged against the source mission's spec |

The Ask Bernoulli button is disabled on finalized missions and concepts, because reviewing a locked spec isn't useful. Instead, those views show the last saved report (Section 9).

Other bays (03–13) have navigation-only "Ask Bernoulli" links (see the `Bernoulli-*-Integration.md` files). They are not yet wired to checks of their own, and Mission Hub shows them as "not wired yet".

## 3. Review flow

`POST /api/hangar/process-bernoulli/review` → `runBernoulliReviewStage` (`src/lib/the-hangar/bernoulliAgentPipeline.ts`)

1. **Resolve the target.**
   - If `source = "concept"` and `sourceId` is set, the pipeline loads that concept (ownership checked) and its latest spec. The review is anchored to the concept's own `source_mission_id`, not to whatever `missionId` the client sent.
   - Otherwise, it reviews `missionId`.
2. **Validate the mission.** It must belong to the user and be `spec_ready` or `finalized`, with a generated spec.
3. **Load the rules** for that bay from the registry (Section 5). Only enabled rules run. A non-empty `checksRequested` narrows the set further but can't switch a disabled rule on.
4. **Create the review row** with `source_bay` and, for concept reviews, `concept_id`.
5. **Run the checks** in three passes, so each TorqWings AI check sees what came before it:
   1. built-in rule-based checks (instant, no network)
   2. built-in TorqWings AI checks
   3. custom TorqWings AI rules
6. **Compute the verdict and confidence** (Section 7), save the versioned spec row and the run log, and return the report with usage and latency.

## 4. Checks

### 4.1 Mission spec checks (Bay 01)

| ID | Name | Type | Hard gate | Logic |
|---|---|---|---|---|
| BERN-M01 | Speed Consistency | Rule-based | Yes | Range ÷ endurance → average speed, compared with the vehicle-class ceiling (multirotor 150, fixed-wing 250, VTOL 220, helicopter 280, otherwise 300 km/h). FAIL above the ceiling, WARN above 80% of it. |
| BERN-M02 | Coverage Math | Rule-based | No | For swarm specs: unit count × per-unit coverage angle ≥ 360°. INFO when there are no swarm constraints. |
| BERN-M03 | Payload/Endurance Plausibility | TorqWings AI | No | Is the payload/endurance pair realistic for the vehicle class? It is given the full KPI and constraint list plus the rule-based findings, and must show its reasoning. |
| BERN-M04 | KPI/Constraint Provenance | Rule-based | No | WARN if any constraint cites no source. |
| BERN-M05 | Dimensional Consistency | Rule-based | Yes | Each KPI's unit must match the dimension its name implies (Range = distance, Endurance = time, Payload = mass, Speed = speed). |
| BERN-M06 | Energy/Power Budget Plausibility | TorqWings AI | No | Estimates power draw, energy and battery mass fraction from payload + endurance + class, against the reference ranges. WARN when the inputs are too thin to judge. |

### 4.2 Concept checks (Bay 02)

| ID | Name | Type | Hard gate | Logic |
|---|---|---|---|---|
| BERN-C01 | Vehicle-Class Consistency | Rule-based | No | Free-text concept classes are normalised (VTOL / multirotor / fixed-wing / helicopter). WARN lists concepts that depart from the spec's class, flagging when the top-ranked one does. INFO if the spec names no class. |
| BERN-C02 | Speed Feasibility per Concept | Rule-based | Yes | Same speed derivation as M01, applied to each concept's own class ceiling. FAIL if the top-ranked concept can't fly the required average speed; WARN if only lower-ranked ones can't. |
| BERN-C03 | Ranking Coherence | Rule-based | No | WARN if a worse constraint fit (pass < partial < fail) is ranked above a better one, a fit score falls outside 1–10, the top concept's fit is "fail", or a concept marked "pass" is speed-infeasible per C02. |
| BERN-C04 | Physical Feasibility per Concept | TorqWings AI | No | One call covering all concepts. For each one: an estimate of power draw and battery mass fraction, compared against the reference ranges and against the concept's own trade-off verdict. FAIL only if the top-ranked concept is implausible. |

### 4.3 Reference ranges given to every TorqWings AI check

These are embedded in the prompts so verdicts are grounded in citable numbers rather than general model knowledge:

- Li-ion/Li-poly pack energy density: 150–250 Wh/kg
- Battery mass fraction of MTOW (electric UAS): 20–40%
- Multirotor hover power loading: ~120–200 W/kg of MTOW
- Fixed-wing / VTOL-cruise electric power loading: ~50–100 W/kg of MTOW
- Propulsive + ESC efficiency: ~60–75%
- Payload fraction of MTOW: multirotor ~15–30%, fixed-wing ~10–25%

Every TorqWings AI check returns `{ status, message, reasoning }`. The `reasoning` (the calculation behind the verdict) is stored and shown under the check. If no provider answers, or the reply can't be parsed, the check becomes **INFO, marked simulated**, rather than a guessed verdict.

## 5. Check registry — Mission Hub → Agents → Bernoulli

The checks that run are defined in the `Hangar_BernoulliRules` table, not in code. It is managed on the admin page `/mission-hub/agents/bernoulli` (`src/routes/mission-hub.agents.bernoulli.tsx`).

- **Top bar:** all 15 agents. Mission and Concept carry a green dot (wired). The others say Bernoulli isn't wired into them yet and don't accept rules.
- **Per agent:** a table of checks with ID (built-in or custom), name and description, type (Rule-based / TorqWings AI), a **Hard gate** switch and an **Enabled** switch.
- **Built-in checks** run fixed code. Admins can only enable/disable them or change the hard gate. They can't be deleted.
- **Custom rules** are always TorqWings AI checks. They are defined by a name, a short description, a plain-language **instruction**, and an optional hard gate. IDs continue the bay's numbering (BERN-M07…, BERN-C05…). Custom rules can be edited and deleted.

**How a custom rule runs:** no code is generated. One shared function (`runCustomRule` in `src/lib/the-hangar/bernoulliChecks.ts`) fills a fixed prompt template with:

- the rule's ID, name and instruction
- the output under review:
  - for a mission: vehicle class, mission type, domain/vertical, phase, operating environment, all KPIs and constraints
  - for a concept, additionally: the ranked concepts with class, description and trade-off verdict
- the findings of the checks that already ran

It then sends the prompt through the AI gateway. Each custom rule adds one AI call per review. It can only judge what its instruction asks against the data it is given: it cannot read the database or compute exact formulas.

**Fallback:** if the registry can't be read, `bernoulliRules.ts` falls back to `DEFAULT_BERNOULLI_RULES` (the same 10 built-ins), so a review never breaks over the registry.

## 6. AI providers

All TorqWings AI calls go through `callLlmGateway` (`src/lib/the-hangar/llmGateway.ts`). It tries Anthropic (Claude Sonnet 5) and Groq (`openai/gpt-oss-120b`) in the order set on **Mission Hub → Configurations → AI Providers**. That setting is stored in `Hangar_LlmSettings` and cached for about 30 seconds, so a change goes live without a redeploy. The default order is Anthropic first, Groq second. Each check result records which provider answered.

## 7. Verdict and confidence

- **Verdict:** FAIL if any hard-gate check FAILs. Otherwise WARN if any check WARNs or a non-gate check FAILs. Otherwise PASS. Hard gates come from the registry.
- **Confidence:** a weighted average with PASS = 1, WARN = 0.5 and FAIL = 0.
  - INFO checks (not applicable / not enough data) are excluded.
  - Hard-gate checks count double.
  - A simulated (mock) result is penalised 0.15 × its weight.
  - The result is clamped to 0–1; if every check is INFO it is 0.5.

  Example: M01 and M05 PASS (gates, weight 2 each), M04 PASS, and M03, M06 and one custom rule FAIL (weight 1 each) gives 5 ÷ 8 = 62.5%.

## 8. Data model

| Table | Holds |
|---|---|
| `Hangar_BernoulliReviews` | One row per review: user, `mission_id`, `source_bay` (`mission` / `concept`), `concept_id` (concept reviews only, enforced by a check constraint), status, verdict, confidence, review code |
| `Hangar_BernoulliReview_specs` | Versioned result: verdict, confidence, and `checks` (JSONB). Each check stores `ruleId`, `ruleName`, `status`, `message`, `reasoning`, `usage` (tokens), `provider` and `sourceWasMock` |
| `Hangar_BernoulliReview_runs` | Run log: input snapshot (mission, concept, check IDs run), output snapshot, status, error, duration |
| `Hangar_BernoulliRules` | The check registry (Section 5). Readable by any signed-in user; written only by the server after a Mission Hub admin check |

- **New reviews:** every Ask Bernoulli creates a new review; nothing is overwritten.
- **Saved-report lookups:** the "latest saved review" lookup filters on `source_bay`, so a concept review never shows up when its source mission is reopened from Bay 01, and vice versa.
- **Usage on reload:** usage (calls, tokens, estimated cost) is rebuilt from the stored checks, so a reloaded report has the same numbers. Reviews saved before usage tracking existed show 0.
- **Not stored with a review:** a custom rule's instruction text. If a rule is edited or deleted later, old reports keep its result and name but not the wording that produced it.

Migrations, all applied to the live project and run manually in the Supabase SQL editor. The filename prefix only orders them; it isn't the date they were applied. The two dated 2026-10-30 were written and applied on 2026-10-29, the same day as this document.

- `20260914000000_hangar_bernoulli_agent.sql`: the three review tables
- `20261029000000_hangar_bernoulli_caller_bay.sql`: `source_bay`, `concept_id`
- `20261030000000_hangar_bernoulli_rules.sql`: the registry, seeded with the 10 built-ins
- `20261030010000_hangar_llm_provider_order.sql`: provider order (shared with every agent)

## 9. API routes

| Route | Who | Purpose |
|---|---|---|
| `POST /api/hangar/process-bernoulli/review` | Signed-in owner | Run a review: `{ missionId, source?, sourceId?, checksRequested? }` |
| `GET /api/hangar/bernoulli-review?missionId=&conceptId=` | Signed-in owner | Latest saved review of the mission, or of the concept when `conceptId` is given |
| `GET /api/hangar/bernoulli-rules?bay=` | Signed-in | The registry for one bay, plus `fromRegistry` |
| `POST / PATCH / DELETE /api/hangar/bernoulli-rules` | Mission Hub admins | Add a custom rule; toggle enabled/hard gate or edit a custom rule; delete a custom rule |

## 10. UI

### 10.1 Bernoulli page — `/the-hangar/bernoulli` (`src/routes/the-hangar.bernoulli.tsx`)

- **Header:** a live AI badge showing Claude or Groq, whichever is answering.
- **Mission mode** (arrived from Bay 01):
  1. dropdown of **Spec Ready** missions only
  2. collapsible mission spec
  3. report
- **Concept mode** (arrived from Bay 02):
  1. dropdown of **Concept Ready** concepts only
  2. report
  3. collapsible **Concept Spec** (top concept, ranked concepts with class, fit and score, trade-off notes)
  4. collapsible **Source Mission Spec**
- **Report:**
  - title: "Mission Spec Bernoulli report" or "Concept Bernoulli report", with the code and review time
  - collapsible **Requests & tokens**: summary bar (API calls, input/output tokens, estimated cost in ₹, latency) and a per-check table showing which provider answered
  - verdict, confidence, and a "Reviewed: Bay 01 mission spec / Bay 02 concept run" tag
  - each check's result, message and reasoning
- **"What each check does":** the enabled checks for the current bay, read from the registry, with RULE / TORQWINGS AI and HARD GATE tags.

### 10.2 Saved reports on finalized work

Bay 01's read-only finalized-mission view and Bay 02's finalized-concept view both end with the latest saved Bernoulli report for that mission or concept, read-only.

## 11. Known limitations and next steps

- **Only Bay 01 and Bay 02 have checks.** The other caller bays are navigation-only.
- **Custom rules are AI-only.** A new rule-based (formula) check needs code. A simple threshold-rule builder (for example "Endurance ≥ 30 min") is a possible next step.
- **Custom rules see a fixed set of context.** They can't look up other data, such as similar finalized missions or the original brief. Proposed: per-rule context options that Bernoulli fetches itself.
- **Missing check: payload vs MTOW.** No rule-based check compares payload against a weight-limit constraint (for example 5 kg payload vs MTOW ≤ 0.55 kg). The AI checks catch it; a built-in rule-based check would make it repeatable.
- **Custom rule definitions aren't kept with reports** (see Section 8). Snapshotting the rule into the saved check would fix that.
- **Cost estimates use Claude's list price** even when Groq answered, so they overstate Groq calls.
