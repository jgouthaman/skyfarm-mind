# Bernoulli Integration — Bay 02 Concept Agent

**Status:** Built. Bernoulli reviews the **concept run's own output** with BERN-C01–C04, plus any custom concept rules, judged against the source mission's KPIs. Updated 2026-10-29. The full design is in `BernoulliAgent.md`.

> This replaces the earlier navigation-only version, where "Ask Bernoulli" from Concept re-reviewed the source mission spec with the mission checks. That was changed so Bernoulli checks the output of the bay that called it.

## Overview

A concept run doesn't redefine the mission's numbers. It proposes candidate vehicle concepts and ranks them against the source mission's existing constraints and KPIs. So Bernoulli's concept checks ask whether each candidate can physically meet those KPIs, and whether the ranking is consistent with that:

| ID | Check | Type |
|---|---|---|
| BERN-C01 | Vehicle-class consistency with the spec | Rule-based |
| BERN-C02 | Speed feasibility per concept (hard gate: fails if the top-ranked concept can't fly the required average speed) | Rule-based |
| BERN-C03 | Ranking coherence (fit order, 1–10 scores, "pass" contradicted by C02) | Rule-based |
| BERN-C04 | Physical feasibility per concept (power draw, battery mass fraction) | TorqWings AI |

## How the link works

- **Trigger:** "Ask Bernoulli →" on the Concept Ready dashboard (`ConceptDashboard`) and on the read-only past view (`PastConceptDetail`), both in `src/routes/the-hangar.concept.tsx`.
- **Target:** `/the-hangar/bernoulli`.
- **Search params:**
  ```
  { source: "concept", missionId: <source mission id>, sourceId: <concept id> }
  ```
- **Source mission on reopen:** a reopened concept keeps its source mission (looked up from "Your saved Mission Specs"), so the button stays available.

## On the Bernoulli page

- **Concept mode:** arriving with `source=concept` switches the page into concept mode:
  - the dropdown lists **Concept Ready** concepts (from `GET /api/hangar/concepts`) instead of missions
  - picking one also selects its source mission
- **Order:**
  1. dropdown
  2. report ("Concept Bernoulli report")
  3. collapsible Concept Spec
  4. collapsible Source Mission Spec
  5. the concept checks' definitions
- **Request:** the review is sent as `{ missionId, source: "concept", sourceId }`. The server anchors it to the concept's own `source_mission_id`.

## Storage

Concept reviews are saved with `source_bay = 'concept'` and `concept_id` (migration `20261029000000_hangar_bernoulli_caller_bay.sql`). Saved-report lookups filter on both, so a concept review never appears when the source mission is reopened from Bay 01. A finalized concept's read-only view ends with its latest saved concept review.

## Round trip back

`search.source === "concept"` highlights **Bay 02 Concept Agent** on the Bernoulli page and links back to `/the-hangar/concept`.

## Files

- `src/lib/the-hangar/bernoulliChecks.ts`: C01–C04 and the shared custom-rule runner
- `src/lib/the-hangar/bernoulliAgentPipeline.ts`: concept target loading (`getConcept`, `getLatestConceptSpec`)
- `src/lib/the-hangar/bernoulliPersistence.ts`: `source_bay` / `concept_id`
- `src/routes/the-hangar.concept.tsx`: links carry `sourceId`; saved report on finalized concepts
- `src/routes/the-hangar.bernoulli.tsx`: concept mode (dropdown, report and spec order)
