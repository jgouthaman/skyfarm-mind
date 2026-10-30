import {
  llmProviderOrder,
  modelForProvider,
  startAgentTurn,
  type AgentToolCall,
  type AgentToolDef,
  type LlmProvider,
} from "@/lib/the-hangar/llmGateway";
import { callRamanEngine, RamanInputError } from "./ramanEngineClient";
import {
  insertStep,
  listSteps,
  updateRun,
  type RamanAgentRunRow,
  type RamanAgentStepRow,
  type RamanNoiseCheckRow,
} from "./ramanPersistence";
import type {
  RamanDesignChanges,
  RamanFixGoal,
  RamanInputs,
  RamanLeverRangesResult,
  RamanNoiseCheckResult,
  RamanRankedOption,
} from "./ramanTypes";

// Raman Noise Fix agent (Tabs 3-4). The LLM decides each move -- which lever
// to try, whether to refine, combine or drop one -- through two tools that
// call the deterministic engine (evaluate_design, get_lever_ranges); every
// number the agent sees or the UI shows comes from the engine.
//
// One iteration per request (advanceFixRun), driven by the client polling
// POST fix-runs/:id/step, so no single Vercel invocation runs the whole
// loop. Each request rebuilds the agent's context from the saved steps, so
// all decisions stay server-side and a run survives a dropped connection.
//
// The LLM is the Mission Hub AI Providers order, as on Bay 01: the primary
// provider first, the secondary if the primary fails (Claude Opus 5.5 or
// Groq gpt-oss-120b); each step records the model that decided it. If no
// provider answers, the run switches to the rule-based fallback planner
// below: source_was_mock=true,
// error_message records why, and the UI shows "Not agentic -- fallback
// planner". Never silent.

export const FALLBACK_PLANNER_MODEL = "fallback-planner";
const MIN_GAIN_DB = 0.5;

type Levers = RamanLeverRangesResult["levers"];
type AgentLeverKey = "prop_diameter_in" | "blade_count" | "hover_rpm" | "rotor_spacing_m" | "arm_clearance_ratio";
const AGENT_LEVERS: AgentLeverKey[] = ["prop_diameter_in", "blade_count", "hover_rpm", "rotor_spacing_m", "arm_clearance_ratio"];

export interface StepOutcome {
  run: RamanAgentRunRow;
  step: RamanAgentStepRow | null;
  done: boolean;
}

// ── Goal and constraints ─────────────────────────────────────────────────

// A design counts only if it is quieter than the baseline (delta below 0),
// feasible, and inside the mass and flight-time limits.
export function meetsConstraints(step: RamanAgentStepRow, goal: RamanFixGoal): boolean {
  const t = step.tradeoffs;
  return (
    step.feasible === true &&
    step.delta_db !== null &&
    step.delta_db < 0 &&
    t !== null &&
    t.added_mass_g <= goal.max_added_mass_g &&
    t.flight_time_change_pct >= goal.min_flight_time_change_pct
  );
}

function meetsTarget(step: RamanAgentStepRow, goal: RamanFixGoal): boolean {
  return step.predicted_dba !== null && step.predicted_dba <= goal.target_dba && meetsConstraints(step, goal);
}

// Deterministic stop rules, checked before planning each iteration.
function stopRuleFor(steps: RamanAgentStepRow[], goal: RamanFixGoal, baselineDba: number): string | null {
  const last = steps[steps.length - 1];
  if (last && meetsTarget(last, goal)) return "target_met";
  if (steps.length >= goal.max_iterations) return "max_iterations";
  if (steps.length >= 2) {
    // Best level before the last two iterations (the baseline counts as
    // iteration 0) versus the best of the last two.
    const level = (s: RamanAgentStepRow) => (meetsConstraints(s, goal) && s.predicted_dba !== null ? s.predicted_dba : Infinity);
    const before = Math.min(baselineDba, ...steps.slice(0, -2).map(level));
    const recent = Math.min(...steps.slice(-2).map(level));
    if (before - recent < MIN_GAIN_DB) return "no_improvement";
  }
  return null;
}

const STOP_REASON_TEXT: Record<string, string> = {
  target_met: "Target met with all constraints satisfied.",
  max_iterations: "Reached the iteration limit.",
  no_improvement: `No improvement of ${MIN_GAIN_DB} dB or more over the last 2 iterations.`,
  stopped_by_user: "Stopped by the user.",
  unreachable: "The target can't be reached within the constraints.",
  constraint_unsatisfiable: "A constraint can't be satisfied with the available levers.",
  no_further_gain: "The agent found no further gain worth trying.",
};

// ── Context the agent sees each iteration ────────────────────────────────

function baselineSummary(check: RamanNoiseCheckResult) {
  return {
    headline: check.headline,
    verdict: check.verdict,
    hover_dba_at_target_distance: check.hover.lamax_dba,
    target_distance_m: check.target_distance_m,
    source_breakdown_pct: check.hover.breakdown_pct,
    drivers: check.drivers.map((d) => ({ code: d.code, message: d.message })),
    performance: check.performance,
    warnings: check.warnings,
  };
}

function stepSummary(s: RamanAgentStepRow) {
  if (!s.result) return { iteration: s.iteration, reasoning: s.reasoning, changes: s.action, result: "engine rejected these changes" };
  return {
    iteration: s.iteration,
    reasoning: s.reasoning,
    changes: s.action,
    predicted_dba: s.predicted_dba,
    delta_db: s.delta_db,
    feasible: s.feasible,
    tradeoffs: s.tradeoffs,
    design: s.result.design,
    breakdown_pct: s.result.breakdown_pct,
    warnings: s.result.warnings,
  };
}

function agentContext(run: RamanAgentRunRow, baseline: RamanNoiseCheckResult, steps: RamanAgentStepRow[]): string {
  const { lever_ranges, ...goal } = run.goal;
  return JSON.stringify(
    {
      baseline_noise_check: baselineSummary(baseline),
      goal: {
        target_dba: goal.target_dba,
        target_distance_m: goal.target_distance_m,
        state: "hover",
      },
      constraints: {
        max_added_mass_g: goal.max_added_mass_g,
        min_flight_time_change_pct: goal.min_flight_time_change_pct,
        feasible_must_be_true: true,
        max_iterations: goal.max_iterations,
      },
      lever_ranges,
      iterations_so_far: steps.map(stepSummary),
    },
    null,
    1,
  );
}

const AGENT_SYSTEM = `You are Raman, TorqWings' UAV noise-reduction agent. You reduce a multirotor's hover noise to a target by changing its design, one experiment at a time, using a deterministic acoustic engine.

How you work:
- Each turn you either call evaluate_design with ONE design change to try next, or call finish_run when the run should end.
- The engine is the only source of numbers. Never state a dB level, RPM, mass or percentage that is not in the context or a tool result.
- Changes are absolute target values for the levers (prop_diameter_in, blade_count, hover_rpm, rotor_spacing_m, arm_clearance_ratio), applied to the original vehicle. Set a lever to null to leave it at the original value. Stay inside lever_ranges.
- Decide from the results so far: refine a lever that helped, combine levers that each helped, drop a lever that hurt or broke a constraint. Do not sweep values mechanically.
- A design only counts if it is quieter than the baseline (delta_db below 0), feasible is true, added_mass_g <= max_added_mass_g and flight_time_change_pct >= min_flight_time_change_pct.
- reasoning: two or three plain sentences -- what you noticed in the last result (or in the baseline breakdown on the first turn) and why you chose this change.
- Call finish_run only if the target is met, or you judge it unreachable within the constraints, or no lever is left worth trying.`;

const EVALUATE_TOOL: AgentToolDef = {
  name: "evaluate_design",
  description:
    "Run the Raman acoustic engine on the original vehicle with these design changes. Returns predicted hover dBA at the target distance, delta versus baseline, source breakdown, trade-offs (added mass, flight time, efficiency, thrust-to-weight), warnings and feasible.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["reasoning", "changes"],
    properties: {
      reasoning: { type: "string", description: "What you noticed and why you are trying this change." },
      changes: {
        type: "object",
        additionalProperties: false,
        required: AGENT_LEVERS,
        properties: {
          prop_diameter_in: { type: ["number", "null"] },
          blade_count: { type: ["integer", "null"] },
          hover_rpm: { type: ["number", "null"] },
          rotor_spacing_m: { type: ["number", "null"] },
          arm_clearance_ratio: { type: ["number", "null"] },
        },
      },
    },
  },
};

const LEVER_RANGES_TOOL: AgentToolDef = {
  name: "get_lever_ranges",
  description: "The allowed range, step and current value of each design lever for this vehicle.",
  input_schema: { type: "object", additionalProperties: false, required: [], properties: {} },
};

const FINISH_TOOL: AgentToolDef = {
  name: "finish_run",
  description:
    "End the run and deliver 3 to 5 ranked options, best first. Each option must be an iteration you already evaluated; refer to it by iteration number.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["outcome", "reasoning", "options", "recommended_iteration"],
    properties: {
      outcome: { type: "string", enum: ["target_met", "unreachable", "constraint_unsatisfiable", "no_further_gain"] },
      reasoning: { type: "string", description: "Why the run ends and why the recommended option is best. No new numbers." },
      options: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["iteration", "summary", "effort"],
          properties: {
            iteration: { type: "integer" },
            summary: { type: "string", description: "The change in plain words, for a customer." },
            effort: { type: "string", enum: ["easy", "medium", "hard"] },
          },
        },
      },
      recommended_iteration: { type: "integer" },
    },
  },
};

// ── LLM planner (AI Providers order) ─────────────────────────────────────

type Plan =
  | { kind: "evaluate"; reasoning: string; changes: RamanDesignChanges }
  | { kind: "finish"; outcome: string; reasoning: string; options: { iteration: number; summary: string; effort: string }[]; recommended: number };

// Levers from a tool call. Tolerates the shapes models other than Claude
// send (Groq's gpt-oss): numbers as strings, `changes` as a JSON string, or
// the levers at the top level of the input instead of under `changes`.
function cleanChanges(input: Record<string, unknown>): RamanDesignChanges {
  let raw: unknown = input.changes;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: RamanDesignChanges = {};
  for (const k of AGENT_LEVERS) {
    const v = src[k] ?? input[k];
    const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
    if (Number.isFinite(n)) out[k] = k === "blade_count" ? Math.round(n) : n;
  }
  return out;
}

function planFromToolCall(block: AgentToolCall): Plan | null {
  const input = block.input;
  if (block.name === "evaluate_design") {
    const changes = cleanChanges(input);
    if (Object.keys(changes).length === 0) return null;
    return { kind: "evaluate", reasoning: String(input.reasoning ?? "").trim(), changes };
  }
  if (block.name === "finish_run") {
    const options = Array.isArray(input.options) ? (input.options as { iteration: number; summary: string; effort: string }[]) : [];
    return {
      kind: "finish",
      outcome: String(input.outcome ?? "no_further_gain"),
      reasoning: String(input.reasoning ?? "").trim(),
      options,
      recommended: Number(input.recommended_iteration),
    };
  }
  return null;
}

type PlanResult = { ok: true; plan: Plan; model: string } | { ok: false; error: string };

// Asks one provider for the next move. Allows get_lever_ranges round trips,
// one nudge if the model answers without calling a tool, and one correction
// if it calls evaluate_design without a usable change.
async function planWith(
  provider: LlmProvider,
  run: RamanAgentRunRow,
  baseline: RamanNoiseCheckResult,
  steps: RamanAgentStepRow[],
  finishOnly: string | null,
): Promise<PlanResult> {
  const instruction = finishOnly
    ? `The run is ending: ${finishOnly} Call finish_run now with 3 to 5 ranked options from the iterations above (fewer only if fewer were evaluated), best first.`
    : steps.length === 0
      ? "Plan your first experiment from the baseline breakdown and drivers, then call evaluate_design."
      : "Review the latest result, then call evaluate_design with your next change, or finish_run if the run should end.";
  const tools = finishOnly ? [FINISH_TOOL] : [EVALUATE_TOOL, LEVER_RANGES_TOOL, FINISH_TOOL];

  let turn = await startAgentTurn(provider, `${agentContext(run, baseline, steps)}\n\n${instruction}`, {
    system: AGENT_SYSTEM,
    tools,
    maxTokens: 8000,
    effort: "medium",
  });
  let nudged = false;
  let corrected = false;
  for (let round = 0; round < 5; round++) {
    if (!turn.ok) return turn;
    const decisive = turn.toolCalls.find((c) => c.name === "evaluate_design" || c.name === "finish_run");
    if (decisive) {
      const plan = planFromToolCall(decisive);
      if (plan) return { ok: true, plan, model: turn.model };
      const sent = JSON.stringify(decisive.input).slice(0, 300);
      if (corrected) return { ok: false, error: `${decisive.name} was called twice with no usable change (sent ${sent})` };
      corrected = true;
      // Tell the model what was wrong and let it try again.
      turn = await turn.reply(
        turn.toolCalls.map((c) => ({
          id: c.id,
          content:
            c.id === decisive.id
              ? `Error: no design change was applied. Set at least one lever in "changes" to a number inside lever_ranges (for example {"prop_diameter_in": 15}); leave the others null. You sent: ${sent}`
              : JSON.stringify(run.goal.lever_ranges ?? {}),
        })),
      );
      continue;
    }
    if (turn.toolCalls.length > 0) {
      // Only get_lever_ranges calls -- answer each and continue.
      turn = await turn.reply(turn.toolCalls.map((c) => ({ id: c.id, content: JSON.stringify(run.goal.lever_ranges ?? {}) })));
      continue;
    }
    if (nudged) break;
    nudged = true;
    turn = await turn.reply([], finishOnly ? "Call finish_run now." : "Call evaluate_design or finish_run now.");
  }
  return { ok: false, error: "the model did not call evaluate_design or finish_run" };
}

// Same order as Bay 01: the primary AI provider first, then the secondary.
export async function llmPlan(
  run: RamanAgentRunRow,
  baseline: RamanNoiseCheckResult,
  steps: RamanAgentStepRow[],
  finishOnly: string | null,
): Promise<PlanResult> {
  const errors: string[] = [];
  for (const provider of await llmProviderOrder()) {
    const res = await planWith(provider, run, baseline, steps, finishOnly);
    if (res.ok) {
      if (errors.length) console.warn(`[raman] run ${run.id}: answered by ${provider} after ${errors.join("; ")}`);
      return res;
    }
    errors.push(`${provider}: ${res.error}`);
  }
  return { ok: false, error: errors.join("; ") || "no AI provider configured" };
}

// ── Fallback planner (rule-based, NOT agentic) ───────────────────────────

const FALLBACK_TAG = "[Fallback planner -- not agentic]";

function leverValue(changes: RamanDesignChanges, levers: Levers, k: AgentLeverKey): number | null {
  return changes[k] ?? levers[k].current;
}

function bestStep(steps: RamanAgentStepRow[], goal: RamanFixGoal): RamanAgentStepRow | null {
  let best: RamanAgentStepRow | null = null;
  for (const s of steps) {
    if (!meetsConstraints(s, goal) || s.predicted_dba === null) continue;
    if (!best || s.predicted_dba < (best.predicted_dba ?? Infinity)) best = s;
  }
  return best;
}

// Fixed rules: start from the best design so far, nudge one lever at a time
// in the direction that usually lowers rotor noise, skip anything already
// tried, drop a lever that broke a constraint or gained under 0.3 dB.
function fallbackPlan(run: RamanAgentRunRow, baseline: RamanNoiseCheckResult, steps: RamanAgentStepRow[]): Plan {
  const levers = run.goal.lever_ranges!;
  const best = bestStep(steps, run.goal);
  const base: RamanDesignChanges = best?.action ?? {};
  const baseDba = best?.predicted_dba ?? baseline.hover.lamax_dba;
  const tried = new Set(steps.map((s) => JSON.stringify(s.action ?? {})));

  const dropped = new Set<AgentLeverKey>();
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const prevBest = bestStep(steps.slice(0, i), run.goal);
    const prevDba = prevBest?.predicted_dba ?? baseline.hover.lamax_dba;
    const gain = s.predicted_dba === null ? -Infinity : prevDba - s.predicted_dba;
    if (!meetsConstraints(s, run.goal) || gain < 0.3) {
      for (const k of AGENT_LEVERS) {
        if (s.action?.[k] !== undefined && s.action[k] !== prevBest?.action?.[k]) dropped.add(k);
      }
    }
  }

  const bd = baseline.hover.breakdown_pct;
  const moves: { key: AgentLeverKey; why: string; next: (v: number, l: Levers[AgentLeverKey]) => number }[] = [
    { key: "prop_diameter_in", why: `tonal hum is ${bd.tonal}% of the sound; a larger propeller turns slower for the same thrust`, next: (v, l) => Math.min(l.max, v + 1) },
    { key: "blade_count", why: "more blades share the thrust, lowering tip speed", next: (v, l) => Math.min(l.max, v + 1) },
    { key: "arm_clearance_ratio", why: `interaction is ${bd.interaction}% of the sound; more rotor-to-arm clearance reduces it`, next: (v, l) => Math.min(l.max, Math.round(Math.max(v * 1.5, v + 0.05) * 100) / 100) },
    { key: "rotor_spacing_m", why: "wider rotor spacing leaves room for larger propellers and less rotor-rotor interaction", next: (v, l) => Math.min(l.max, Math.round(v * 1.1 * 1000) / 1000) },
  ];

  for (const m of moves) {
    if (dropped.has(m.key)) continue;
    const current = leverValue(base, levers, m.key);
    if (current === null) continue;
    const value = m.next(current, levers[m.key]);
    if (value <= current) continue;
    const changes: RamanDesignChanges = { ...base, [m.key]: value };
    if (tried.has(JSON.stringify(changes))) continue;
    return {
      kind: "evaluate",
      reasoning: `${FALLBACK_TAG} Best so far is ${baseDba} dBA. Next rule: raise ${m.key} from ${current} to ${value} because ${m.why}.`,
      changes,
    };
  }
  return { kind: "finish", outcome: "no_further_gain", reasoning: `${FALLBACK_TAG} No untried lever moves remain.`, options: [], recommended: best?.iteration ?? 0 };
}

// ── Ranking ──────────────────────────────────────────────────────────────

function plainChange(changes: RamanDesignChanges, levers: Levers | undefined): string {
  const label: Record<AgentLeverKey, string> = {
    prop_diameter_in: "propeller diameter (in)",
    blade_count: "blade count",
    hover_rpm: "hover RPM",
    rotor_spacing_m: "rotor spacing (m)",
    arm_clearance_ratio: "rotor-to-arm clearance ratio",
  };
  const parts = AGENT_LEVERS.filter((k) => changes[k] !== undefined).map((k) => {
    const from = levers?.[k]?.current;
    return from !== null && from !== undefined ? `${label[k]} ${from} to ${changes[k]}` : `${label[k]} ${changes[k]}`;
  });
  return parts.length ? `Change ${parts.join(", ")}` : "No change";
}

function effortFor(changes: RamanDesignChanges): RamanRankedOption["effort"] {
  if (changes.rotor_spacing_m !== undefined || changes.arm_clearance_ratio !== undefined) return "hard";
  if (changes.prop_diameter_in !== undefined) return "medium";
  return "easy";
}

function optionFromStep(rank: number, s: RamanAgentStepRow, summary: string, effort: RamanRankedOption["effort"]): RamanRankedOption {
  return {
    rank,
    iteration: s.iteration,
    changes: s.action ?? {},
    summary,
    effort,
    predicted_dba: s.predicted_dba,
    delta_db: s.delta_db,
    tradeoffs: s.tradeoffs,
    feasible: s.feasible,
  };
}

// Deterministic ranking: designs that meet the constraints, quietest first.
function rankByLevel(steps: RamanAgentStepRow[], goal: RamanFixGoal): RamanRankedOption[] {
  return steps
    .filter((s) => meetsConstraints(s, goal) && s.predicted_dba !== null)
    .sort((a, b) => (a.predicted_dba ?? 0) - (b.predicted_dba ?? 0))
    .slice(0, 5)
    .map((s, i) => optionFromStep(i + 1, s, plainChange(s.action ?? {}, goal.lever_ranges), effortFor(s.action ?? {})));
}

// The agent's ranking, keeping only iterations that were really evaluated;
// every number is copied from the saved step.
function rankFromPlan(plan: Extract<Plan, { kind: "finish" }>, steps: RamanAgentStepRow[]): RamanRankedOption[] {
  const byIteration = new Map(steps.map((s) => [s.iteration, s]));
  const seen = new Set<number>();
  const out: RamanRankedOption[] = [];
  for (const o of plan.options) {
    const s = byIteration.get(Number(o.iteration));
    // Only designs that are really quieter than the baseline become options.
    if (!s || !s.result || seen.has(s.iteration) || s.delta_db === null || s.delta_db >= 0) continue;
    seen.add(s.iteration);
    const effort = o.effort === "easy" || o.effort === "medium" || o.effort === "hard" ? o.effort : effortFor(s.action ?? {});
    out.push(optionFromStep(out.length + 1, s, String(o.summary || "").trim() || plainChange(s.action ?? {}, undefined), effort));
    if (out.length === 5) break;
  }
  return out;
}

// ── Run lifecycle ────────────────────────────────────────────────────────

const PROVIDER_KEY: Record<LlmProvider, string> = { anthropic: "ANTHROPIC_API_KEY", groq: "GROQ_API_KEY" };

// The run starts on the first provider in the AI Providers order that has a
// key; with none, it starts on the fallback planner and says so.
export async function initialRunMode(): Promise<{ model: string; source_was_mock: boolean; error_message: string | null }> {
  const order = await llmProviderOrder();
  const first = order.find((p) => process.env[PROVIDER_KEY[p]]);
  if (first) return { model: modelForProvider(first), source_was_mock: false, error_message: null };
  const error = `${order.map((p) => PROVIDER_KEY[p]).join(" and ")} not set -- this run uses the rule-based fallback planner (not agentic).`;
  console.error(`[raman] ${error}`);
  return { model: FALLBACK_PLANNER_MODEL, source_was_mock: true, error_message: error };
}

async function switchToFallback(run: RamanAgentRunRow, error: string): Promise<RamanAgentRunRow> {
  const message = `No AI provider answered (${error}) -- switched to the rule-based fallback planner (not agentic).`;
  console.error(`[raman] run ${run.id}: ${message}`);
  return updateRun(run.id, {
    source_was_mock: true,
    model: FALLBACK_PLANNER_MODEL,
    error_message: [run.error_message, message].filter(Boolean).join(" "),
  });
}

async function finishRun(
  run: RamanAgentRunRow,
  baseline: RamanNoiseCheckResult,
  steps: RamanAgentStepRow[],
  reasonCode: string,
  plan: Extract<Plan, { kind: "finish" }> | null,
): Promise<RamanAgentRunRow> {
  let current = run;
  let finishPlan = plan;
  if (!finishPlan && !current.source_was_mock && steps.length > 0) {
    const res = await llmPlan(current, baseline, steps, STOP_REASON_TEXT[reasonCode] ?? reasonCode);
    if (res.ok && res.plan.kind === "finish") {
      finishPlan = res.plan;
      if (res.model !== current.model) current = await updateRun(current.id, { model: res.model });
    } else if (!res.ok) current = await switchToFallback(current, res.error);
  }

  let options = finishPlan && !current.source_was_mock ? rankFromPlan(finishPlan, steps) : [];
  let rankingNote = "";
  if (options.length === 0) {
    options = rankByLevel(steps, current.goal);
    rankingNote = current.source_was_mock ? "" : " Options ranked by predicted level.";
  }

  const recommendedStep =
    finishPlan && !current.source_was_mock ? options.find((o) => o.iteration === finishPlan!.recommended) : undefined;
  const recommended = recommendedStep ?? options[0];
  const reached = recommended?.predicted_dba != null && recommended.predicted_dba <= current.goal.target_dba;

  let reason = STOP_REASON_TEXT[reasonCode] ?? reasonCode;
  if (finishPlan?.reasoning) reason += ` ${finishPlan.reasoning}`;
  if (!reached) reason += recommended ? " Target not reached; the closest feasible design is recommended." : " No feasible design was found.";

  return updateRun(current.id, {
    status: reasonCode === "stopped_by_user" ? "stopped" : "completed",
    stop_reason: `${reasonCode}: ${reason}${rankingNote}`.trim(),
    ranked_options: options,
    recommended_design: recommended?.changes ?? null,
    finished_at: new Date().toISOString(),
  });
}

// Runs one iteration of a run: check the stop rules, plan the next move
// (primary/secondary AI provider, or the fallback planner), evaluate it, save the step. When a
// stop rule fires or the agent finishes, ranks the options and closes the run.
export async function advanceFixRun(run: RamanAgentRunRow, baselineCheck: RamanNoiseCheckRow): Promise<StepOutcome> {
  if (run.status !== "running") return { run, step: null, done: true };
  const baseline = baselineCheck.result as RamanNoiseCheckResult;
  const baselineInputs = baselineCheck.inputs as RamanInputs;
  const steps = await listSteps(run.id);

  if (run.stop_requested) return { run: await finishRun(run, baseline, steps, "stopped_by_user", null), step: null, done: true };
  const rule = stopRuleFor(steps, run.goal, baseline.hover.lamax_dba);
  if (rule) return { run: await finishRun(run, baseline, steps, rule, null), step: null, done: true };

  let current = run;
  let plan: Plan;
  let model = FALLBACK_PLANNER_MODEL;
  if (current.source_was_mock) {
    plan = fallbackPlan(current, baseline, steps);
  } else {
    const res = await llmPlan(current, baseline, steps, null);
    if (res.ok) {
      plan = res.plan;
      model = res.model;
      // run.model shows the provider currently answering (primary, or the secondary if the primary failed).
      if (model !== current.model) current = await updateRun(current.id, { model });
    } else {
      current = await switchToFallback(current, res.error);
      plan = fallbackPlan(current, baseline, steps);
    }
  }

  if (plan.kind === "finish") {
    return { run: await finishRun(current, baseline, steps, plan.outcome, current.source_was_mock ? null : plan), step: null, done: true };
  }

  const iteration = steps.length + 1;
  let step: RamanAgentStepRow;
  try {
    const result = await callRamanEngine("evaluate_design", { inputs: baselineInputs, changes: plan.changes });
    step = await insertStep({
      run_id: current.id,
      iteration,
      reasoning: plan.reasoning,
      action: plan.changes,
      result,
      predicted_dba: result.predicted_dba,
      delta_db: result.delta_db,
      tradeoffs: result.tradeoffs,
      feasible: result.feasible,
      model,
    });
  } catch (err) {
    if (!(err instanceof RamanInputError)) throw err;
    // The engine rejected the change itself (e.g. a value it can't resolve):
    // keep the step so the agent sees it failed and moves on.
    step = await insertStep({
      run_id: current.id,
      iteration,
      reasoning: `${plan.reasoning} [Engine rejected this change: ${err.message}]`,
      action: plan.changes,
      result: null,
      feasible: false,
      model,
    });
  }
  return { run: current, step, done: false };
}
