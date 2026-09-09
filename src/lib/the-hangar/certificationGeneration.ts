import { callLlmGateway, stripJsonFences } from "./llmGateway.ts";

// Bay 12 (Certification Agent) Phase 1's generation step -- callLlmGateway
// + mock-fallback pattern, same as manufacturingGeneration.ts. Deliberately
// a plain async function, not a createServerFn, from the start -- same
// reasoning every other bay's generation file gives.
//
// CertificationAgent.md Section 1: this does NOT run against a real
// regulatory clause database or certification-body integration -- the LLM
// reasons over Bay 09's own compliance matrix and non-conformances,
// working one level up from Bay 09's engineering-level compliance pass to
// produce a formal certification checklist and gap-closure plan, rather
// than re-deriving compliance from scratch (see CertificationAgent.md's
// own "overlap with Bay 09" note).
//
// source_was_mock is NOT part of this file's own result type -- mirrors
// every other bay's precedent. This file still tracks its own internal
// mock flag (mock: boolean) for the same reason every other bay's
// generation file does.

const SYSTEM = `You are Certification Agent's Phase 1 reasoning step for TorqWings' aerospace design platform -- no real regulatory clause database or certification-body integration runs in this phase. Given a design's validation result (verdict, compliance matrix from Bay 09's own compliance pass, non-conformances, readiness score) and mission constraints, work one level up from Bay 09's engineering-level compliance check: produce a formal certification checklist (item, status, description), a gap report (issue, remediation, estimated effort) building on Bay 09's non-conformances, and an overall certification readiness verdict. Ground every claim in the given inputs -- do not invent specific regulatory clause numbers or certification-body requirements not present in them. If mission constraints are null, reason qualitatively and say so. This is not a real regulatory audit -- the checklist and readiness verdict should read as an engineering judgment call, not a claim of formal certification-body review. Return JSON only.`;

export interface CertificationGenerationInput {
  validationVerdict: "PASS" | "FAIL" | "CONDITIONAL";
  complianceMatrix: { standard: string; status: string; notes: string }[];
  nonConformances: { issue: string; severity: string; fixReference: string }[];
  readinessScore: number;
  missionConstraints: { maxLoadFactor: number | null; materialClass: string | null } | null;
}

export interface ChecklistItem {
  item: string;
  status: "complete" | "open" | "not_applicable";
  description: string;
}

export interface GapItem {
  issue: string;
  remediation: string;
  estimatedEffort: string;
}

export interface CertificationGenerationResult {
  checklist: ChecklistItem[];
  gapReport: GapItem[];
  certificationReadiness: "READY" | "GAPS_OPEN" | "BLOCKED";
  reasoningSummary: string;
  // Same meaning as every other bay's generation-level mock flag: false on
  // a successful, parsed Claude response; true only on the fallback branch.
  mock: boolean;
}

export async function generateCertificationAnalysis(
  data: CertificationGenerationInput,
): Promise<CertificationGenerationResult> {
  const userContent = `Validation result + mission constraints: ${JSON.stringify(data, null, 2)}

Return: { "checklist": [{ "item": "string", "status": "complete | open | not_applicable", "description": "string" }], "gap_report": [{ "issue": "string", "remediation": "string", "estimated_effort": "string" }], "certification_readiness": "READY | GAPS_OPEN | BLOCKED", "reasoning_summary": "string" }`;

  const { content } = await callLlmGateway(SYSTEM, userContent, { jsonMode: true });
  if (!content) return mockCertificationAnalysis();

  const parsed = parseCertificationResponse(content);
  if (!parsed) return mockCertificationAnalysis();
  return { ...parsed, mock: false };
}

function isChecklistStatus(v: unknown): v is "complete" | "open" | "not_applicable" {
  return v === "complete" || v === "open" || v === "not_applicable";
}

function isReadiness(v: unknown): v is "READY" | "GAPS_OPEN" | "BLOCKED" {
  return v === "READY" || v === "GAPS_OPEN" || v === "BLOCKED";
}

function parseCertificationResponse(
  raw: string,
): Omit<CertificationGenerationResult, "mock"> | null {
  try {
    const obj = JSON.parse(stripJsonFences(raw));

    const checklistRaw = obj.checklist;
    if (!Array.isArray(checklistRaw)) return null;
    const checklist: ChecklistItem[] = [];
    for (const c of checklistRaw) {
      if (
        typeof c !== "object" ||
        c === null ||
        typeof c.item !== "string" ||
        !isChecklistStatus(c.status) ||
        typeof c.description !== "string"
      ) {
        return null;
      }
      checklist.push({ item: c.item, status: c.status, description: c.description });
    }

    const gapReportRaw = obj.gap_report;
    if (!Array.isArray(gapReportRaw)) return null;
    const gapReport: GapItem[] = [];
    for (const g of gapReportRaw) {
      if (
        typeof g !== "object" ||
        g === null ||
        typeof g.issue !== "string" ||
        typeof g.remediation !== "string" ||
        typeof g.estimated_effort !== "string"
      ) {
        return null;
      }
      gapReport.push({ issue: g.issue, remediation: g.remediation, estimatedEffort: g.estimated_effort });
    }

    if (!isReadiness(obj.certification_readiness)) return null;
    if (typeof obj.reasoning_summary !== "string") return null;

    return {
      checklist,
      gapReport,
      certificationReadiness: obj.certification_readiness,
      reasoningSummary: obj.reasoning_summary,
    };
  } catch {
    return null;
  }
}

function mockCertificationAnalysis(): CertificationGenerationResult {
  return {
    checklist: [],
    gapReport: [],
    certificationReadiness: "GAPS_OPEN",
    reasoningSummary: "Mock reasoning summary -- no ANTHROPIC_API_KEY reply.",
    mock: true,
  };
}
