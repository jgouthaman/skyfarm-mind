import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { MissionSourceInput, MissionSpec } from "./types/hangar-mission";

// Stage 2.1, Step 0 (MissionAgent.md Section 4.1.1) — deterministic DB
// fetches for sources 4/5/6 (Existing Projects, Regulations & Standards,
// Market/Domain Data). Explicitly not RAG: the user selected these directly
// via checkboxes/imports, there's nothing to "understand" — they just need
// fetching. No LLM involved.
//
// The Hangar_* tables below (Section 10) don't exist in Supabase yet — per
// Section 10.2, they land only after the dev/prod split, which the doc
// calls out as non-negotiable and explicitly "before, not after." This file
// is written against the spec'd schema so the logic is ready the moment
// those tables exist; until then, calls here will fail at runtime with a
// Postgres "relation does not exist" error, which is expected.
//
// Because the tables aren't in the generated `Database` type yet, the
// admin client is cast to an untyped shape locally. Drop this cast once
// src/integrations/supabase/types.ts is regenerated after the Hangar_*
// migration actually runs.
const db = supabaseAdmin as unknown as {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        order: (
          column: string,
          opts: { ascending: boolean },
        ) => {
          limit: (n: number) => {
            maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
          };
        };
      };
      in: (
        column: string,
        values: string[],
      ) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
    };
  };
};

interface HangarMissionSpecRow {
  mission_id: string;
  version: number;
  mission_specs: Record<string, unknown>;
  constraints: { name: string; value: string; sources: string[] }[];
  kpis: { name: string; target: string; unit: string; priority: "critical" | number }[];
  summary: string;
  confidence_score: number;
}

interface HangarRegulationCatalogRow {
  code: string;
  name: string;
  region: string;
  description: string | null;
  active: boolean;
}

interface HangarMarketDataCatalogRow {
  id: string;
  name: string;
  description: string | null;
  data_source: string | null;
  active: boolean;
}

export interface DirectReferenceResolution {
  importedMissionRef: string | null;
  importedMissionSpec: MissionSpec | null;
  attachedRegulations: string[];
  regulationDetails: HangarRegulationCatalogRow[];
  marketDataRefs: string[];
  marketDataDetails: HangarMarketDataCatalogRow[];
}

function toMissionSpec(row: HangarMissionSpecRow): MissionSpec {
  return {
    missionId: row.mission_id,
    missionSpecs: row.mission_specs,
    constraints: row.constraints,
    kpis: row.kpis,
    summary: row.summary,
    confidenceScore: row.confidence_score,
  };
}

// Section 4.1.1, Step 0. Reads only the sources relevant to types 4/5/6 —
// sources 1/2/3 are ignored here, they belong to Step 2 (intentExtraction.ts).
export async function resolveDirectReferences(
  sources: MissionSourceInput[],
): Promise<DirectReferenceResolution> {
  const existingProjectSource = sources.find((s) => s.sourceType === "existing_project");
  const regulationsSource = sources.find((s) => s.sourceType === "regulations");
  const marketDataSource = sources.find((s) => s.sourceType === "market_data");

  const importedMissionRef =
    typeof existingProjectSource?.rawInput.importedMissionId === "string"
      ? (existingProjectSource.rawInput.importedMissionId as string)
      : null;

  const attachedRegulations = Array.isArray(regulationsSource?.rawInput.regulationCodes)
    ? regulationsSource.rawInput.regulationCodes.filter((c): c is string => typeof c === "string")
    : [];

  const marketDataRefs = Array.isArray(marketDataSource?.rawInput.marketDataIds)
    ? marketDataSource.rawInput.marketDataIds.filter((c): c is string => typeof c === "string")
    : [];

  const [importedMissionSpec, regulationDetails, marketDataDetails] = await Promise.all([
    fetchImportedMissionSpec(importedMissionRef),
    fetchRegulationDetails(attachedRegulations),
    fetchMarketDataDetails(marketDataRefs),
  ]);

  return {
    importedMissionRef,
    importedMissionSpec,
    attachedRegulations,
    regulationDetails,
    marketDataRefs,
    marketDataDetails,
  };
}

// Source 4 — fetch the imported mission's stored Hangar_mission_specs row,
// most recent version, by imported_mission_id (Section 4.1.1, Section 10).
async function fetchImportedMissionSpec(
  importedMissionId: string | null,
): Promise<MissionSpec | null> {
  if (!importedMissionId) return null;

  const { data, error } = await db
    .from("Hangar_mission_specs")
    .select("*")
    .eq("mission_id", importedMissionId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error)
    throw new Error(
      `resolveDirectReferences: failed to fetch imported mission spec: ${error.message}`,
    );
  return data ? toMissionSpec(data as HangarMissionSpecRow) : null;
}

// Source 5 — selected regulation codes, passed through as known constraint
// tags, plus the full catalog rows as LLM grounding context (Section 4.1.1).
async function fetchRegulationDetails(codes: string[]): Promise<HangarRegulationCatalogRow[]> {
  if (codes.length === 0) return [];

  const { data, error } = await db.from("Hangar_regulations_catalog").select("*").in("code", codes);
  if (error)
    throw new Error(
      `resolveDirectReferences: failed to fetch regulations catalog: ${error.message}`,
    );
  return (data ?? []) as HangarRegulationCatalogRow[];
}

// Source 6 — relevant rows from the market data catalog by selected reference.
async function fetchMarketDataDetails(ids: string[]): Promise<HangarMarketDataCatalogRow[]> {
  if (ids.length === 0) return [];

  const { data, error } = await db.from("Hangar_market_data_catalog").select("*").in("id", ids);
  if (error)
    throw new Error(
      `resolveDirectReferences: failed to fetch market data catalog: ${error.message}`,
    );
  return (data ?? []) as HangarMarketDataCatalogRow[];
}
