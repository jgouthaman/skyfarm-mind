# Bernoulli Integration — Bay 06 CFD Agent

**Status:** Navigation wired (reuses Mission's real backend)

## Overview

CFD Agent sources directly from a **CAD design** (`source_cad_design_id`), the same hop Simulation Orchestrator uses — CFD and Simulation are siblings off CAD, not chained to each other.

## How the link works

- **Trigger:** "Ask Bernoulli →" link next to the confidence score.
  - Live view: `CFDResultView` (in `src/routes/the-hangar.cfd-analysis.tsx`)
  - Read-only past view: `PastCFDAnalysisDetail` (same file)
- **Target:** `/the-hangar/bernoulli`
- **Search params:**
  ```
  { source: "cfd", missionId: "", sourceId: <cfdAnalysisId> }
  ```
  - Live view: `result.cfdAnalysisId` (`CFDAnalysisResult`)
  - Past view: `analysis.cfdAnalysisId` (`CFDAnalysisListEntry`)

## Mission resolution

`GET /api/hangar/resolve-mission?source=cfd&sourceId=<id>` →
`bernoulliSourceResolver.ts`, `case "cfd"`:
```
getCFDAnalysis(id).source_cad_design_id
  → getAircraftDesign chain (same as Bay 04, from "cad" onward)
```

## Round trip back

`search.source === "cfd"` highlights **Bay 06 CFD Agent** and links back to `/the-hangar/cfd-analysis`.

## Files touched

- `src/routes/the-hangar.cfd-analysis.tsx` — `CFDResultView`, `PastCFDAnalysisDetail`, `.hgr-f-dash-bernoulli-link`
- `src/lib/the-hangar/bernoulliSourceResolver.ts` — `case "cfd"`
- `src/routes/the-hangar.bernoulli.tsx` — `RIGHT_CALLERS` entry `{ bay: "06", key: "cfd", to: "/the-hangar/cfd-analysis" }`
