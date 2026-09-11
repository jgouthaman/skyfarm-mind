# Bernoulli Integration — Bay 04 CAD Agent

**Status:** Navigation wired (reuses Mission's real backend)

## Overview

CAD Agent is three hops from Mission (`CAD → Aircraft Design → Concept → Mission`), too deep to resolve client-side from whatever's already in page state. This is the first bay to use the generic **`sourceId` + server-side chain walk** approach (`bernoulliSourceResolver.ts`), which every bay from here on reuses.

## How the link works

- **Trigger:** "Ask Bernoulli →" link next to the confidence score.
  - Live view: `CADResultView` (in `src/routes/the-hangar.cad-design.tsx`)
  - Read-only past view: `PastCADDesignDetail` (same file)
- **Target:** `/the-hangar/bernoulli`
- **Search params:**
  ```
  { source: "cad", missionId: "", sourceId: <cadDesignId> }
  ```
  - Live view: `result.cadDesignId`
  - Past view: `design.cadDesignId` (`CADDesignListEntry`) — both are the CAD design's own id, no upstream lookup needed client-side

## Mission resolution

`GET /api/hangar/resolve-mission?source=cad&sourceId=<id>` →
`bernoulliSourceResolver.ts`, `case "cad"`:
```
getCADDesign(id).source_aircraft_design_id
  → getAircraftDesign(...).source_concept_id
    → getConcept(...).source_mission_id
```

## Round trip back

`search.source === "cad"` highlights **Bay 04 CAD Agent** and links back to `/the-hangar/cad-design`.

## Files touched

- `src/routes/the-hangar.cad-design.tsx` — `CADResultView`, `PastCADDesignDetail`, `.hgr-d-dash-bernoulli-link`
- `src/lib/the-hangar/bernoulliSourceResolver.ts` — `case "cad"`
- `src/routes/the-hangar.bernoulli.tsx` — `LEFT_CALLERS` entry `{ bay: "04", key: "cad", to: "/the-hangar/cad-design" }`
