import { callLlmGateway, stripJsonFences } from "./llmGateway.ts";

// Bay 09 (Validation Agent) Phase 1's generation step — callLlmGateway +
// mock-fallback pattern, same as optimizationGeneration.ts. Deliberately a
// plain async function, not a createServerFn, from the start — same
// reasoning every other bay's generation file gives (only ever called from
// validationAgentPipeline.ts, itself only reached from a server-only API
// route handler, never from client code).
//
// ValidationAgent.md Section 9: this does NOT run a real regulatory
// rules-engine or certification database lookup — there is no live FAR/
// EASA/MIL/ISO clause database wired up in Phase 1. The LLM reasons over
// the applicable standards list and the upstream optimization result to
// produce a qualitative compliance assessment. verdict/readiness_score
// should read as an engineering judgment call, not a claim of having run a
// certified compliance audit.
//
// source_was_mock is NOT part of this file's own result type — mirrors
// every other bay's precedent: it's a pipeline-level concern (OR-composed
// against the upstream Bay 08 result's own source_was_mock flag), not
// something this generation function decides. This file still tracks its
// own internal mock flag (mock: boolean) for the same reason every other
// bay's generation file does: distinguishing "real LLM reasoning" from
// "engineering fallback, no LLM reply at all."

const SYSTEM = `You are Validation Agent's Phase 1 reasoning step for TorqWings' aerospace design platform — no real regulatory rules-engine or certification database lookup runs in this phase, since there is no live FAR/EASA/MIL/ISO clause database wired up yet. Given one design's optimization result (objective scores, trade-off analysis, overall optimization score, risk flags), its carried-through structural safety factor, its mission constraints, and the list of regulatory standards that apply to this design, reason about whether the design is likely compliant, produce a compliance matrix (one entry per applicable standard, with a pass/fail/not_applicable status and a short note), a list of non-conformances if any (with severity and a suggested fix reference), an overall verdict, and a weighted readiness score. Ground every claim in the given inputs — do not invent standards or requirements not present in the applicable standards list. If mission constraints are null, reason qualitatively and say so rather than inventing specific numeric targets. This is not a certified compliance audit — the compliance matrix and readiness score should read as an engineering assessment, not a claim of formal certification. Return JSON only.`;

export interface ValidationGenerationInput {
  objectiveScores: { weight: number; drag: number; cost: number; safety: number };
  tradeOffAnalysis: string;
  overallOptimizationScore: number;
  optimizationRiskFlags: string[];
  structuralSafetyFactor: number;
  missionConstraints: { maxLoadFactor: number | null; materialClass: string | null } | null;
  applicableStandards: string[];
}

export interface ComplianceMatrixEntry {
  standard: string;
  status: "pass" | "fail" | "not_applicable";
  notes: string;
}

export interface NonConformance {
  issue: string;
  severity: "low" | "medium" | "high" | "critical";
  fixReference: string;
}

export interface ValidationGenerationResult {
  verdict: "PASS" | "FAIL" | "CONDITIONAL";
  complianceMatrix: ComplianceMatrixEntry[];
  nonConformances: NonConformance[];
  readinessScore: number;
  riskFlags: string[];
  reasoningSummary: string;
  // Same meaning as every other bay's generation-level mock flag: false on
  // a successful, parsed Claude response; true only on the fallback branch.
  mock: boolean;
}

export async function generateValidationAnalysis(
  data: ValidationGenerationInput,
): Promise<ValidationGenerationResult> {
  const userContent = `Optimization result + carried structural/mission data + applicable standards: ${JSON.stringify(data, null, 2)}

Return: { "verdict": "PASS | FAIL | CONDITIONAL", "compliance_matrix": [{ "standard": "string", "status": "pass | fail | not_applicable", "notes": "string" }], "non_conformances": [{ "issue": "string", "severity": "low | medium | high | critical", "fix_reference": "string" }], "readiness_score": number, "risk_flags": ["string"], "reasoning_summary": "string" }`;

  const { content } = await callLlmGateway(SYSTEM, userContent, { jsonMode: true });
  if (!content) return mockValidationAnalysis();

  const parsed = parseValidationResponse(content);
  if (!parsed) return mockValidationAnalysis();
  return { ...parsed, mock: false };
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isVerdict(v: unknown): v is "PASS" | "FAIL" | "CONDITIONAL" {
  return v === "PASS" || v === "FAIL" || v === "CONDITIONAL";
}

function isComplianceStatus(v: unknown): v is "pass" | "fail" | "not_applicable" {
  return v === "pass" || v === "fail" || v === "not_applicable";
}

function isSeverity(v: unknown): v is "low" | "medium" | "high" | "critical" {
  return v === "low" || v === "medium" || v === "high" || v === "critical";
}

function parseValidationResponse(
  raw: string,
): Omit<ValidationGenerationResult, "mock"> | null {
  try {
    const obj = JSON.parse(stripJsonFences(raw));

    if (!isVerdict(obj.verdict)) return null;

    const matrixRaw = obj.compliance_matrix;
    if (!Array.isArray(matrixRaw)) return null;
    const complianceMatrix: ComplianceMatrixEntry[] = [];
    for (const m of matrixRaw) {
      if (
        typeof m !== "object" ||
        m === null ||
        typeof m.standard !== "string" ||
        !isComplianceStatus(m.status) ||
        typeof m.notes !== "string"
      ) {
        return null;
      }
      complianceMatrix.push({ standard: m.standard, status: m.status, notes: m.notes });
    }

    const nonConformancesRaw = obj.non_conformances;
    if (!Array.isArray(nonConformancesRaw)) return null;
    const nonConformances: NonConformance[] = [];
    for (const n of nonConformancesRaw) {
      if (
        typeof n !== "object" ||
        n === null ||
        typeof n.issue !== "string" ||
        !isSeverity(n.severity) ||
        typeof n.fix_reference !== "string"
      ) {
        return null;
      }
      nonConformances.push({ issue: n.issue, severity: n.severity, fixReference: n.fix_reference });
    }

    if (!isFiniteNumber(obj.readiness_score)) return null;

    const riskFlags = Array.isArray(obj.risk_flags)
      ? obj.risk_flags.filter((f: unknown): f is string => typeof f === "string")
      : [];

    if (typeof obj.reasoning_summary !== "string") return null;

    return {
      verdict: obj.verdict,
      complianceMatrix,
      nonConformances,
      readinessScore: obj.readiness_score,
      riskFlags,
      reasoningSummary: obj.reasoning_summary,
    };
  } catch {
    return null;
  }
}

function mockValidationAnalysis(): ValidationGenerationResult {
  return {
    verdict: "CONDITIONAL",
    complianceMatrix: [],
    nonConformances: [],
    readinessScore: 0,
    riskFlags: [],
    reasoningSummary: "Mock reasoning summary — no ANTHROPIC_API_KEY reply.",
    mock: true,
  };
}
