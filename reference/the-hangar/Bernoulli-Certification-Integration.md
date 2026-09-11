# Bernoulli Integration — Bay 12 Certification Agent

**Status:** Navigation wired (reuses Mission's real backend)

## Overview

Certification Agent sources directly from **Validation** (`source_validation_id`) — the longest chain of any caller bay, six hops back to Mission.

## How the link works

- **Trigger:** "Ask Bernoulli →" link next to the confidence score.
  - Live view: `CertificationResultView` (in `src/routes/the-hangar.certification.tsx`)
  - Read-only past view: `PastCertificationDetail` (same file)
- **Target:** `/the-hangar/bernoulli`
- **Search params:**
  ```
  { source: "certification", missionId: "", sourceId: <certificationId> }
  ```
  - Live view: `result.certificationId` (`CertificationResult`)
  - Past view: `certification.certificationId` (`CertificationListEntry`)

## Mission resolution

`GET /api/hangar/resolve-mission?source=certification&sourceId=<id>` →
`bernoulliSourceResolver.ts`, `case "certification"` — the full walk:
```
getCertification(id).source_validation_id
  → getValidation(...).source_optimization_id
    → getOptimization(...).source_cfd_analysis_id
      → getCFDAnalysis(...).source_cad_design_id
        → getCADDesign(...).source_aircraft_design_id
          → getAircraftDesign(...).source_concept_id
            → getConcept(...).source_mission_id
```

## Round trip back

`search.source === "certification"` highlights **Bay 12 Certification Agent** and links back to `/the-hangar/certification`.

## Files touched

- `src/routes/the-hangar.certification.tsx` — `CertificationResultView`, `PastCertificationDetail`, `.hgr-c-dash-bernoulli-link`
- `src/lib/the-hangar/bernoulliSourceResolver.ts` — `case "certification"`
- `src/routes/the-hangar.bernoulli.tsx` — `RIGHT_CALLERS` entry `{ bay: "12", key: "certification", to: "/the-hangar/certification" }`
