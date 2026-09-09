import { callLlmGateway, stripJsonFences } from "./llmGateway.ts";

// Bay 08 (Optimization Agent) Phase 1's generation step — callLlmGateway +
// mock-fallback pattern, same as cfdAnalysisGeneration.ts/
// structuralGeneration.ts. Deliberately a plain async function, not a
// createServerFn, from the start — same reasoning cfdAnalysisGeneration.ts's
// own header comment gives (only ever called from
// optimizationAgentPipeline.ts, itself only reached from a server-only API
// route handler, never from client code).
//
// OptimizationAgent.md Section 1: this does NOT run a real multi-objective
// search (no Optuna/PyGMO) — there is exactly one candidate design (one CFD
// result + one structural result), not a population to search over. The
// output field is trade_off_analysis, not pareto_set, so the schema doesn't
// overclaim what Phase 1 actually does.
//
// source_was_mock is NOT part of this file's own result type — mirrors
// cfdAnalysisGeneration.ts's/structuralGeneration.ts's precedent: it's a
// pipeline-level concern (OR-composed against both upstream results' own
// source_was_mock flags), not something this generation function decides.
// This file still tracks its own internal mock flag (mock: boolean) for the
// same reason every other bay's generation file does: distinguishing "real
// LLM reasoning" from "engineering fallback, no LLM reply at all."

const SYSTEM = `You are Optimization Agent's Phase 1 reasoning step for TorqWings' aerospace design platform — no real multi-objective search runs in this phase, since there is exactly one design candidate (one CFD result, one structural result), not a population to search over. Given one design's CFD forces/coefficients and structural stress/safety-factor results, reason about where this design sits on the weight/drag/cost/safety trade-off space, and produce normalized objective scores, a qualitative trade-off narrative, and directional recommendations (e.g. "reducing X would likely improve Y at some cost to Z") for a human or a future design iteration to act on. Ground every claim in the given inputs — do not invent requirements not present in them. If constraints are null, reason qualitatively and say so rather than inventing specific numeric targets. This is not a real optimization search — trade_off_analysis should read as an engineering assessment of the current design's position, not a claim of having searched multiple candidates. Return JSON only.`;

export interface OptimizationGenerationInput {
  cfdForces: { cl: number; cd: number };
  cfdCoefficients: { cm: number };
  structuralStress: { von_mises_max_mpa: number; max_displacement_mm: number };
  safetyFactor: number;
  riskFlags: string[];
  constraints: { maxLoadFactor: number | null; materialClass: string | null } | null;
}

export interface ObjectiveScores {
  weight: number;
  drag: number;
  cost: number;
  safety: number;
}

export interface RecommendedAdjustment {
  parameter: string;
  direction: "increase" | "decrease";
  rationale: string;
}

export interface OptimizationGenerationResult {
  objectiveScores: ObjectiveScores;
  tradeOffAnalysis: string;
  recommendedAdjustments: RecommendedAdjustment[];
  overallOptimizationScore: number;
  riskFlags: string[];
  reasoningSummary: string;
  // Same meaning as every other bay's generation-level mock flag: false on
  // a successful, parsed Claude response; true only on the fallback branch.
  mock: boolean;
}

export async function generateOptimizationAnalysis(
  data: OptimizationGenerationInput,
): Promise<OptimizationGenerationResult> {
  const userContent = `CFD result + structural result: ${JSON.stringify(data, null, 2)}

Return: { "objective_scores": { "weight": number, "drag": number, "cost": number, "safety": number }, "trade_off_analysis": "string", "recommended_adjustments": [{ "parameter": "string", "direction": "increase | decrease", "rationale": "string" }], "overall_optimization_score": number, "risk_flags": ["string"], "reasoning_summary": "string" }`;

  const { content } = await callLlmGateway(SYSTEM, userContent, { jsonMode: true });
  if (!content) return mockOptimizationAnalysis();

  const parsed = parseOptimizationResponse(content);
  if (!parsed) return mockOptimizationAnalysis();
  return { ...parsed, mock: false };
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isDirection(v: unknown): v is "increase" | "decrease" {
  return v === "increase" || v === "decrease";
}

function parseOptimizationResponse(
  raw: string,
): Omit<OptimizationGenerationResult, "mock"> | null {
  try {
    const obj = JSON.parse(stripJsonFences(raw));

    const scores = obj.objective_scores;
    if (
      typeof scores !== "object" ||
      scores === null ||
      !isFiniteNumber(scores.weight) ||
      !isFiniteNumber(scores.drag) ||
      !isFiniteNumber(scores.cost) ||
      !isFiniteNumber(scores.safety)
    ) {
      return null;
    }

    if (typeof obj.trade_off_analysis !== "string") return null;

    const adjustmentsRaw = obj.recommended_adjustments;
    if (!Array.isArray(adjustmentsRaw)) return null;
    const recommendedAdjustments: RecommendedAdjustment[] = [];
    for (const a of adjustmentsRaw) {
      if (
        typeof a !== "object" ||
        a === null ||
        typeof a.parameter !== "string" ||
        !isDirection(a.direction) ||
        typeof a.rationale !== "string"
      ) {
        return null;
      }
      recommendedAdjustments.push({
        parameter: a.parameter,
        direction: a.direction,
        rationale: a.rationale,
      });
    }

    if (!isFiniteNumber(obj.overall_optimization_score)) return null;

    const riskFlags = Array.isArray(obj.risk_flags)
      ? obj.risk_flags.filter((f: unknown): f is string => typeof f === "string")
      : [];

    if (typeof obj.reasoning_summary !== "string") return null;

    return {
      objectiveScores: {
        weight: scores.weight,
        drag: scores.drag,
        cost: scores.cost,
        safety: scores.safety,
      },
      tradeOffAnalysis: obj.trade_off_analysis,
      recommendedAdjustments,
      overallOptimizationScore: obj.overall_optimization_score,
      riskFlags,
      reasoningSummary: obj.reasoning_summary,
    };
  } catch {
    return null;
  }
}

function mockOptimizationAnalysis(): OptimizationGenerationResult {
  return {
    objectiveScores: { weight: 0, drag: 0, cost: 0, safety: 0 },
    tradeOffAnalysis: "",
    recommendedAdjustments: [],
    overallOptimizationScore: 0,
    riskFlags: [],
    reasoningSummary: "Mock reasoning summary — no ANTHROPIC_API_KEY reply.",
    mock: true,
  };
}
