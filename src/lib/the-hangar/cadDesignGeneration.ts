import { createServerFn } from "@tanstack/react-start";
import { callLlmGateway, stripJsonFences } from "./llmGateway.ts";
import type { GeometryParameters, ComponentSelection } from "./aircraftDesignGeneration.ts";

// Bay 04 (CAD Agent) Stage 1's generation step — same createServerFn +
// callLlmGateway + mock-fallback pattern as aircraftDesignGeneration.ts.
// callLlmGateway is already a direct Anthropic SDK call (see its own header
// comment) despite the filename — no separate "gateway" service, and no
// second parallel direct-SDK call path is added here. Runs only after
// cadDesignRules.ts's gate has already passed. validation (interference/DFM)
// is deliberately NOT requested from the model — CADAgent.md frames that as
// a rules-engine job, computed separately in the pipeline from this
// function's own output.

const SYSTEM = `You are CAD Agent's model generation step for TorqWings' aerospace design platform. Given one gated aircraft design (geometry parameters and component selections from the Aircraft Design Agent), propose structured CAD model data: model file metadata (STEP/IGES — labels only, not real files), a bill of materials, and mass properties (weight and center of gravity). Every claim must be grounded in the given geometry/components — do not invent requirements not present in the input. Return JSON only.`;

export interface CADGenerationInput {
  cadCode: string;
  vehicleClass: string;
  geometryParameters: GeometryParameters;
  componentSelections: ComponentSelection[];
  designRationale: string;
}

export interface CADModelFiles {
  step: string;
  iges: string;
}

export interface BomEntry {
  part: string;
  qty: number;
  material: string;
}

export interface MassProperties {
  weightKg: number;
  cg: { x: number; y: number; z: number };
}

export interface CADGenerationResult {
  modelFiles: CADModelFiles;
  bom: BomEntry[];
  massProperties: MassProperties;
  designRationale: string;
  mock: boolean;
}

export const generateCADDesign = createServerFn({ method: "POST" })
  .validator((d: CADGenerationInput) => d)
  .handler(async ({ data }): Promise<CADGenerationResult> => {
    const userContent = `Aircraft design: ${JSON.stringify(data, null, 2)}

Return: { "model_files": { "step": "string", "iges": "string" }, "bom": [{ "part": "string", "qty": number, "material": "string" }], "mass_properties": { "weight_kg": number, "cg": { "x": number, "y": number, "z": number } }, "design_rationale": "string" }`;

    const { content } = await callLlmGateway(SYSTEM, userContent, { jsonMode: true });
    if (!content) return mockCADDesign();

    const parsed = parseCADResponse(content);
    if (!parsed) return mockCADDesign();
    return { ...parsed, mock: false };
  });

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function parseCADResponse(raw: string): Omit<CADGenerationResult, "mock"> | null {
  try {
    const obj = JSON.parse(stripJsonFences(raw));

    const mf = obj.model_files;
    if (
      typeof mf !== "object" ||
      mf === null ||
      typeof mf.step !== "string" ||
      typeof mf.iges !== "string"
    ) {
      return null;
    }

    if (!Array.isArray(obj.bom)) return null;
    const bom: BomEntry[] = obj.bom
      .filter(
        (b: unknown): b is Record<string, unknown> =>
          typeof b === "object" &&
          b !== null &&
          typeof (b as Record<string, unknown>).part === "string",
      )
      .map(
        (b: Record<string, unknown>): BomEntry => ({
          part: b.part as string,
          qty: isFiniteNumber(b.qty) ? b.qty : 0,
          material: typeof b.material === "string" ? b.material : "",
        }),
      );

    const mp = obj.mass_properties;
    if (
      typeof mp !== "object" ||
      mp === null ||
      !isFiniteNumber(mp.weight_kg) ||
      typeof mp.cg !== "object" ||
      mp.cg === null ||
      !isFiniteNumber(mp.cg.x) ||
      !isFiniteNumber(mp.cg.y) ||
      !isFiniteNumber(mp.cg.z)
    ) {
      return null;
    }

    if (typeof obj.design_rationale !== "string") return null;

    return {
      modelFiles: { step: mf.step, iges: mf.iges },
      bom,
      massProperties: {
        weightKg: mp.weight_kg,
        cg: { x: mp.cg.x, y: mp.cg.y, z: mp.cg.z },
      },
      designRationale: obj.design_rationale,
    };
  } catch {
    return null;
  }
}

function mockCADDesign(): CADGenerationResult {
  return {
    modelFiles: { step: "", iges: "" },
    bom: [],
    massProperties: { weightKg: 0, cg: { x: 0, y: 0, z: 0 } },
    designRationale: "Mock design rationale — no ANTHROPIC_API_KEY reply.",
    mock: true,
  };
}
