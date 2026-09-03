import { callLlmGateway, stripJsonFences } from "./llmGateway.ts";
import type { MassProperties, BomEntry } from "./cadDesignGeneration.ts";

// Bay 06 (CFD Agent) Phase 1's generation step — callLlmGateway +
// mock-fallback pattern, same as cadDesignGeneration.ts/simDesignGeneration.ts.
// callLlmGateway is already a direct Anthropic SDK call (see its own header
// comment) — "direct Anthropic Claude API (no gateway)" per CFDAgent.md
// Section 6 is already satisfied by this existing shared helper; no second,
// parallel direct-SDK call path is added here.
//
// Deliberately a plain async function, not a createServerFn, from the
// start — not a later fix. Both cadDesignGeneration.ts's generateCADDesign
// and simDesignGeneration.ts's generateSimDesign were originally built as
// createServerFn and both had to have that wrapper removed after it caused
// confirmed "Server function info not found" failures on real Vercel
// production (the manifest entry for a createServerFn invoked only from
// server-side pipeline code, never from client code, doesn't reliably
// resolve at runtime — see cadDesignGeneration.ts's own header comment for
// the full incident history). generateCFDAnalysis has the identical shape
// (only ever called from cfdAnalysisAgentPipeline.ts, itself only reached
// from a server-only API route handler, never from client code), so it's
// built as a plain function immediately rather than reintroducing a
// confirmed bug and fixing it again later.
//
// CFDAgent.md Section 7's output schema literally shows "forces": { "cl",
// "cd" } and "coefficients": { ... } — matched here exactly, even though a
// strict aerospace naming convention would call Cl/Cd "coefficients" too;
// this follows the spec's own literal schema rather than editorializing
// it. "flow_fields" is specified only as "{ ... }" with no example
// sub-keys — Section 3.3 calls for "a qualitative flow field description",
// so this is implemented as a single narrative text field
// (flow_fields.description) rather than inventing structured sub-fields
// the spec never describes.
//
// source_was_mock is NOT part of this file's own result type — mirrors
// simDesignGeneration.ts's precedent exactly (Section 7's proposed schema
// lists it, but it's a pipeline-level concern, not something the
// generation function decides). Unlike Bay 04/05, CFDAgent.md Section 1
// explicitly directs source_was_mock: true on *every* Phase 1 result,
// regardless of whether this LLM call itself succeeds — see
// cfdAnalysisAgentPipeline.ts for where that's actually set. This file
// still tracks its own internal mock flag (mock: boolean, same meaning as
// every other bay's generation file: did this specific LLM call succeed
// and parse), since the pipeline needs to distinguish "real LLM reasoning,
// still Phase-1-mock by spec" from "engineering fallback, no LLM reply at
// all" for the disclaimer text, even though both cases persist
// source_was_mock: true.

const SYSTEM = `You are CFD Agent's Phase 1 reasoning step for TorqWings' aerospace design platform — no real solver runs in this phase. Given one CAD design's mass properties, bill of materials, and CFD settings (solver type, turbulence model, boundary conditions), reason about a plausible mesh strategy, solver behavior, and produce structured force/coefficient estimates (Cl, Cd, Cm) and a qualitative flow field description. Ground every claim in the given inputs — do not invent requirements not present in them. This is not a real CFD solve (no OpenFOAM/SU2/Fluent) — design_rationale should read as an engineering estimate covering mesh strategy, solver choice, and expected convergence behavior, not a claim of simulated results. Return JSON only.`;

export interface CFDAnalysisGenerationInput {
  massProperties: MassProperties;
  bom: BomEntry[];
  designRationale: string;
  solverType: string | null;
  turbulenceModel: string | null;
  boundaryConditions: Record<string, unknown> | null;
}

export interface CFDForces {
  cl: number;
  cd: number;
}

export interface CFDCoefficients {
  cm: number;
}

export interface CFDFlowFields {
  description: string;
}

export interface CFDAnalysisGenerationResult {
  forces: CFDForces;
  coefficients: CFDCoefficients;
  flowFields: CFDFlowFields;
  designRationale: string;
  // Same meaning as every other bay's generation-level mock flag: false on
  // a successful, parsed Claude response; true only on the fallback branch
  // (no ANTHROPIC_API_KEY or an unparseable response). Distinct from the
  // pipeline's own always-true source_was_mock — see file header comment.
  mock: boolean;
}

export async function generateCFDAnalysis(
  data: CFDAnalysisGenerationInput,
): Promise<CFDAnalysisGenerationResult> {
  const userContent = `CAD design + CFD settings: ${JSON.stringify(data, null, 2)}

Return: { "forces": { "cl": number, "cd": number }, "coefficients": { "cm": number }, "flow_fields": { "description": "string" }, "design_rationale": "string" }`;

  const { content } = await callLlmGateway(SYSTEM, userContent, { jsonMode: true });
  if (!content) return mockCFDAnalysis();

  const parsed = parseCFDAnalysisResponse(content);
  if (!parsed) return mockCFDAnalysis();
  return { ...parsed, mock: false };
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function parseCFDAnalysisResponse(raw: string): Omit<CFDAnalysisGenerationResult, "mock"> | null {
  try {
    const obj = JSON.parse(stripJsonFences(raw));

    const forces = obj.forces;
    if (
      typeof forces !== "object" ||
      forces === null ||
      !isFiniteNumber(forces.cl) ||
      !isFiniteNumber(forces.cd)
    ) {
      return null;
    }

    const coefficients = obj.coefficients;
    if (
      typeof coefficients !== "object" ||
      coefficients === null ||
      !isFiniteNumber(coefficients.cm)
    ) {
      return null;
    }

    const flowFields = obj.flow_fields;
    if (
      typeof flowFields !== "object" ||
      flowFields === null ||
      typeof flowFields.description !== "string"
    ) {
      return null;
    }

    if (typeof obj.design_rationale !== "string") return null;

    return {
      forces: { cl: forces.cl, cd: forces.cd },
      coefficients: { cm: coefficients.cm },
      flowFields: { description: flowFields.description },
      designRationale: obj.design_rationale,
    };
  } catch {
    return null;
  }
}

function mockCFDAnalysis(): CFDAnalysisGenerationResult {
  return {
    forces: { cl: 0, cd: 0 },
    coefficients: { cm: 0 },
    flowFields: { description: "" },
    designRationale: "Mock design rationale — no ANTHROPIC_API_KEY reply.",
    mock: true,
  };
}
