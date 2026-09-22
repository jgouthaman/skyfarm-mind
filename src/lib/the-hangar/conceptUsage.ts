// Per-concept LLM usage and cost, rebuilt from what the pipeline already
// writes to Hangar_concept_runs — direct port of missionUsage.ts, scoped to
// Concept Agent's own two LLM stages (Stage 1 ideation, Stage 2 trade-off
// reasoning; Stage 3 ranking is deterministic and Stage 4 has no LLM call
// either). Pure functions, no DB or network — testable on its own.
//
// Cost estimate and INR conversion are re-exported from missionUsage.ts
// rather than duplicated: it's the same model (Sonnet 5), the same list
// price, and the same fixed exchange rate — one place to update either.
import { estimateCostUsd } from "./missionUsage.ts";
export {
  USAGE_MODEL,
  LLM_PRICING_USD_PER_MTOK,
  estimateCostUsd,
  USD_TO_INR,
  usdToInr,
  formatCostUsd,
  formatCostInr,
  describeInrCost,
} from "./missionUsage.ts";

// The two stages that call an LLM. Stage 3 (ranking_scoring) and Stage 4
// (output_interface) never do, so they have no usage row to read.
export type ConceptUsageStageKey = "concept_ideation" | "trade_off_reasoning";
const USAGE_STAGES: readonly string[] = ["concept_ideation", "trade_off_reasoning"];

export interface ConceptStageUsage {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  /** This stage's run fell back to mock output (no live Claude reply). */
  mock: boolean;
}

export interface ConceptUsage {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  stages: Partial<Record<ConceptUsageStageKey, ConceptStageUsage>>;
  /**
   * False when a stage ran but its usage was never recorded (e.g. logged
   * before usage tracking existed), so the totals are a floor, not exact.
   * Also a floor whenever a stage failed mid-run: a failed run logs no usage.
   */
  complete: boolean;
}

// One Hangar_concept_runs row, projected to just the fields usage needs —
// same PostgREST JSON-path projection missionUsage.ts's UsageRunRow uses.
export interface ConceptUsageRunRow {
  concept_id: string;
  stage: string;
  status: string;
  usage: unknown;
  mock: unknown;
}

function tokenPair(usage: unknown): { input: number; output: number } | null {
  if (typeof usage !== "object" || usage === null) return null;
  const { inputTokens, outputTokens } = usage as Record<string, unknown>;
  if (typeof inputTokens !== "number" || typeof outputTokens !== "number") return null;
  return { input: inputTokens, output: outputTokens };
}

// Sums EVERY successful run of each stage, not just the latest — a retried
// or re-clicked stage really did make (and get billed for) another call.
// Concept Agent's two LLM stages make exactly one call each (unlike Mission
// Agent's Stage 2, which makes two), so "requests" is simply 1 per
// successful, non-mock run — no separate requestCount field to read.
export function aggregateConceptUsage(rows: ConceptUsageRunRow[]): Map<string, ConceptUsage> {
  const byConcept = new Map<string, ConceptUsage>();

  for (const row of rows) {
    if (row.status !== "success" || !USAGE_STAGES.includes(row.stage)) continue;
    const stageKey = row.stage as ConceptUsageStageKey;

    let concept = byConcept.get(row.concept_id);
    if (!concept) {
      concept = { requests: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, stages: {}, complete: true };
      byConcept.set(row.concept_id, concept);
    }

    if (typeof row.mock !== "boolean") {
      concept.complete = false;
      continue;
    }

    const tokens = tokenPair(row.usage);
    const stage = (concept.stages[stageKey] ??= {
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      mock: false,
    });
    stage.requests += tokens ? 1 : 0;
    stage.inputTokens += tokens?.input ?? 0;
    stage.outputTokens += tokens?.output ?? 0;
    stage.mock = stage.mock || row.mock;
  }

  for (const concept of byConcept.values()) {
    for (const stage of Object.values(concept.stages)) {
      concept.requests += stage.requests;
      concept.inputTokens += stage.inputTokens;
      concept.outputTokens += stage.outputTokens;
    }
    concept.estimatedCostUsd = estimateCostUsd(concept.inputTokens, concept.outputTokens);
  }
  return byConcept;
}
