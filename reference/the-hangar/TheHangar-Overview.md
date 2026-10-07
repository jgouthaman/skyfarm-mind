# The Hangar

**The Hangar** is TorqWings' AI aerospace design platform — fifteen specialist agents that take a mission brief through concept, CAD, CFD, structural analysis, optimization, materials, manufacturing, certification, and documentation, handing off clean, validated data at every step.

> "Fifteen specialist agents. One aerospace design engine."
> The Hangar houses every AI agent TorqWings has built for autonomous aerial platform design — from mission definition through CFD, structural validation, and certification. Each one does a single job, gates before it scores, and hands off clean data to the next.

| | |
|---|---|
| Specialist agents | 15 |
| Open-source tools (target stack) | 9 |
| Black boxes | 0 |
| Shared memory layer | 1 |

Public pages: `/the-hangar`, `/the-hangar/agents`, `/the-hangar/how-it-works`, `/the-hangar/stack`.

## The 15 bays

### Primary workflow — sequential

| Bay | Agent | What it does |
|---|---|---|
| 01 | Mission Agent | Turns a mission brief into structured specs, constraints, and KPIs. |
| 02 | Concept Agent | Generates and ranks concept options against benchmarks and trends. |
| 03 | Aircraft Design Agent | Selects configuration and design parameters from rules and reference designs. |
| 04 | CAD Agent | Builds CAD geometry and assemblies from validated design parameters. |

### Parallel analysis — Flight Dynamics ‖ CFD ‖ Structures

| Bay | Agent | What it does |
|---|---|---|
| 05 | Flight Dynamics (Simulation Orchestrator) | Prepares the simulation plan and dispatches jobs to the solver agents. |
| 06 | CFD Agent | Runs fluid dynamics simulations — forces, coefficients, fields. |
| 07 | Structural Agent | Runs FEA for stress, deformation, and safety factor. |

Flight Dynamics, CFD, and Structural all run in parallel off Bay 04's CAD geometry, and feed independently into Bay 08.

### Refine & verify — sequential

| Bay | Agent | What it does |
|---|---|---|
| 08 | Optimization Agent | Searches the design space for Pareto-optimal candidates, combining Bay 06 and Bay 07's results. |
| 09 | Validation Agent | Checks results against the mission spec and issues pass or fail. On fail, the loop returns to Bay 08 for re-optimization — not back to square one. |

### Downstream — build, comply, ship

| Bay | Agent | What it does |
|---|---|---|
| 10 | Materials Agent | Recommends materials against requirements, environment, and constraints. |
| 11 | Manufacturing Agent | Checks manufacturability and produces a build plan and BOM. |
| 12 | Certification Agent | Maps the design against regulations and standards, flags gaps. |
| 13 | Documentation Agent | Compiles final reports, drawings, and summary documentation. |

### Cross-cutting — physics validation service

| Bay | Agent | What it does |
|---|---|---|
| 14 | Bernoulli Agent | Validates output from across the pipeline against conservation laws, dimensional consistency, and aerospace empiricals before it moves downstream. Runs against every stage above, not just one point in the sequence. |

### Knowledge layer

| Bay | Agent | What it does |
|---|---|---|
| 15 | Knowledge Agent | Answers questions and surfaces insight from every past project, rule, and outcome — the shared memory every other bay reads from and writes to. |

## Flow

```
01 Mission → 02 Concept → 03 Aircraft Design → 04 CAD
                                                     |
                                   +-----------------+-----------------+
                                   |                 |                 |
                          05 Flight Dynamics      06 CFD         07 Structural
                                   |                 |                 |
                                   +-----------------+-----------------+
                                                     |
                                            08 Optimization
                                                     |
                                            09 Validation  --(fail)--> back to 08
                                                     |
                                            (pass; continues downstream)
                                                     |
                              10 Materials → 11 Manufacturing → 12 Certification → 13 Documentation

14 Bernoulli — physics checks at every stage above
15 Knowledge — shared memory across all bays
```

## Target tool stack

Each agent is designed around the same open-source tools an aerospace engineer would run by hand, grounding reasoning in real engineering practice rather than a black box.

| Tool | Role | Agent |
|---|---|---|
| OpenVSP | Parametric aircraft geometry & vortex-lattice aero. | Bay 03 · Aircraft Design Agent |
| XFLR5 | Airfoil and low-Reynolds wing analysis. | Bay 03 · Aircraft Design Agent |
| FreeCAD | Parametric CAD modelling. | Bay 04 · CAD Agent |
| OpenCascade | Geometry kernel for CAD export. | Bay 04 · CAD Agent |
| SALOME | Meshing and pre-processing. | Bay 05 · Flight Dynamics |
| OpenFOAM | CFD solver. | Bay 06 · CFD Agent |
| CalculiX | FEA structural solver. | Bay 07 · Structural Agent |
| Code_Aster | Advanced FEA solver. | Bay 07 · Structural Agent |
| ParaView | Results post-processing and visualisation. | Bay 09 · Validation Agent |

**Current integration status**: this is the target/roadmap stack, not tools already wired into production. As of this writing, every bay's solver step is a Claude Sonnet 5 reasoning pass grounded in the given inputs (via the shared LLM gateway, `src/lib/the-hangar/llmGateway.ts`), not a real invocation of OpenFOAM/CalculiX/etc. Each generation function falls back to a clearly-labeled mock response when no `ANTHROPIC_API_KEY` is configured or a call fails, so the UI never silently presents invented numbers as a real result.

## Architecture notes

- **Stage gating**: each bay gates before it scores — a design that fails a hard constraint doesn't get a numeric score computed against it, it fails outright.
- **Bay 09 → Bay 08 loop**: the only feedback loop in the pipeline. A failed validation sends the design back to Optimization with the failure reason, not back to Mission/Concept.
- **Bay 14 (Bernoulli)** is a cross-cutting service, not a pipeline stage — it has its own integration doc per upstream bay (`Bernoulli-*-Integration.md` in this directory) and checks each bay's output against physics (conservation laws, dimensional consistency, empirical correlations) before that output is trusted downstream.
- **Bay 15 (Knowledge)** is the shared memory layer referenced by the "1 Shared Memory Layer" stat — every other bay both reads from and writes to it.
- **Per-agent specs**: see the individual `<AgentName>Agent.md` files in this directory (`MissionAgent.md`, `ConceptAgent.md`, `AircraftDesignAgent.md`, `CADAgent.md`, `SimulationOrchestratorAgent.md`, `CFDAgent.md`, `StructuralAgent.md`, `OptimizationAgent.md`, `ValidationAgent.md`, `MaterialsAgent.md`, `ManufacturingAgent.md`, `CertificationAgent.md`, `DocumentationAgent.md`) for each bay's detailed input/output schema and gating rules.

## Source of truth

This overview was generated from the live codebase, not written independently of it:
- Bay list/descriptions: `src/routes/the-hangar.agents.tsx` (`BAY_GROUPS`)
- Flow/grouping: `src/routes/the-hangar.how-it-works.tsx`
- Tool stack: `src/routes/the-hangar.stack.tsx` (`TOOLS`)
- Hero copy/stats: `src/routes/the-hangar.index.tsx`
- LLM gateway and mock-fallback behavior: `src/lib/the-hangar/llmGateway.ts`

If any of those files change, this doc should be regenerated or updated to match — it is a snapshot, not an independent spec.
