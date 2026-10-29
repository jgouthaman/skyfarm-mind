# Vehicle Design v1 (archived 2026-10-29)

Bay 03's first Generate Design logic, moved here unwired while the new
Vehicle Design logic (the Python backend output: final_aircraft_design.json
and .md) is built.

What v1 did on Generate Design:

1. Checks (no AI): ownership of the concept and its mission, concept
   finalized, latest concept spec, the chosen concept (Bay 02 saved choice,
   else rank 1).
2. Hard-constraint gate (no AI), `aircraftDesignRules.ts`: ADR-001
   constraintFit "fail", ADR-002 empty vehicle class.
3. One TorqWings AI call, `aircraftDesignGeneration.ts`: wingspan, fuselage
   length, wing area, aspect ratio, component selections, design rationale.
   Mock output when no provider answers or the reply can't be parsed.
4. Saves the spec to Hangar_aircraft_design_specs and logs the run.

Files:

- `geometryGenerationStage.ts`: `runGeometryGenerationStage` (was in
  `aircraftDesignAgentPipeline.ts`).
- `aircraftDesignGeneration.ts`, `aircraftDesignRules.ts`: moved as-is.
- `api.hangar.process-aircraft-design.geometry-generation.ts.txt`: the
  POST route. Renamed `.txt` so TanStack doesn't register it.

To restore: move the route back to `src/routes/` (drop `.txt`), point its
import at `geometryGenerationStage.ts`, and wire `generateDesign` in
`the-hangar.aircraft-design.tsx` back to it. Past v1 designs still display:
their shapes live in `aircraftDesignTypes.ts`.
