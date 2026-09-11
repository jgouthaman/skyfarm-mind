# Bernoulli Integration — Bay 07 Structural Agent

**Status:** Navigation wired (reuses Mission's real backend)

## Overview

Structural Agent sources directly from a **CAD design** (`source_cad_design_id`) — a sibling of CFD off the same CAD design, not downstream of it.

## How the link works

- **Trigger:** "Ask Bernoulli →" link next to the confidence score.
  - Live view: `StructuralResultView` (in `src/routes/the-hangar.structural.tsx`)
  - Read-only past view: `PastStructuralDetail` (same file)
- **Target:** `/the-hangar/bernoulli`
- **Search params:**
  ```
  { source: "structural", missionId: "", sourceId: <structuralId> }
  ```
  - Live view: `result.structuralId` (`Stage1Result`)
  - Past view: `structural.structuralId` (`StructuralListEntry`)

## Mission resolution

`GET /api/hangar/resolve-mission?source=structural&sourceId=<id>` →
`bernoulliSourceResolver.ts`, `case "structural"`:
```
getStructural(id).source_cad_design_id
  → getAircraftDesign chain (same as Bay 04, from "cad" onward)
```

## Round trip back

`search.source === "structural"` highlights **Bay 07 Structural Agent** and links back to `/the-hangar/structural`.

## Files touched

- `src/routes/the-hangar.structural.tsx` — `StructuralResultView`, `PastStructuralDetail`, `.hgr-t-dash-bernoulli-link`
- `src/lib/the-hangar/bernoulliSourceResolver.ts` — `case "structural"`
- `src/routes/the-hangar.bernoulli.tsx` — `RIGHT_CALLERS` entry `{ bay: "07", key: "structural", to: "/the-hangar/structural" }`
