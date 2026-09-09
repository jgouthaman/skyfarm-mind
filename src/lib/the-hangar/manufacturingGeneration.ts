import { callLlmGateway, stripJsonFences } from "./llmGateway.ts";

// Bay 11 (Manufacturing Agent) Phase 1's generation step -- callLlmGateway
// + mock-fallback pattern, same as materialsGeneration.ts. Deliberately a
// plain async function, not a createServerFn, from the start -- same
// reasoning every other bay's generation file gives.
//
// ManufacturingAgent.md Section 1: this does NOT run a real DFM rule
// engine or cost-modeling tool -- the LLM reasons over the upstream
// validation result and a carried-through CAD design reference (id only,
// not full geometry) to produce a qualitative DFM report, build plan, and
// BOM. Output should read as an engineering judgment call, not a claim of
// a real manufacturability simulation.
//
// source_was_mock is NOT part of this file's own result type -- mirrors
// every other bay's precedent: it's a pipeline-level concern, not
// something this generation function decides. This file still tracks its
// own internal mock flag (mock: boolean) for the same reason every other
// bay's generation file does.

const SYSTEM = `You are Manufacturing Agent's Phase 1 reasoning step for TorqWings' aerospace design platform -- no real DFM rule engine or cost-modeling tool runs in this phase. Given a design's validation result (verdict, compliance matrix issues, non-conformances, readiness score), a carried-through CAD design reference id (no actual geometry data), and mission constraints, reason about likely manufacturability concerns -- produce a DFM report (issue, severity, suggested fix reference), a step-by-step build plan (assembly sequence, tooling notes), and a bill of materials (component list). Ground every claim in the given inputs -- do not invent specific part numbers, supplier names, or tolerances not present in them. If the CAD reference or constraints are null, reason qualitatively and say so rather than inventing specific numeric values. This is not a real manufacturability simulation -- the DFM report and build plan should read as an engineering judgment call, not a claim of a real DFM tool run. Return JSON only.`;

export interface ManufacturingGenerationInput {
  validationVerdict: "PASS" | "FAIL" | "CONDITIONAL";
  complianceMatrix: { standard: string; status: string; notes: string }[];
  nonConformances: { issue: string; severity: string; fixReference: string }[];
  readinessScore: number;
  cadDesignId: string | null;
  missionConstraints: { maxLoadFactor: number | null; materialClass: string | null } | null;
}

export interface DFMIssue {
  issue: string;
  severity: "low" | "medium" | "high" | "critical";
  fixReference: string;
}

export interface BuildPlanStep {
  step: string;
  detail: string;
}

export interface BOMItem {
  component: string;
  quantity: number;
  notes: string;
}

export interface ManufacturingGenerationResult {
  dfmReport: DFMIssue[];
  buildPlan: BuildPlanStep[];
  billOfMaterials: BOMItem[];
  reasoningSummary: string;
  // Same meaning as every other bay's generation-level mock flag: false on
  // a successful, parsed Claude response; true only on the fallback branch.
  mock: boolean;
}

export async function generateManufacturingAnalysis(
  data: ManufacturingGenerationInput,
): Promise<ManufacturingGenerationResult> {
  const userContent = `Validation result + carried CAD reference/mission data: ${JSON.stringify(data, null, 2)}

Return: { "dfm_report": [{ "issue": "string", "severity": "low | medium | high | critical", "fix_reference": "string" }], "build_plan": [{ "step": "string", "detail": "string" }], "bill_of_materials": [{ "component": "string", "quantity": number, "notes": "string" }], "reasoning_summary": "string" }`;

  const { content } = await callLlmGateway(SYSTEM, userContent, { jsonMode: true });
  if (!content) return mockManufacturingAnalysis();

  const parsed = parseManufacturingResponse(content);
  if (!parsed) return mockManufacturingAnalysis();
  return { ...parsed, mock: false };
}

function isSeverity(v: unknown): v is "low" | "medium" | "high" | "critical" {
  return v === "low" || v === "medium" || v === "high" || v === "critical";
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function parseManufacturingResponse(
  raw: string,
): Omit<ManufacturingGenerationResult, "mock"> | null {
  try {
    const obj = JSON.parse(stripJsonFences(raw));

    const dfmRaw = obj.dfm_report;
    if (!Array.isArray(dfmRaw)) return null;
    const dfmReport: DFMIssue[] = [];
    for (const d of dfmRaw) {
      if (
        typeof d !== "object" ||
        d === null ||
        typeof d.issue !== "string" ||
        !isSeverity(d.severity) ||
        typeof d.fix_reference !== "string"
      ) {
        return null;
      }
      dfmReport.push({ issue: d.issue, severity: d.severity, fixReference: d.fix_reference });
    }

    const buildPlanRaw = obj.build_plan;
    if (!Array.isArray(buildPlanRaw)) return null;
    const buildPlan: BuildPlanStep[] = [];
    for (const b of buildPlanRaw) {
      if (
        typeof b !== "object" ||
        b === null ||
        typeof b.step !== "string" ||
        typeof b.detail !== "string"
      ) {
        return null;
      }
      buildPlan.push({ step: b.step, detail: b.detail });
    }

    const bomRaw = obj.bill_of_materials;
    if (!Array.isArray(bomRaw)) return null;
    const billOfMaterials: BOMItem[] = [];
    for (const item of bomRaw) {
      if (
        typeof item !== "object" ||
        item === null ||
        typeof item.component !== "string" ||
        !isFiniteNumber(item.quantity) ||
        typeof item.notes !== "string"
      ) {
        return null;
      }
      billOfMaterials.push({ component: item.component, quantity: item.quantity, notes: item.notes });
    }

    if (typeof obj.reasoning_summary !== "string") return null;

    return {
      dfmReport,
      buildPlan,
      billOfMaterials,
      reasoningSummary: obj.reasoning_summary,
    };
  } catch {
    return null;
  }
}

function mockManufacturingAnalysis(): ManufacturingGenerationResult {
  return {
    dfmReport: [],
    buildPlan: [],
    billOfMaterials: [],
    reasoningSummary: "Mock reasoning summary -- no ANTHROPIC_API_KEY reply.",
    mock: true,
  };
}
