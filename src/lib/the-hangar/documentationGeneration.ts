import { callLlmGateway, stripJsonFences } from "./llmGateway.ts";

// Bay 13 (Documentation Agent) Phase 1's generation step -- callLlmGateway
// + mock-fallback pattern, same as certificationGeneration.ts. Deliberately
// a plain async function, not a createServerFn, from the start -- same
// reasoning every other bay's generation file gives.
//
// DocumentationAgent.md Section 1: this does NOT read directly from every
// upstream bay -- it summarizes and compiles from Bay 09's own result only
// (verdict, compliance matrix, non-conformances, readiness score), per the
// spec's own disclosed Phase 1 scope decision. No real template engine or
// drawing-generation tool runs either.
//
// source_was_mock is NOT part of this file's own result type -- mirrors
// every other bay's precedent. This file still tracks its own internal
// mock flag (mock: boolean) for the same reason every other bay's
// generation file does.

const SYSTEM = `You are Documentation Agent's Phase 1 reasoning step for TorqWings' aerospace design platform -- no real template engine or drawing-generation tool runs in this phase, and no direct read of every upstream bay's own data -- only Bay 09's own validation result is summarized here. Given a design's validation result (verdict, compliance matrix, non-conformances, readiness score) and mission constraints, compile a narrative summary report, a structured logic record (SLR -- an ordered list of the key decisions/findings that led to this verdict), and completeness flags noting any gaps in the documentation itself (e.g. "no CAD drawings included -- Phase 1 does not read CAD data directly"). If the verdict is FAIL, document that honestly and neutrally -- do not soften or omit a failed outcome. Ground every claim in the given inputs -- do not invent specifics not present in them. This is not a claim of a real template-engine-generated report -- it should read as an engineering summary, not a formatted deliverable document. Return JSON only.`;

export interface DocumentationGenerationInput {
  validationVerdict: "PASS" | "FAIL" | "CONDITIONAL";
  complianceMatrix: { standard: string; status: string; notes: string }[];
  nonConformances: { issue: string; severity: string; fixReference: string }[];
  readinessScore: number;
  missionConstraints: { maxLoadFactor: number | null; materialClass: string | null } | null;
}

export interface SLREntry {
  decision: string;
  rationale: string;
}

export interface DocumentationGenerationResult {
  report: string;
  slr: SLREntry[];
  completenessFlags: string[];
  reasoningSummary: string;
  // Same meaning as every other bay's generation-level mock flag: false on
  // a successful, parsed Claude response; true only on the fallback branch.
  mock: boolean;
}

export async function generateDocumentationAnalysis(
  data: DocumentationGenerationInput,
): Promise<DocumentationGenerationResult> {
  const userContent = `Validation result + mission constraints: ${JSON.stringify(data, null, 2)}

Return: { "report": "string", "slr": [{ "decision": "string", "rationale": "string" }], "completeness_flags": ["string"], "reasoning_summary": "string" }`;

  const { content } = await callLlmGateway(SYSTEM, userContent, { jsonMode: true });
  if (!content) return mockDocumentationAnalysis();

  const parsed = parseDocumentationResponse(content);
  if (!parsed) return mockDocumentationAnalysis();
  return { ...parsed, mock: false };
}

function parseDocumentationResponse(
  raw: string,
): Omit<DocumentationGenerationResult, "mock"> | null {
  try {
    const obj = JSON.parse(stripJsonFences(raw));

    if (typeof obj.report !== "string") return null;

    const slrRaw = obj.slr;
    if (!Array.isArray(slrRaw)) return null;
    const slr: SLREntry[] = [];
    for (const s of slrRaw) {
      if (
        typeof s !== "object" ||
        s === null ||
        typeof s.decision !== "string" ||
        typeof s.rationale !== "string"
      ) {
        return null;
      }
      slr.push({ decision: s.decision, rationale: s.rationale });
    }

    const completenessFlags = Array.isArray(obj.completeness_flags)
      ? obj.completeness_flags.filter((f: unknown): f is string => typeof f === "string")
      : [];

    if (typeof obj.reasoning_summary !== "string") return null;

    return {
      report: obj.report,
      slr,
      completenessFlags,
      reasoningSummary: obj.reasoning_summary,
    };
  } catch {
    return null;
  }
}

function mockDocumentationAnalysis(): DocumentationGenerationResult {
  return {
    report: "",
    slr: [],
    completenessFlags: [],
    reasoningSummary: "Mock reasoning summary -- no ANTHROPIC_API_KEY reply.",
    mock: true,
  };
}
