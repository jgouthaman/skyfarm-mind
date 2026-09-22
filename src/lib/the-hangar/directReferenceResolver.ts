import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { MissionSourceInput, MissionSpec } from "./types/hangar-mission";
import { getMission } from "./missionPersistence.ts";
import { readString, readStringList } from "./missionSourceParsing.ts";
import { fetchMarketDataText } from "./marketDataFetch.ts";

// Stage 2.1, Step 0 (MissionAgent.md Section 4.1.1) — deterministic DB
// fetches for sources 4/5/6 (Existing Projects, Regulations & Standards,
// Market/Domain Data). Explicitly not RAG: the user selected these directly
// via checkboxes/imports, there's nothing to "understand" — they just need
// fetching. No LLM involved.
//
// The Hangar_* tables below (Section 10) exist live in Supabase (project
// wwauhupegnczmyfnnqjy) with RLS enabled — Phase 1 ran directly against the
// shared project; the dev/prod split Section 10.2 describes was deliberately
// deferred pre-launch, a decision made outside this doc.
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
  /**
   * Set by whoever curates the catalog (never by a user). Optional because the
   * column is added by 20260922010000_hangar_market_data_source_url.sql.
   */
  source_url?: string | null;
  active: boolean;
}

// What reading a selected row's link produced. Only a summary of this is kept in
// the run log; the text itself goes to the model and is not stored.
export interface MarketDataContent {
  id: string;
  url: string | null;
  status: "ok" | "failed" | "no_link";
  reason?: string;
  text: string;
  truncated: boolean;
}

// Across all selected rows, so a mission can't send the model an unbounded
// amount of fetched text (each page is also capped on its own).
const MARKET_TOTAL_CHARS = 12_000;

export interface DirectReferenceResolution {
  importedMissionRef: string | null;
  importedMissionSpec: MissionSpec | null;
  attachedRegulations: string[];
  regulationDetails: HangarRegulationCatalogRow[];
  marketDataRefs: string[];
  marketDataDetails: HangarMarketDataCatalogRow[];
  marketDataContent: MarketDataContent[];
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
  userId: string,
): Promise<DirectReferenceResolution> {
  const existingProjectSource = sources.find((s) => s.sourceType === "existing_project");
  const regulationsSource = sources.find((s) => s.sourceType === "regulations");
  const marketDataSource = sources.find((s) => s.sourceType === "market_data");

  // Both camelCase (this repo's convention) and snake_case (Section 11's
  // example) spellings are read — see missionSourceParsing.ts's readRawKey.
  const importedMissionRef = existingProjectSource
    ? readString(existingProjectSource.rawInput, "importedMissionId", "imported_mission_id")
    : null;

  const attachedRegulations = regulationsSource
    ? readStringList(regulationsSource.rawInput, "regulationCodes", "regulation_codes")
    : [];

  const marketDataRefs = marketDataSource
    ? readStringList(marketDataSource.rawInput, "marketDataIds", "market_data_ids")
    : [];

  const [importedMissionSpec, regulationDetails, marketDataDetails] = await Promise.all([
    fetchImportedMissionSpec(importedMissionRef, userId),
    fetchRegulationDetails(attachedRegulations),
    fetchMarketDataDetails(marketDataRefs),
  ]);

  const marketDataContent = await readMarketDataLinks(marketDataDetails);

  return {
    importedMissionRef,
    importedMissionSpec,
    attachedRegulations,
    regulationDetails,
    marketDataRefs,
    marketDataDetails,
    marketDataContent,
  };
}

// Reads each selected row's link (in parallel), then applies the total budget in
// row order. A link that can't be read never fails the mission — the row just
// contributes its name and description, as it did before links existed.
async function readMarketDataLinks(rows: HangarMarketDataCatalogRow[]): Promise<MarketDataContent[]> {
  const fetched = await Promise.all(
    rows.map(async (row): Promise<MarketDataContent> => {
      const url = row.source_url ?? null;
      if (!url) return { id: row.id, url: null, status: "no_link", text: "", truncated: false };
      const r = await fetchMarketDataText(url);
      return { id: row.id, url, status: r.status, reason: r.reason, text: r.text, truncated: r.truncated };
    }),
  );
  let remaining = MARKET_TOTAL_CHARS;
  return fetched.map((c) => {
    if (c.status !== "ok") return c;
    if (remaining <= 0) {
      return { ...c, status: "failed", reason: "skipped: total size limit reached", text: "", truncated: false };
    }
    const text = c.text.slice(0, remaining);
    remaining -= text.length;
    return { ...c, text, truncated: c.truncated || text.length < c.text.length };
  });
}

// Source 4 — fetch the imported mission's stored Hangar_mission_specs row,
// most recent version, by imported_mission_id (Section 4.1.1, Section 10).
//
// supabaseAdmin bypasses RLS, and importedMissionId is client-supplied — so
// without this check any signed-in user could pull another user's spec into
// their own LLM grounding context by guessing/knowing a mission id. "Existing
// Projects" means the caller's own past missions (Section 16), so anything
// else is rejected. Missing and not-owned share one message so this can't be
// used to probe which mission ids exist.
async function fetchImportedMissionSpec(
  importedMissionId: string | null,
  userId: string,
): Promise<MissionSpec | null> {
  if (!importedMissionId) return null;

  const mission = await getMission(importedMissionId);
  if (!mission || mission.user_id !== userId) {
    throw new Error("Imported mission not found");
  }

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
