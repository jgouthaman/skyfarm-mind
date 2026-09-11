# Bernoulli Integration — Bay 09 Validation Agent

**Status:** Navigation wired (reuses Mission's real backend)

## Overview

Validation Agent sources directly from **Optimization** (`source_optimization_id`), which is itself two hops from CAD and five from Mission.

## How the link works

- **Trigger:** "Ask Bernoulli →" link next to the confidence score.
  - Live view: `ValidationResultView` (in `src/routes/the-hangar.validation.tsx`)
  - Read-only past view: `PastValidationDetail` (same file)
- **Target:** `/the-hangar/bernoulli`
- **Search params:**
  ```
  { source: "validation", missionId: "", sourceId: <validationId> }
  ```
  - Live view: `result.validationId` (`ValidationResult`)
  - Past view: `validation.validationId` (`ValidationListEntry`)

## Mission resolution

`GET /api/hangar/resolve-mission?source=validation&sourceId=<id>` →
`bernoulliSourceResolver.ts`, `case "validation"`:
```
getValidation(id).source_optimization_id
  → getOptimization chain (same as Bay 08, from "optimization" onward)
```

## Round trip back

`search.source === "validation"` highlights **Bay 09 Validation Agent** and links back to `/the-hangar/validation`.

## Files touched

- `src/routes/the-hangar.validation.tsx` — `ValidationResultView`, `PastValidationDetail`, `.hgr-v-dash-bernoulli-link`
- `src/lib/the-hangar/bernoulliSourceResolver.ts` — `case "validation"`
- `src/routes/the-hangar.bernoulli.tsx` — `RIGHT_CALLERS` entry `{ bay: "09", key: "validation", to: "/the-hangar/validation" }`
