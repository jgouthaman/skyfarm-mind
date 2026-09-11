# Bernoulli Integration — Bay 08 Optimization Agent

**Status:** Navigation wired (reuses Mission's real backend)

## Overview

Optimization Agent is the first bay with **two** upstream parents — it fans in from both Bay 06 (CFD) and Bay 07 (Structural), via `source_cfd_analysis_id` and `source_structural_id`.

## How the link works

- **Trigger:** "Ask Bernoulli →" link next to the confidence score.
  - Live view: `OptimizationResultView` (in `src/routes/the-hangar.optimization.tsx`)
  - Read-only past view: `PastOptimizationDetail` (same file)
- **Target:** `/the-hangar/bernoulli`
- **Search params:**
  ```
  { source: "optimization", missionId: "", sourceId: <optimizationId> }
  ```
  - Live view: `result.optimizationId` (`OptimizationResult`)
  - Past view: `optimization.optimizationId` (`OptimizationListEntry`)

## Mission resolution

`GET /api/hangar/resolve-mission?source=optimization&sourceId=<id>` →
`bernoulliSourceResolver.ts`, `case "optimization"`:
```
getOptimization(id).source_cfd_analysis_id   -- CFD edge only, see note
  → getCFDAnalysis chain (same as Bay 06, from "cfd" onward)
```

**Note:** the resolver only walks the `source_cfd_analysis_id` edge, not `source_structural_id`. Both edges trace back to the same CAD design (OPT-003's own cross-check enforces this — a mismatched CFD/structural pair gets eliminated before Optimization ever runs), so either edge reaches the same mission; walking one is enough.

## Round trip back

`search.source === "optimization"` highlights **Bay 08 Optimization Agent** and links back to `/the-hangar/optimization`.

## Files touched

- `src/routes/the-hangar.optimization.tsx` — `OptimizationResultView`, `PastOptimizationDetail`, `.hgr-o-dash-bernoulli-link`
- `src/lib/the-hangar/bernoulliSourceResolver.ts` — `case "optimization"`
- `src/routes/the-hangar.bernoulli.tsx` — `RIGHT_CALLERS` entry `{ bay: "08", key: "optimization", to: "/the-hangar/optimization" }`
