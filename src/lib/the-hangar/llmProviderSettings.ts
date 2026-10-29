import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Provider order for every Hangar LLM call (Hangar_LlmSettings, see
// 20261030010000_hangar_llm_provider_order.sql), managed from Mission Hub ->
// Configurations -> AI Providers. Server-only.
//
// Loaded lazily by llmGateway.ts and cached for a short time, so an admin's
// change reaches every serverless instance within CACHE_MS without a
// redeploy and without a database round-trip on every single LLM call.

export type ProviderId = "anthropic" | "groq";
export const ALL_PROVIDERS: ProviderId[] = ["anthropic", "groq"];
export const DEFAULT_PROVIDER_ORDER: ProviderId[] = ["anthropic", "groq"];

const TABLE = "Hangar_LlmSettings";
const CACHE_MS = 30_000;

let cache: { order: ProviderId[]; fromSettings: boolean; at: number } | null = null;

type Row = Record<string, unknown>;
const db = supabaseAdmin as unknown as {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => { limit: (n: number) => Promise<{ data: Row[] | null; error: { message: string } | null }> };
    };
    upsert: (row: Row) => { select: (columns: string) => { limit: (n: number) => Promise<{ data: Row[] | null; error: { message: string } | null }> } };
  };
};

export function normalizeProviderOrder(raw: unknown): ProviderId[] | null {
  if (!Array.isArray(raw)) return null;
  const out: ProviderId[] = [];
  for (const p of raw) {
    if ((p === "anthropic" || p === "groq") && !out.includes(p)) out.push(p);
  }
  return out.length > 0 ? out : null;
}

export async function getProviderOrder(): Promise<{ order: ProviderId[]; fromSettings: boolean }> {
  if (cache && Date.now() - cache.at < CACHE_MS) return { order: cache.order, fromSettings: cache.fromSettings };
  try {
    const { data, error } = await db.from(TABLE).select("provider_order").eq("id", "default").limit(1);
    const order = !error ? normalizeProviderOrder(data?.[0]?.provider_order) : null;
    if (order) {
      cache = { order, fromSettings: true, at: Date.now() };
      return { order, fromSettings: true };
    }
  } catch {
    // fall through to the default
  }
  cache = { order: DEFAULT_PROVIDER_ORDER, fromSettings: false, at: Date.now() };
  return { order: DEFAULT_PROVIDER_ORDER, fromSettings: false };
}

export async function setProviderOrder(order: ProviderId[], userId: string): Promise<ProviderId[]> {
  const clean = normalizeProviderOrder(order);
  if (!clean) throw new Error("Pick at least one provider.");
  const { data, error } = await db
    .from(TABLE)
    .upsert({ id: "default", provider_order: clean, updated_by: userId })
    .select("provider_order")
    .limit(1);
  if (error) throw new Error(`setProviderOrder: ${error.message}`);
  const saved = normalizeProviderOrder(data?.[0]?.provider_order) ?? clean;
  cache = { order: saved, fromSettings: true, at: Date.now() };
  return saved;
}
