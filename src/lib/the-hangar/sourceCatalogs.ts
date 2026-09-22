import { supabaseAdmin } from "@/integrations/supabase/client.server";

// The two reference catalogs the intake form's Regulations and Market-data
// checkboxes are populated from (MissionAgent.md Section 10.0: "the intake UI
// ... should read from these instead of hardcoded HTML"). Read on the server
// with the admin client, like every other Hangar_* table, so the browser never
// touches them directly. Only active rows are offered.
//
// Same "cast supabaseAdmin to just the shape this file needs" pattern as
// missionPersistence.ts / directReferenceResolver.ts (Hangar_* tables aren't
// in the generated Database type).
type CatalogRows = Promise<{
  data: Record<string, unknown>[] | null;
  error: { message: string } | null;
}>;

const db = supabaseAdmin as unknown as {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: boolean,
      ) => { order: (column: string, opts: { ascending: boolean }) => CatalogRows };
    };
  };
};

export interface RegulationOption {
  code: string;
  name: string;
  region: string;
  description: string | null;
}

export interface MarketDataOption {
  id: string;
  name: string;
  description: string | null;
  dataSource: string | null;
}

export interface SourceCatalogs {
  regulations: RegulationOption[];
  marketData: MarketDataOption[];
}

export async function listSourceCatalogs(): Promise<SourceCatalogs> {
  const [regs, market] = await Promise.all([
    db
      .from("Hangar_regulations_catalog")
      .select("code,name,region,description")
      .eq("active", true)
      .order("name", { ascending: true }),
    db
      .from("Hangar_market_data_catalog")
      .select("id,name,description,data_source")
      .eq("active", true)
      .order("name", { ascending: true }),
  ]);
  if (regs.error) throw new Error(`listSourceCatalogs (regulations): ${regs.error.message}`);
  if (market.error) throw new Error(`listSourceCatalogs (market data): ${market.error.message}`);

  return {
    regulations: (regs.data ?? []).map((r) => ({
      code: String(r.code),
      name: String(r.name),
      region: String(r.region),
      description: (r.description as string | null) ?? null,
    })),
    marketData: (market.data ?? []).map((m) => ({
      id: String(m.id),
      name: String(m.name),
      description: (m.description as string | null) ?? null,
      dataSource: (m.data_source as string | null) ?? null,
    })),
  };
}
