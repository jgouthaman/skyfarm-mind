# Bernoulli Integration — Bay 02 Concept Agent

**Status:** Navigation wired (reuses Mission's real backend — see note below)

## Overview

Concept Agent doesn't define its own physics-checkable spec — it ranks configuration *options* against its **source mission's** existing constraints and KPIs (`FinalizedConstraint[]` / `FinalizedKpi[]`, passed into concept generation as inputs, never redefined as outputs). So "Ask Bernoulli" from Concept really means *"review the Mission spec this concept came from"* — no new schema or checks were needed, just a link carrying the right `missionId`.

## How the link works

- **Trigger:** "Ask Bernoulli →" link next to the confidence score.
  - Live view: `ConceptDashboard` (in `src/routes/the-hangar.concept.tsx`), which takes a new `sourceMissionId` prop
  - Read-only past view: `PastConceptDetail` (same file)
- **Target:** `/the-hangar/bernoulli`
- **Search params:**
  ```
  { source: "concept", missionId: <mission id>, sourceId: "" }
  ```
  - Live view: `sourceMissionId={selectedSpec?.missionId ?? null}` — `selectedSpec` (a `MissionListEntry`) is already held in page state from picking a finalized mission to build the concept from, so this is free, no extra fetch
  - Past view: `concept.sourceMissionId` — `ConceptListEntry` carries this field directly (`sourceMissionId: string`)

## Mission resolution

None needed client-side — both code paths already have the mission id in scope without an extra hop.

## Round trip back

`search.source === "concept"` highlights **Bay 02 Concept Agent** on the Bernoulli page and links back to `/the-hangar/concept`.

## Files touched

- `src/routes/the-hangar.concept.tsx` — `ConceptDashboard` (added `sourceMissionId` prop), `PastConceptDetail`, `.hgr-c-dash-bernoulli-link`
- `src/routes/the-hangar.bernoulli.tsx` — `LEFT_CALLERS` entry `{ bay: "02", key: "concept", to: "/the-hangar/concept" }`

## Note on Bernoulli's own dropdown

Concept Agent only ever builds from a **finalized** mission (`fetchSavedSpecs` on the Concept page filters `?status=finalized`). This surfaced a real gap: Bernoulli's own "Your missions" picker originally fetched `spec_ready` only, so a Concept-sourced link would never resolve. Fixed by broadening Bernoulli's fetch to include both statuses, filtered client-side by "has a real spec" (`missionSpecs !== null`) instead of a fixed status list — see `the-hangar.bernoulli.tsx`'s `fetchMissions()`.
