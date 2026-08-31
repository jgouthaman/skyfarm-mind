import { createServerFn } from "@tanstack/react-start";
import { callLlmGateway, stripJsonFences } from "./llmGateway.ts";

// Bay 03 Stage 1's SCORE + GENERATE step (AircraftDesignAgent.md Section
// 4.1/4.2) — same createServerFn + callLlmGateway + mock-fallback pattern
// as Concept Agent's conceptIdeation.ts (real Claude Sonnet 5 calls via
// the Anthropic SDK, ./llmGateway.ts — this codebase has not used a
// "Lovable AI gateway" or GPT-4o/Llama anywhere since that gateway was
// replaced project-wide; see llmGateway.ts's own header comment). Runs
// only after aircraftDesignRules.ts's gate has already passed — this step
// reasons about an already-feasible concept, it never decides pass/fail.

const SYSTEM = `You are Aircraft Design Agent's geometry generation step for TorqWings' aerospace design platform. Given one gated, feasible vehicle concept (name, description, vehicle class, rationale), propose plausible aircraft geometry parameters and a component selection consistent with that concept. Every claim must be grounded in the given concept — do not invent mission requirements not present in the input. State your reasoning in design_rationale. Return JSON only.`;

export interface GeometryGenerationInput {
  conceptName: string;
  description: string;
  vehicleClass: string;
  rationale: string;
  constraintFit: "pass" | "partial" | "fail";
}

export interface GeometryParameters {
  wingspan_m: number;
  fuselageLength_m: number;
  wingArea_m2: number;
  aspectRatio: number;
  vehicleClass: string;
}

export interface ComponentSelection {
  category: string;
  selection: string;
  rationale: string;
}

export interface GeometryGenerationResult {
  geometryParameters: GeometryParameters;
  componentSelections: ComponentSelection[];
  designRationale: string;
  mock: boolean;
}

export const generateAircraftDesignGeometry = createServerFn({ method: "POST" })
  .validator((d: GeometryGenerationInput) => d)
  .handler(async ({ data }): Promise<GeometryGenerationResult> => {
    const userContent = `Concept: ${JSON.stringify(data, null, 2)}

Return: { "geometry_parameters": { "wingspan_m": number, "fuselage_length_m": number, "wing_area_m2": number, "aspect_ratio": number }, "component_selections": [{ "category": "string", "selection": "string", "rationale": "string" }], "design_rationale": "string" }`;

    const { content } = await callLlmGateway(SYSTEM, userContent, { jsonMode: true });
    if (!content) return mockGeometry(data);

    const parsed = parseGeometryResponse(content, data.vehicleClass);
    if (!parsed) return mockGeometry(data);
    return { ...parsed, mock: false };
  });

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function parseGeometryResponse(
  raw: string,
  vehicleClass: string,
): Omit<GeometryGenerationResult, "mock"> | null {
  try {
    const obj = JSON.parse(stripJsonFences(raw));
    const g = obj.geometry_parameters;
    if (
      typeof g !== "object" ||
      g === null ||
      !isFiniteNumber(g.wingspan_m) ||
      !isFiniteNumber(g.fuselage_length_m) ||
      !isFiniteNumber(g.wing_area_m2) ||
      !isFiniteNumber(g.aspect_ratio)
    ) {
      return null;
    }
    if (typeof obj.design_rationale !== "string") return null;
    const componentSelections = Array.isArray(obj.component_selections)
      ? obj.component_selections
          .filter(
            (c: unknown): c is Record<string, unknown> =>
              typeof c === "object" &&
              c !== null &&
              typeof (c as Record<string, unknown>).category === "string",
          )
          .map(
            (c: Record<string, unknown>): ComponentSelection => ({
              category: c.category as string,
              selection: typeof c.selection === "string" ? c.selection : "",
              rationale: typeof c.rationale === "string" ? c.rationale : "",
            }),
          )
      : [];
    return {
      geometryParameters: {
        wingspan_m: g.wingspan_m,
        fuselageLength_m: g.fuselage_length_m,
        wingArea_m2: g.wing_area_m2,
        aspectRatio: g.aspect_ratio,
        vehicleClass,
      },
      componentSelections,
      designRationale: obj.design_rationale,
    };
  } catch {
    return null;
  }
}

function mockGeometry(data: GeometryGenerationInput): GeometryGenerationResult {
  return {
    geometryParameters: {
      wingspan_m: 0,
      fuselageLength_m: 0,
      wingArea_m2: 0,
      aspectRatio: 0,
      vehicleClass: data.vehicleClass,
    },
    componentSelections: [],
    designRationale: "Mock design rationale — no ANTHROPIC_API_KEY reply.",
    mock: true,
  };
}
