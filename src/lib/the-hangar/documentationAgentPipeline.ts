import { getValidation, getSpecsForValidations } from "./validationPersistence.ts";
import { evaluateDocumentationGate } from "./documentationRules.ts";
import { generateDocumentationAnalysis } from "./documentationGeneration.ts";
import type { SLREntry } from "./documentationGeneration.ts";
import {
  createDocumentation,
  getDocumentation,
  updateDocumentationStatus,
  persistDocumentationSpec,
  listUserDocumentations,
  getSpecsForDocumentations,
  logDocumentationStageRun,
  type DocumentationRunStage,
  type DocumentationStatus,
  type HangarDocumentationRow,
} from "./documentationPersistence.ts";

// Documentation Agent (Bay 13) orchestrator -- mirrors
// certificationAgentPipeline.ts's structure/style. Bay 13 fans in from ONE
// upstream bay (Bay 09 only), same single-source shape Bay 10/11/12
// themselves use -- Bay 13 is a SIBLING of Bay 10/11/12, not downstream of
// any of them. Same simple single-reader shape as Bay 12's pipeline (no
// deeper upstream hop needed) -- works entirely off Bay 09's own result.
//
// No "assertDocumentationOwnership" export exists yet either -- same rule
// every prior bay's pipeline file follows.
//
// Implements the one real stage (Sections 13.1-13.3 combined -- Content
// Compilation, Report Structuring, Output Generation) as one complete
// vertical slice, same reasoning every prior bay's single-call stage
// already gives.

export class DocumentationAgentError extends Error {
  constructor(
    message: string,
    public readonly documentationId: string,
    public readonly stage: DocumentationRunStage,
  ) {
    super(message);
    this.name = "DocumentationAgentError";
  }
}

export class InvalidDocumentationInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidDocumentationInputError";
  }
}

// Local and unexported -- no downstream bay exists yet to need this
// exported, matching every prior bay's own rule.
async function assertDocumentationOwnership(
  documentationId: string,
  userId: string,
): Promise<HangarDocumentationRow> {
  const documentation = await getDocumentation(documentationId);
  if (!documentation) {
    throw new Error(`No Hangar_Documentations row found for documentationId "${documentationId}"`);
  }
  if (documentation.user_id !== userId) {
    throw new Error(`Documentation "${documentation.id}" does not belong to user "${userId}"`);
  }
  return documentation;
}

async function recordStageFailure(
  documentationId: string,
  stage: DocumentationRunStage,
  error: unknown,
): Promise<DocumentationAgentError> {
  const message = error instanceof Error ? error.message : String(error);
  await logDocumentationStageRun(documentationId, stage, null, null, "error", 0, message);
  await updateDocumentationStatus(documentationId, "error").catch(() => {});
  return new DocumentationAgentError(message, documentationId, stage);
}

// -- Stage -- Content Compilation -------------------------------------------

export interface DocumentationRequest {
  userId: string;
  validationId: string;
}

export interface DocumentationResult {
  documentationId: string;
  documentationCode: string;
  report: string;
  slr: SLREntry[];
  completenessFlags: string[];
  confidenceScore: number;
  reasoningSummary: string;
  sourceWasMock: boolean;
  specVersion: number;
}

// No self-reported LLM confidence is trusted here either -- matches every
// prior bay's established convention. Base is the upstream validation
// result's own confidence score, then penalized against completeness
// flags (each one is a disclosed documentation gap) and an empty report.
function computeDocumentationConfidence(
  validationConfidence: number,
  reportLength: number,
  completenessFlagCount: number,
  sourceWasMock: boolean,
): number {
  let score = validationConfidence;
  if (reportLength === 0) score -= 0.2;
  score -= 0.05 * completenessFlagCount;
  if (sourceWasMock) score -= 0.3;
  return Math.max(0, Math.min(1, score));
}

export async function runContentCompilationStage(
  request: DocumentationRequest,
): Promise<DocumentationResult> {
  const { userId, validationId } = request;
  if (!validationId) {
    throw new InvalidDocumentationInputError(
      "A spec-ready validation result must be selected before running documentation compilation.",
    );
  }

  const validation = await getValidation(validationId);
  if (!validation || validation.user_id !== userId) {
    throw new InvalidDocumentationInputError("No accessible validation result found for this id.");
  }
  if (validation.status !== "spec_ready") {
    throw new InvalidDocumentationInputError("Source validation result is not spec-ready.");
  }

  const [validationSpec] = await getSpecsForValidations([validationId]);
  if (!validationSpec) {
    throw new InvalidDocumentationInputError(
      "No spec has been generated for this validation result yet.",
    );
  }

  // Known, disclosed gap: mission constraints have no real source anywhere
  // in the Concept/Aircraft Design/CAD chain, same reasoning every prior
  // bay's pipeline already documents. Always null.
  const missionConstraints = { maxLoadFactor: null, materialClass: null };

  const documentation = await createDocumentation(userId, validationId);
  const documentationId = documentation.id;
  await updateDocumentationStatus(documentationId, "processing");

  const start = Date.now();
  try {
    // GATE -- deterministic, eliminates an already-invalid, unfinished
    // upstream result before any documentation reasoning is attempted.
    // Deliberately does NOT gate on verdict -- see documentationRules.ts's
    // own header comment.
    const gate = evaluateDocumentationGate({
      validationStatus: validation.status,
      validationReadinessScore: validationSpec.readiness_score,
    });
    if (gate.eliminated) {
      throw new InvalidDocumentationInputError(
        `Inputs were eliminated by the hard-constraint gate: ${gate.reasons.join("; ")}`,
      );
    }

    // GENERATE -- the one LLM call in this stage.
    const generation = await generateDocumentationAnalysis({
      validationVerdict: validationSpec.verdict,
      complianceMatrix: validationSpec.compliance_matrix as unknown as {
        standard: string;
        status: string;
        notes: string;
      }[],
      nonConformances: validationSpec.non_conformances as unknown as {
        issue: string;
        severity: string;
        fixReference: string;
      }[],
      readinessScore: validationSpec.readiness_score ?? 0,
      missionConstraints,
    });

    // SCORE -- deterministic, pipeline-owned.
    const finalSourceWasMock = validationSpec.source_was_mock || generation.mock;
    const confidenceScore = computeDocumentationConfidence(
      validationSpec.confidence_score ?? 0,
      generation.report.length,
      generation.completenessFlags.length,
      finalSourceWasMock,
    );

    const disclaimerParts: string[] = [];
    if (validationSpec.source_was_mock) {
      disclaimerParts.push(
        "⚠ Source validation result was generated from a mock fallback (no real LLM output).",
      );
    }
    const reasoningSummary =
      disclaimerParts.length > 0
        ? `${disclaimerParts.join(" ")} ${generation.reasoningSummary}`
        : generation.reasoningSummary;

    const specRow = await persistDocumentationSpec(documentationId, {
      report: generation.report,
      slr: generation.slr as unknown as Record<string, unknown>[],
      completenessFlags: generation.completenessFlags,
      confidenceScore,
      reasoningSummary,
      sourceWasMock: finalSourceWasMock,
    });
    await updateDocumentationStatus(documentationId, "spec_ready", confidenceScore);

    await logDocumentationStageRun(
      documentationId,
      "output_generation",
      { validationId, missionConstraints },
      { gate, generation, confidenceScore, persistedSpecId: specRow.id, version: specRow.version },
      "success",
      Date.now() - start,
    );

    return {
      documentationId,
      documentationCode: documentation.documentation_code,
      report: generation.report,
      slr: generation.slr,
      completenessFlags: generation.completenessFlags,
      confidenceScore,
      reasoningSummary,
      sourceWasMock: finalSourceWasMock,
      specVersion: specRow.version,
    };
  } catch (err) {
    throw await recordStageFailure(documentationId, "output_generation", err);
  }
}

// -- "Your documentations" list ----------------------------------------------

export interface DocumentationListEntry {
  documentationId: string;
  documentationCode: string;
  sourceValidationId: string;
  status: DocumentationStatus;
  createdAt: string;
  report: string | null;
  slr: SLREntry[] | null;
  completenessFlags: string[] | null;
  confidenceScore: number | null;
  reasoningSummary: string | null;
  sourceWasMock: boolean | null;
}

export async function listDocumentationsForUser(
  userId: string,
): Promise<DocumentationListEntry[]> {
  const documentations = await listUserDocumentations(userId);
  const ids = documentations.map((d) => d.id);
  const specs = await getSpecsForDocumentations(ids);
  const specsByDocumentation = new Map(specs.map((s) => [s.documentation_id, s]));
  return documentations.map((d): DocumentationListEntry => {
    const spec = specsByDocumentation.get(d.id);
    return {
      documentationId: d.id,
      documentationCode: d.documentation_code,
      sourceValidationId: d.source_validation_id,
      status: d.status,
      createdAt: d.created_at,
      report: spec?.report ?? null,
      slr: spec ? (spec.slr as unknown as SLREntry[]) : null,
      completenessFlags: spec?.completeness_flags ?? null,
      confidenceScore: spec?.confidence_score ?? null,
      reasoningSummary: spec?.reasoning_summary ?? null,
      sourceWasMock: spec?.source_was_mock ?? null,
    };
  });
}
