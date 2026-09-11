# Bernoulli Integration — Bay 05 Simulation Orchestrator

**Status:** Navigation wired (reuses Mission's real backend)

## Overview

Simulation Orchestrator sources directly from a **CAD design** (`source_cad_design_id`), one hop below CAD in the same chain Bay 04 already resolves through.

## How the link works

- **Trigger:** "Ask Bernoulli →" link next to the confidence score.
  - Live view: `SimulationResultView` (in `src/routes/the-hangar.simulation.tsx`)
  - Read-only past view: `PastSimulationDetail` (same file)
- **Target:** `/the-hangar/bernoulli`
- **Search params:**
  ```
  { source: "simulation", missionId: "", sourceId: <simulationId> }
  ```
  - Live view: `result.simulationId`
  - Past view: `simulation.simulationId` (`SimulationListEntry`)

## Mission resolution

`GET /api/hangar/resolve-mission?source=simulation&sourceId=<id>` →
`bernoulliSourceResolver.ts`, `case "simulation"`:
```
getSimulation(id).source_cad_design_id
  → getAircraftDesign chain (same as Bay 04, from "cad" onward)
```

## Round trip back

`search.source === "simulation"` highlights **Bay 05 Simulation Orchestrator** and links back to `/the-hangar/simulation`.

## Files touched

- `src/routes/the-hangar.simulation.tsx` — `SimulationResultView`, `PastSimulationDetail`, `.hgr-s-dash-bernoulli-link`
- `src/lib/the-hangar/bernoulliSourceResolver.ts` — `case "simulation"`
- `src/routes/the-hangar.bernoulli.tsx` — `LEFT_CALLERS` entry `{ bay: "05", key: "simulation", to: "/the-hangar/simulation" }`
