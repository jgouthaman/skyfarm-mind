import { getValidation, getSpecsForValidations } from "./validationPersistence.ts";
import { evaluateCertificationGate } from "./certificationRules.ts";
import { generateCertificationAnalysis } from "./certificationGeneration.ts";
import type { ChecklistItem, GapItem } from "./certificationGeneration.ts";
import {
  createCertification,
  getCertification,
  updateCertificationStatus,
  persistCertificationSpec,
  listUserCertifications,
  getSpecsForCertifications,
  logCertificationStageRun,
  type CertificationRunStage,
  type CertificationStatus,
  type HangarCertificationRow,
} from "./certificationPersistence.ts";

// Certification Agent (Bay 12) orchestrator -- mirrors
// manufacturingAgentPipeline.ts's structure/style, simplified where
// CertificationAgent.md's own scope allows. Bay 12 fans in from ONE
// upstream bay (Bay 09 only), same single-source shape Bay 10/11
// themselves use -- Bay 12 is a SIBLING of Bay 10/11/13, not downstream of
// any of them. Unlike Bay 10/11, Bay 12 needs NO deeper upstream hop
// (structural/CAD) -- it works entirely off Bay 09's own compliance
// matrix and non-conformances, so this pipeline is simpler: one reader
// (getValidation/getSpecsForValidations), not a multi-hop chain.
//
// No "assertCertificationOwnership" export exists yet either -- same rule
// every prior bay's pipeline file follows.
//
// Implements the one real stage (Sections 12.1-12.3 combined --
// Regulatory Mapping, Gap Analysis, Output Generation) as one complete
// vertical slice, same reasoning every prior bay's single-call stage
// already gives.

export class CertificationAgentError extends Error {
  constructor(
    message: string,
    public readonly certificationId: string,
    public readonly stage: CertificationRunStage,
  ) {
    super(message);
    this.name = "CertificationAgentError";
  }
}

export class InvalidCertificationInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCertificationInputError";
  }
}

// Local and unexported -- no downstream bay exists yet to need this
// exported, matching every prior bay's own rule.
async function assertCertificationOwnership(
  certificationId: string,
  userId: string,
): Promise<HangarCertificationRow> {
  const certification = await getCertification(certificationId);
  if (!certification) {
    throw new Error(`No Hangar_Certifications row found for certificationId "${certificationId}"`);
  }
  if (certification.user_id !== userId) {
    throw new Error(`Certification "${certification.id}" does not belong to user "${userId}"`);
  }
  return certification;
}

async function recordStageFailure(
  certificationId: string,
  stage: CertificationRunStage,
  error: unknown,
): Promise<CertificationAgentError> {
  const message = error instanceof Error ? error.message : String(error);
  await logCertificationStageRun(certificationId, stage, null, null, "error", 0, message);
  await updateCertificationStatus(certificationId, "error").catch(() => {});
  return new CertificationAgentError(message, certificationId, stage);
}

// -- Stage -- Regulatory Mapping & Gap Analysis -----------------------------

export interface CertificationRequest {
  userId: string;
  validationId: string;
}

export interface CertificationResult {
  certificationId: string;
  certificationCode: string;
  checklist: ChecklistItem[];
  gapReport: GapItem[];
  certificationReadiness: "READY" | "GAPS_OPEN" | "BLOCKED";
  confidenceScore: number;
  reasoningSummary: string;
  sourceWasMock: boolean;
  specVersion: number;
}

// No self-reported LLM confidence is trusted here either -- matches every
// prior bay's established convention. Base is the upstream validation
// result's own confidence score, then penalized against open gap-report
// items and an empty checklist.
function computeCertificationConfidence(
  validationConfidence: number,
  checklistCount: number,
  gapReportCount: number,
  sourceWasMock: boolean,
): number {
  let score = validationConfidence;
  if (checklistCount === 0) score -= 0.2;
  score -= 0.05 * gapReportCount;
  if (sourceWasMock) score -= 0.3;
  return Math.max(0, Math.min(1, score));
}

export async function runRegulatoryMappingStage(
  request: CertificationRequest,
): Promise<CertificationResult> {
  const { userId, validationId } = request;
  if (!validationId) {
    throw new InvalidCertificationInputError(
      "A spec-ready validation result must be selected before running certification review.",
    );
  }

  const validation = await getValidation(validationId);
  if (!validation || validation.user_id !== userId) {
    throw new InvalidCertificationInputError("No accessible validation result found for this id.");
  }
  if (validation.status !== "spec_ready") {
    throw new InvalidCertificationInputError("Source validation result is not spec-ready.");
  }

  const [validationSpec] = await getSpecsForValidations([validationId]);
  if (!validationSpec) {
    throw new InvalidCertificationInputError(
      "No spec has been generated for this validation result yet.",
    );
  }

  // Known, disclosed gap: mission constraints have no real source anywhere
  // in the Concept/Aircraft Design/CAD chain, same reasoning every prior
  // bay's pipeline already documents. Always null.
  const missionConstraints = { maxLoadFactor: null, materialClass: null };

  const certification = await createCertification(userId, validationId);
  const certificationId = certification.id;
  await updateCertificationStatus(certificationId, "processing");

  const start = Date.now();
  try {
    // GATE -- deterministic, eliminates an already-invalid, unfinished, or
    // hard-failed upstream result before any certification reasoning is
    // attempted.
    const gate = evaluateCertificationGate({
      validationVerdict: validationSpec.verdict,
      validationStatus: validation.status,
      validationReadinessScore: validationSpec.readiness_score,
    });
    if (gate.eliminated) {
      throw new InvalidCertificationInputError(
        `Inputs were eliminated by the hard-constraint gate: ${gate.reasons.join("; ")}`,
      );
    }

    // GENERATE -- the one LLM call in this stage.
    const generation = await generateCertificationAnalysis({
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
    const confidenceScore = computeCertificationConfidence(
      validationSpec.confidence_score ?? 0,
      generation.checklist.length,
      generation.gapReport.length,
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

    const specRow = await persistCertificationSpec(certificationId, {
      checklist: generation.checklist as unknown as Record<string, unknown>[],
      gapReport: generation.gapReport as unknown as Record<string, unknown>[],
      certificationReadiness: generation.certificationReadiness,
      confidenceScore,
      reasoningSummary,
      sourceWasMock: finalSourceWasMock,
    });
    await updateCertificationStatus(certificationId, "spec_ready", confidenceScore);

    await logCertificationStageRun(
      certificationId,
      "output_generation",
      { validationId, missionConstraints },
      { gate, generation, confidenceScore, persistedSpecId: specRow.id, version: specRow.version },
      "success",
      Date.now() - start,
    );

    return {
      certificationId,
      certificationCode: certification.certification_code,
      checklist: generation.checklist,
      gapReport: generation.gapReport,
      certificationReadiness: generation.certificationReadiness,
      confidenceScore,
      reasoningSummary,
      sourceWasMock: finalSourceWasMock,
      specVersion: specRow.version,
    };
  } catch (err) {
    throw await recordStageFailure(certificationId, "output_generation", err);
  }
}

// -- "Your certifications" list ---------------------------------------------

export interface CertificationListEntry {
  certificationId: string;
  certificationCode: string;
  sourceValidationId: string;
  status: CertificationStatus;
  createdAt: string;
  checklist: ChecklistItem[] | null;
  gapReport: GapItem[] | null;
  certificationReadiness: "READY" | "GAPS_OPEN" | "BLOCKED" | null;
  confidenceScore: number | null;
  reasoningSummary: string | null;
  sourceWasMock: boolean | null;
}

export async function listCertificationsForUser(
  userId: string,
): Promise<CertificationListEntry[]> {
  const certifications = await listUserCertifications(userId);
  const ids = certifications.map((c) => c.id);
  const specs = await getSpecsForCertifications(ids);
  const specsByCertification = new Map(specs.map((s) => [s.certification_id, s]));
  return certifications.map((c): CertificationListEntry => {
    const spec = specsByCertification.get(c.id);
    return {
      certificationId: c.id,
      certificationCode: c.certification_code,
      sourceValidationId: c.source_validation_id,
      status: c.status,
      createdAt: c.created_at,
      checklist: spec ? (spec.checklist as unknown as ChecklistItem[]) : null,
      gapReport: spec ? (spec.gap_report as unknown as GapItem[]) : null,
      certificationReadiness: spec?.certification_readiness ?? null,
      confidenceScore: spec?.confidence_score ?? null,
      reasoningSummary: spec?.reasoning_summary ?? null,
      sourceWasMock: spec?.source_was_mock ?? null,
    };
  });
}
