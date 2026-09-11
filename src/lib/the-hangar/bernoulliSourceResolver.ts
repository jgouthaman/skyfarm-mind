import { getConcept } from "./conceptPersistence.ts";
import { getAircraftDesign } from "./aircraftDesignPersistence.ts";
import { getCADDesign } from "./cadDesignPersistence.ts";
import { getSimulation } from "./simDesignPersistence.ts";
import { getCFDAnalysis } from "./cfdAnalysisPersistence.ts";
import { getStructural } from "./structuralPersistence.ts";
import { getOptimization } from "./optimizationPersistence.ts";
import { getValidation } from "./validationPersistence.ts";
import { getCertification } from "./certificationPersistence.ts";

// Walks any caller bay's own entity id back up the chain to the Mission
// (B01) it ultimately descends from -- Bernoulli's checks are all
// mission-spec-based (bernoulliChecks.ts), so every caller bay beyond
// Mission/Concept needs its id resolved to a missionId before a review can
// run against it. Each hop is one already-existing getX() reader from that
// bay's own persistence file -- no new schema, just walking the same
// source_*_id foreign keys every bay's own pipeline already follows:
//
//   certification -> validation -> optimization -> cfd|structural -> cad
//   -> aircraft-design -> concept -> mission
//
// Read-only lookup, no ownership check at each hop -- this only powers
// picking which mission shows on the Bernoulli page; the actual review
// (runBernoulliReviewStage) still verifies the resolved mission belongs to
// the requesting user before doing anything with it.
export async function resolveMissionIdForSource(
  sourceBay: string,
  sourceId: string,
): Promise<string | null> {
  switch (sourceBay) {
    case "mission":
      return sourceId;
    case "concept": {
      const row = await getConcept(sourceId);
      return row?.source_mission_id ?? null;
    }
    case "aircraft-design": {
      const row = await getAircraftDesign(sourceId);
      if (!row) return null;
      return resolveMissionIdForSource("concept", row.source_concept_id);
    }
    case "cad": {
      const row = await getCADDesign(sourceId);
      if (!row) return null;
      return resolveMissionIdForSource("aircraft-design", row.source_aircraft_design_id);
    }
    case "simulation": {
      const row = await getSimulation(sourceId);
      if (!row) return null;
      return resolveMissionIdForSource("cad", row.source_cad_design_id);
    }
    case "cfd": {
      const row = await getCFDAnalysis(sourceId);
      if (!row) return null;
      return resolveMissionIdForSource("cad", row.source_cad_design_id);
    }
    case "structural": {
      const row = await getStructural(sourceId);
      if (!row) return null;
      return resolveMissionIdForSource("cad", row.source_cad_design_id);
    }
    case "optimization": {
      const row = await getOptimization(sourceId);
      if (!row) return null;
      // Bay 08 fans in from BOTH Bay 06 and Bay 07 -- either edge reaches
      // the same CAD design (both source_cfd_analysis_id and
      // source_structural_id trace back to the same source_cad_design_id
      // per OPT-003's own cross-check), so walking the CFD edge is enough.
      return resolveMissionIdForSource("cfd", row.source_cfd_analysis_id);
    }
    case "validation": {
      const row = await getValidation(sourceId);
      if (!row) return null;
      return resolveMissionIdForSource("optimization", row.source_optimization_id);
    }
    case "certification": {
      const row = await getCertification(sourceId);
      if (!row) return null;
      return resolveMissionIdForSource("validation", row.source_validation_id);
    }
    default:
      return null;
  }
}
