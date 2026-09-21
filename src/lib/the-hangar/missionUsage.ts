// Per-mission LLM usage and cost, rebuilt from what the pipeline already
// writes to Hangar_agent_runs — pure functions, no DB or network, so it's
// testable on its own (persistence fetches the rows, this turns them into
// numbers). Server-only in practice, but nothing here needs the server.
//
// Cost is an ESTIMATE at Anthropic's list price for the model the pipeline
// calls (llmGateway.ts's default, claude-sonnet-5): $2.00 input / $10.00
// output per 1M tokens, per the API reference (cached 2026-06-24). It ignores
// prompt-cache discounts (the pipeline doesn't use caching) and any negotiated
// pricing. Re-check LLM_PRICING_USD_PER_MTOK against the pricing page before
// quoting it as a bill.

export const USAGE_MODEL = "claude-sonnet-5";

export const LLM_PRICING_USD_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5": { input: 2, output: 10 },
};

export function estimateCostUsd(
  inputTokens: number,
  outputTokens: number,
  model: string = USAGE_MODEL,
): number {
  const price = LLM_PRICING_USD_PER_MTOK[model];
  if (!price) return 0;
  return (inputTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output;
}

// The three stages that call an LLM. Stage 4 (output_interface) never does,
// so it has no usage row to read.
export type UsageStageKey = "input_processing" | "reasoning_planning" | "output_generation";
const USAGE_STAGES: readonly string[] = [
  "input_processing",
  "reasoning_planning",
  "output_generation",
];

export interface StageUsage {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  /** At least one run of this stage fell back to mock output (no live Claude reply). */
  mock: boolean;
}

export interface MissionUsage {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  stages: Partial<Record<UsageStageKey, StageUsage>>;
  /**
   * False when a stage ran but its usage was never recorded (Stage 2 didn't
   * log usage before this was added), so the totals are a floor, not exact.
   * Also a floor whenever a stage failed mid-run: a failed run logs no usage.
   */
  complete: boolean;
}

// One Hangar_agent_runs row, projected to just the fields usage needs. The
// three JSON fields come from `output_snapshot->usage` etc. (PostgREST JSON
// path), so a missing key and a JSON null both arrive as null.
export interface UsageRunRow {
  mission_id: string;
  stage: string;
  status: string;
  usage: unknown;
  request_count: unknown;
  mock: unknown;
}

function tokenPair(usage: unknown): { input: number; output: number } | null {
  if (typeof usage !== "object" || usage === null) return null;
  const { inputTokens, outputTokens } = usage as Record<string, unknown>;
  if (typeof inputTokens !== "number" || typeof outputTokens !== "number") return null;
  return { input: inputTokens, output: outputTokens };
}

// Sums EVERY successful run of each stage, not just the latest: a retried or
// re-clicked stage really did make (and get billed for) another call, so cost
// is the sum. Runs that errored are skipped — they logged no usage.
export function aggregateMissionUsage(rows: UsageRunRow[]): Map<string, MissionUsage> {
  const byMission = new Map<string, MissionUsage>();

  for (const row of rows) {
    if (row.status !== "success" || !USAGE_STAGES.includes(row.stage)) continue;
    const stageKey = row.stage as UsageStageKey;

    let mission = byMission.get(row.mission_id);
    if (!mission) {
      mission = {
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCostUsd: 0,
        stages: {},
        complete: true,
      };
      byMission.set(row.mission_id, mission);
    }

    // `mock` is always written as a boolean by Stages 1-3 (Stage 2 only since
    // usage logging was added) — so a non-boolean here means an older row
    // whose usage was never recorded.
    if (typeof row.mock !== "boolean") {
      mission.complete = false;
      continue;
    }

    const tokens = tokenPair(row.usage);
    // Stage 2 records its own request count (two calls, either can be mock);
    // Stages 1 and 3 make one call, and it counts only if it produced usage.
    const requests =
      stageKey === "reasoning_planning" && typeof row.request_count === "number"
        ? row.request_count
        : tokens
          ? 1
          : 0;

    const stage = (mission.stages[stageKey] ??= {
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      mock: false,
    });
    stage.requests += requests;
    stage.inputTokens += tokens?.input ?? 0;
    stage.outputTokens += tokens?.output ?? 0;
    stage.mock = stage.mock || row.mock;
  }

  for (const mission of byMission.values()) {
    for (const stage of Object.values(mission.stages)) {
      mission.requests += stage.requests;
      mission.inputTokens += stage.inputTokens;
      mission.outputTokens += stage.outputTokens;
    }
    mission.estimatedCostUsd = estimateCostUsd(mission.inputTokens, mission.outputTokens);
  }
  return byMission;
}

// Small amounts read better with more decimals: $0.0042, not $0.00.
export function formatCostUsd(usd: number): string {
  if (usd === 0) return "$0";
  return usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`;
}
