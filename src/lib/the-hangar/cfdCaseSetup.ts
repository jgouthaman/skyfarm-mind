import { z } from "zod";
import { callLlmGateway, stripJsonFences, type LlmProvider, type LlmUsage } from "./llmGateway.ts";

// Bay 06 (CFD Agent) solver case setup for a real run (Hangar_CFD_runs).
// The LLM only chooses settings -- velocity, angle of attack, reference
// dimensions, mesh level, iteration budget -- from the mission's
// constraints/KPIs and the CAD metadata. It never produces aerodynamic
// results: those come only from the solver job on GCP.
//
// Every field is validated on its own with zod, so one bad value falls back
// to its default without throwing away the rest. Numbers outside sane bounds
// are clamped. The result records which fields were defaulted and which
// were clamped, so the run row and the UI can say so.
//
// Goes through callLlmGateway, which tries providers in the Mission Hub AI
// Providers order. Plain async function, not a createServerFn -- see
// cfdAnalysisGeneration.ts's header for why server-only calls avoid it.

export type MeshLevel = "coarse" | "medium" | "fine";

export interface CFDCaseSetup {
  solver: "simpleFoam";
  turbulence_model: "kOmegaSST";
  freestream_velocity_ms: number;
  angle_of_attack_deg: number;
  air_density_kgm3: number;
  kinematic_viscosity_m2s: number;
  reference_area_m2: number;
  reference_length_m: number;
  domain_scale: number;
  mesh_level: MeshLevel;
  max_iterations: number;
  rationale: string;
}

export interface CFDCaseSetupInput {
  missionConstraints: unknown[];
  missionKpis: unknown[];
  cad: {
    cadCode: string;
    modelFilePath: string | null;
    massProperties: Record<string, unknown> | null;
    bom: unknown[];
    designRationale: string | null;
  };
}

export interface CFDCaseSetupResult {
  caseSetup: CFDCaseSetup;
  defaultedFields: (keyof CFDCaseSetup)[];
  clampedFields: (keyof CFDCaseSetup)[];
  // True when no LLM reply was usable and every field is a default.
  mock: boolean;
  provider: LlmProvider | null;
  usage: LlmUsage | null;
}

// Sea-level ISA air, a small UAV cruise point, a medium mesh.
export const DEFAULT_CFD_CASE_SETUP: CFDCaseSetup = {
  solver: "simpleFoam",
  turbulence_model: "kOmegaSST",
  freestream_velocity_ms: 20,
  angle_of_attack_deg: 2,
  air_density_kgm3: 1.225,
  kinematic_viscosity_m2s: 1.46e-5,
  reference_area_m2: 0.5,
  reference_length_m: 0.3,
  domain_scale: 10,
  mesh_level: "medium",
  max_iterations: 1000,
  rationale:
    "Default case setup (sea-level ISA air, 20 m/s, 2° angle of attack, medium mesh): no usable AI case setup.",
};

// [min, max] for every numeric field; values outside are clamped.
const BOUNDS: Partial<Record<keyof CFDCaseSetup, [number, number]>> = {
  freestream_velocity_ms: [1, 100],
  angle_of_attack_deg: [-10, 20],
  air_density_kgm3: [0.3, 1.5],
  kinematic_viscosity_m2s: [1e-6, 1e-4],
  reference_area_m2: [0.001, 100],
  reference_length_m: [0.01, 50],
  domain_scale: [5, 50],
  max_iterations: [100, 3000],
};

const finite = z.number().finite();
const FIELD_SCHEMAS: Record<keyof CFDCaseSetup, z.ZodTypeAny> = {
  solver: z.literal("simpleFoam"),
  turbulence_model: z.literal("kOmegaSST"),
  freestream_velocity_ms: finite,
  angle_of_attack_deg: finite,
  air_density_kgm3: finite.positive(),
  kinematic_viscosity_m2s: finite.positive(),
  reference_area_m2: finite.positive(),
  reference_length_m: finite.positive(),
  domain_scale: finite.positive(),
  mesh_level: z.enum(["coarse", "medium", "fine"]),
  max_iterations: finite,
  rationale: z.string().trim().min(1).max(2000),
};

const SYSTEM = `You set up an OpenFOAM external-aerodynamics case for TorqWings' CFD Agent. From a UAV mission's constraints and KPIs and its CAD model metadata, choose solver settings only. You must NOT estimate or state any aerodynamic result (no lift, drag, Cl, Cd, Cm or forces) -- the solver computes those.

Fixed: solver "simpleFoam", turbulence_model "kOmegaSST".
Choose: freestream_velocity_ms (the mission's cruise speed, 1-100), angle_of_attack_deg (-10 to 20, the cruise attitude), air_density_kgm3 and kinematic_viscosity_m2s (for the mission's operating altitude; sea level is 1.225 and 1.46e-5), reference_area_m2 and reference_length_m (wing area and mean chord, or frontal area and length for a multirotor, from the CAD metadata), domain_scale (domain size in body lengths, 5-50), mesh_level ("coarse", "medium" or "fine"), max_iterations (100-3000), and a short rationale tying each choice to the inputs.

Return JSON only:
{ "solver": "simpleFoam", "turbulence_model": "kOmegaSST", "freestream_velocity_ms": number, "angle_of_attack_deg": number, "air_density_kgm3": number, "kinematic_viscosity_m2s": number, "reference_area_m2": number, "reference_length_m": number, "domain_scale": number, "mesh_level": "coarse" | "medium" | "fine", "max_iterations": number, "rationale": "string" }`;

// Validates and clamps one raw LLM object field by field. Exported for tests.
export function normalizeCaseSetup(
  raw: unknown,
): Omit<CFDCaseSetupResult, "mock" | "provider" | "usage"> {
  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out = { ...DEFAULT_CFD_CASE_SETUP } as Record<keyof CFDCaseSetup, unknown>;
  const defaultedFields: (keyof CFDCaseSetup)[] = [];
  const clampedFields: (keyof CFDCaseSetup)[] = [];

  for (const key of Object.keys(FIELD_SCHEMAS) as (keyof CFDCaseSetup)[]) {
    const parsed = FIELD_SCHEMAS[key].safeParse(obj[key]);
    if (!parsed.success) {
      defaultedFields.push(key);
      continue;
    }
    let value = parsed.data as unknown;
    const bounds = BOUNDS[key];
    if (bounds && typeof value === "number") {
      const clamped = Math.min(bounds[1], Math.max(bounds[0], value));
      if (clamped !== value) clampedFields.push(key);
      value = key === "max_iterations" ? Math.round(clamped) : clamped;
    }
    out[key] = value;
  }
  return { caseSetup: out as unknown as CFDCaseSetup, defaultedFields, clampedFields };
}

export async function buildCFDCaseSetup(input: CFDCaseSetupInput): Promise<CFDCaseSetupResult> {
  const userContent = `Mission constraints: ${JSON.stringify(input.missionConstraints ?? [], null, 2)}
Mission KPIs: ${JSON.stringify(input.missionKpis ?? [], null, 2)}
CAD design ${input.cad.cadCode}:
- model file: ${input.cad.modelFilePath ?? "unknown"}
- mass properties: ${JSON.stringify(input.cad.massProperties ?? {}, null, 2)}
- bill of materials: ${JSON.stringify(input.cad.bom ?? [], null, 2)}
- design rationale: ${input.cad.designRationale ?? "none"}`;

  const allDefaults = (): CFDCaseSetupResult => ({
    caseSetup: { ...DEFAULT_CFD_CASE_SETUP },
    defaultedFields: Object.keys(FIELD_SCHEMAS) as (keyof CFDCaseSetup)[],
    clampedFields: [],
    mock: true,
    provider: null,
    usage: null,
  });

  const { content, usage, provider } = await callLlmGateway(SYSTEM, userContent, {
    jsonMode: true,
  });
  if (!content) return allDefaults();
  let raw: unknown;
  try {
    raw = JSON.parse(stripJsonFences(content));
  } catch {
    return { ...allDefaults(), provider, usage };
  }
  return { ...normalizeCaseSetup(raw), mock: false, provider, usage };
}
