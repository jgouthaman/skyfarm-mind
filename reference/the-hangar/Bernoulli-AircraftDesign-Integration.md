# Bernoulli Integration — Bay 03 Aircraft Design Agent

**Status:** Navigation wired (reuses Mission's real backend)

## Overview

Aircraft Design sources from a **Concept** (`sourceConceptId`), which itself sources from a **Mission** (`sourceMissionId`) — two hops away, not one. `AircraftDesignListEntry` only stores `sourceConceptId`, so the missionId isn't available for free everywhere; the two views on this page resolve it two different ways.

## How the link works

- **Trigger:** "Ask Bernoulli →" link next to the confidence score.
  - Live view: `GeometryResultView` (in `src/routes/the-hangar.aircraft-design.tsx`), takes a new `sourceMissionId` prop
  - Read-only past view: `PastDesignDetail` (same file)
- **Target:** `/the-hangar/bernoulli`

### Live view — direct missionId (no server hop)

```
{ source: "aircraft-design", missionId: selectedConcept?.sourceMissionId, sourceId: "" }
```
`selectedConcept` (a `ConceptListEntry`) is already held in page state from picking a finalized concept to build the design from, and `ConceptListEntry.sourceMissionId` gives the mission id directly — no extra fetch needed.

### Past view — sourceId + server-side chain walk

```
{ source: "aircraft-design", missionId: "", sourceId: design.aircraftDesignId }
```
Here only the design's own id is available (`AircraftDesignListEntry` has no missionId or sourceMissionId field), so Bernoulli resolves it server-side instead — see below. This was originally a disclosed gap (no link on the past view at all) until `bernoulliSourceResolver.ts` was built for the deeper bays, at which point it was fixed the same way.

## Mission resolution (past view only)

`GET /api/hangar/resolve-mission?source=aircraft-design&sourceId=<id>` →
`bernoulliSourceResolver.ts`: `getAircraftDesign(id).source_concept_id` → `getConcept(conceptId).source_mission_id` → mission id.

## Round trip back

`search.source === "aircraft-design"` highlights **Bay 03 Aircraft Design Agent** and links back to `/the-hangar/aircraft-design`.

## Files touched

- `src/routes/the-hangar.aircraft-design.tsx` — `GeometryResultView` (added `sourceMissionId` prop), `PastDesignDetail`, `.hgr-a-dash-bernoulli-link`
- `src/lib/the-hangar/bernoulliSourceResolver.ts` — `case "aircraft-design"`
- `src/routes/the-hangar.bernoulli.tsx` — `LEFT_CALLERS` entry `{ bay: "03", key: "aircraft-design", to: "/the-hangar/aircraft-design" }`
