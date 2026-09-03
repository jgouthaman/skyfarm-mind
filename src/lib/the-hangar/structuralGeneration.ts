import { callLlmGateway, stripJsonFences } from "./llmGateway.ts";
import type { MassProperties } from "./cadDesignGeneration.ts";

// Bay 07 (Structural Agent) generation step — callLlmGateway +
// mock-fallback pattern, same as simDesignGeneration.ts/cadDesignGeneration.ts.
// Runs only after structuralRules.ts's evaluateStructuralGate has already
// passed.
//
// Plain async function from the start, not a createServerFn — matches
// generateSimDesign's and generateCADDesign's own (post-hotfix) shape.
// Both were originally createServerFn and both had to have that wrapper
// removed after confirmed "Server function info not found" failures on
// real Vercel production for functions invoked only server-to-server (see
// cadDesignGeneration.ts's header comment for the full incident history).
// generateStructuralAnalysis has the identical shape (only ever called from
// structuralAgentPipeline.ts, itself only reached from a server-only API
// route handler, never from client code), so it's built as a plain
// function immediately rather than reintroducing a confirmed bug.
//
// Input shape: StructuralAgent.md Section 7's proposed generation input is
// deliberately narrower than simDesignGeneration.ts's own input — mass
// properties + validation + constraints only, no bom/designRationale
// (Section 1's Input scope note explicitly limits this pass to "Bay 04's
// CAD output only," and the constraints fields have no real source to pull
// from yet either — see the constraints comment below). Matched exactly to
// the spec's literal schema rather than reusing Sim's superset.
//
// constraints (max_load_factor/material_class) per Section 1's "Constraints
// & KPIs — carried from Mission Spec": same disclosed gap
// simDesignAgentPipeline.ts already documents for `vertical` — nothing in
// the Concept/Aircraft Design/CAD chain actually carries Mission Agent's
// mission_specs constraints forward, so there is no real value to look up.
// Always null in this pass (see structuralAgentPipeline.ts), and the system
// prompt below handles a null constraints object the same honest way
// simDesignGeneration.ts's system prompt handles a null thresholds object:
// reason qualitatively and say so, never treat null as zero.
//
// Material allowables gap (StructuralAgent.md Section 5, flagged in
// structuralRules.ts's header comment): no real Materials DB exists, so
// the system prompt instructs the LLM to use general/approximated
// aerospace material allowables rather than claim a real database lookup.
//
// confidence_score is in Section 7's proposed schema but not requested
// from the LLM here, matching cadDesignGeneration.ts/simDesignGeneration.ts's
// actual pattern exactly: it's an entirely pipeline-computed formula
// (computeStructuralConfidence) so the model is never asked to produce or
// reason about it, preventing a narrative/displayed-value mismatch.
// safety_factor is NOT stripped the same way — unlike confidence_score
// (a meta self-assessment of the model's own certainty), safety_factor is
// itself a genuine structural-engineering result (analogous to
// stress_results), the same kind of domain output flight_envelope/
// stability are for simDesignGeneration.ts, not a confidence rating.
//
// structural_id/cad_id are assembled by structuralAgentPipeline.ts, not
// here — matching simDesignGeneration.ts's/cadDesignGeneration.ts's own
// precedent of never threading the entity's own id through generation.

export type LoadCaseType = "static" | "modal" | "fatigue";
export type ConvergenceStatus = "converged" | "not_converged" | "not_applicable";

export interface StructuralConstraints {
  maxLoadFactor: number | null;
  materialClass: string | null;
}

export interface StructuralGenerationInput {
  massProperties: MassProperties;
  interferenceClear: boolean;
  dfmFlags: string[];
  constraints: StructuralConstraints;
}

export interface MeshMaterial {
  elementType: string;
  materialAssigned: string;
  modulusGpa: number;
  yieldStrengthMpa: number;
}

export interface LoadCase {
  case: LoadCaseType;
  description: string;
}

export interface StressResults {
  vonMisesMaxMpa: number;
  maxDisplacementMm: number;
  criticalLocations: string[];
}

// Matches StructuralAgent.md Section 7's LLM-derived fields: mesh_material,
// load_cases, stress_results, safety_factor, convergence_status,
// risk_flags, reasoning_summary, source_was_mock. confidence_score is
// deliberately NOT part of this type — see the file header comment;
// structural_id/cad_id also aren't, for the reason already documented
// there.
export interface StructuralGenerationResult {
  meshMaterial: MeshMaterial;
  loadCases: LoadCase[];
  stressResults: StressResults;
  safetyFactor: number;
  convergenceStatus: ConvergenceStatus;
  riskFlags: string[];
  reasoningSummary: string;
  // Same meaning as every other bay's generation-level mock flag: false on
  // a successful, parsed Claude response; true only on the fallback branch
  // (no ANTHROPIC_API_KEY or an unparseable response).
  sourceWasMock: boolean;
}

const SYSTEM = `You are Structural Agent's mesh/material setup, load-case reasoning, and safety-factor evaluation step for TorqWings' aerospace design platform. Given one CAD design's mass properties, geometry validation (interference/DFM), and optional load/material constraints, reason about a plausible mesh element type and assigned material (with modulus and yield strength), define relevant load cases (static/modal/fatigue), estimate stress results (Von Mises max stress, max displacement, critical locations), compute a safety factor against material allowables, report a convergence status, and list any risk flags. There is no real Materials DB available — use general, approximated aerospace material allowables (e.g. typical aluminum/composite yield figures) rather than claiming a real per-material database lookup, and say so in reasoning_summary. If constraints (max load factor, material class) are supplied, bound your reasoning by them; if a specific constraint is null, that means no confirmed value exists for that dimension, not zero: reason qualitatively using general aerospace judgment and say so explicitly in reasoning_summary. Never treat a null constraint as a target of zero. Explain your overall assessment qualitatively in reasoning_summary — confidence scoring is computed separately from your assessment, not by you, so do not invent or cite a specific confidence number. Every claim must be grounded in the given mass properties/validation — do not invent requirements not present in the input. This is not a real FEA solve (no CalculiX/Code_Aster/Abaqus) — reasoning_summary should read as an engineering estimate, not a claim of simulated results. Return JSON only.`;

export async function generateStructuralAnalysis(
  data: StructuralGenerationInput,
): Promise<StructuralGenerationResult> {
  const userContent = `CAD design: ${JSON.stringify(data, null, 2)}

Return: { "mesh_material": { "element_type": "string", "material_assigned": "string", "modulus_gpa": number, "yield_strength_mpa": number }, "load_cases": [ { "case": "static | modal | fatigue", "description": "string" } ], "stress_results": { "von_mises_max_mpa": number, "max_displacement_mm": number, "critical_locations": ["string"] }, "safety_factor": number, "convergence_status": "converged | not_converged | not_applicable", "risk_flags": ["string"], "reasoning_summary": "string" }`;

  const { content } = await callLlmGateway(SYSTEM, userContent, { jsonMode: true });
  if (!content) return mockStructuralAnalysis();

  const parsed = parseStructuralResponse(content);
  if (!parsed) return mockStructuralAnalysis();
  return { ...parsed, sourceWasMock: false };
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isLoadCaseType(v: unknown): v is LoadCaseType {
  return v === "static" || v === "modal" || v === "fatigue";
}

function isConvergenceStatus(v: unknown): v is ConvergenceStatus {
  return v === "converged" || v === "not_converged" || v === "not_applicable";
}

function parseStructuralResponse(
  raw: string,
): Omit<StructuralGenerationResult, "sourceWasMock"> | null {
  try {
    const obj = JSON.parse(stripJsonFences(raw));

    const mm = obj.mesh_material;
    if (
      typeof mm !== "object" ||
      mm === null ||
      typeof mm.element_type !== "string" ||
      typeof mm.material_assigned !== "string" ||
      !isFiniteNumber(mm.modulus_gpa) ||
      !isFiniteNumber(mm.yield_strength_mpa)
    ) {
      return null;
    }

    if (!Array.isArray(obj.load_cases)) return null;
    const loadCases: LoadCase[] = [];
    for (const lc of obj.load_cases) {
      if (
        typeof lc !== "object" ||
        lc === null ||
        !isLoadCaseType(lc.case) ||
        typeof lc.description !== "string"
      ) {
        return null;
      }
      loadCases.push({ case: lc.case, description: lc.description });
    }

    const sr = obj.stress_results;
    if (
      typeof sr !== "object" ||
      sr === null ||
      !isFiniteNumber(sr.von_mises_max_mpa) ||
      !isFiniteNumber(sr.max_displacement_mm) ||
      !Array.isArray(sr.critical_locations)
    ) {
      return null;
    }
    const criticalLocations: string[] = sr.critical_locations.filter(
      (l: unknown): l is string => typeof l === "string",
    );

    if (!isFiniteNumber(obj.safety_factor)) return null;
    if (!isConvergenceStatus(obj.convergence_status)) return null;
    if (typeof obj.reasoning_summary !== "string") return null;

    const riskFlags: string[] = Array.isArray(obj.risk_flags)
      ? obj.risk_flags.filter((f: unknown): f is string => typeof f === "string")
      : [];

    return {
      meshMaterial: {
        elementType: mm.element_type,
        materialAssigned: mm.material_assigned,
        modulusGpa: mm.modulus_gpa,
        yieldStrengthMpa: mm.yield_strength_mpa,
      },
      loadCases,
      stressResults: {
        vonMisesMaxMpa: sr.von_mises_max_mpa,
        maxDisplacementMm: sr.max_displacement_mm,
        criticalLocations,
      },
      safetyFactor: obj.safety_factor,
      convergenceStatus: obj.convergence_status,
      riskFlags,
      reasoningSummary: obj.reasoning_summary,
    };
  } catch {
    return null;
  }
}

function mockStructuralAnalysis(): StructuralGenerationResult {
  return {
    meshMaterial: {
      elementType: "",
      materialAssigned: "",
      modulusGpa: 0,
      yieldStrengthMpa: 0,
    },
    loadCases: [],
    stressResults: {
      vonMisesMaxMpa: 0,
      maxDisplacementMm: 0,
      criticalLocations: [],
    },
    safetyFactor: 0,
    convergenceStatus: "not_applicable",
    riskFlags: [
      "No real assessment was performed — ANTHROPIC_API_KEY missing or the LLM response was unparseable.",
    ],
    reasoningSummary: "Mock reasoning summary — no ANTHROPIC_API_KEY reply.",
    sourceWasMock: true,
  };
}
