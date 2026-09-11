import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useHangarSession } from "@/lib/the-hangar/session";
import { supabase } from "@/integrations/supabase/client";
import type {
  Stage1Result,
  Stage2Result,
  MissionListEntry,
} from "@/lib/the-hangar/missionAgentPipeline";
import type { Stage3Output } from "@/lib/the-hangar/stage3Orchestrator";
import type { FinalMissionResponse } from "@/lib/the-hangar/types/mission-pipeline-api";
import { DOMAIN_RULES } from "@/lib/the-hangar/domainRules";
import type { SourceType } from "@/lib/the-hangar/types/hangar-mission";

// ─────────────────────────────────────────────────────────────────────────
// The Hangar — Bay 01 (Mission Agent) detail page. Faithful port of
// mission-agent.html (reference mockup, see reference/the-hangar/mission-agent.html).
// Fully isolated — no imports from destud-auth.ts or any /destud file.
// Auth-gated the same way /the-hangar/welcome is, via the shared (Hangar-only)
// useHangarSession hook — redirects to /the-hangar if there's no session.
//
// Process-a-mission flow: gated, stage-by-stage. Each of the 4 pipeline
// stages is its own real HTTP call (api.hangar.process-mission.<stage>.ts)
// — the server genuinely pauses after each one; "Proceed" is a real
// request, not a client-side reveal of already-finished work.
// ─────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/the-hangar/mission")({
  component: TheHangarMission,
});

// ── Live intake form + Dashboard View (Section 13.1) ──

interface MissionSpecsView {
  domain: string;
  vertical: string | null;
  vehicleClass: string | null;
  missionType: string;
  phase: string;
  operatingEnvironment: string | null;
}

interface ConstraintView {
  name: string;
  value: string;
  sources: string[];
}

interface KpiView {
  name: string;
  target: string;
  unit: string;
  priority: "critical" | number;
}

interface MissionResult {
  missionId: string;
  missionCode: string;
  missionSpecs: MissionSpecsView;
  constraints: ConstraintView[];
  kpis: KpiView[];
  summary: string;
  confidenceScore: number;
  validationFlags: string[];
}

function toMissionResult(r: FinalMissionResponse): MissionResult {
  return {
    missionId: r.mission_id,
    missionCode: r.mission_code,
    missionSpecs: r.mission_specs as unknown as MissionSpecsView,
    constraints: r.constraints as unknown as ConstraintView[],
    kpis: r.kpis as unknown as KpiView[],
    summary: r.summary,
    confidenceScore: r.confidence_score,
    validationFlags: r.validation_flags,
  };
}

// Beside the Spec ID on both the live dashboard and the past-mission view —
// date + time (not just date, unlike the "Your missions" row list) since
// this is the one spot answering "when exactly was this spec generated."
// Locale-formatted (viewer's own timezone), matching the row list's existing
// toLocaleDateString() convention rather than a fixed UTC format.
function formatGeneratedAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// Per-run LLM usage/timing, for the telemetry bar at the top of the live
// spec dashboard — meant for optimization, not user-facing status, so it's
// only ever computed for a mission that was actually run THIS session
// (computeTelemetry below returns null otherwise): a resumed/past mission
// has no real Stage1-3 results to total, only what MissionsListPanel
// already knew, same limitation generatedAt's resume path already accepted.
interface MissionTelemetry {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

// Sums each stage's own request count/token usage/processing time (already
// measured server-side per stage — see missionAgentPipeline.ts's `start`/
// `Date.now() - start` pairs) rather than a client-side wall-clock timer:
// the gated flow lets the user pause between stages to read findings before
// clicking "Proceed," and that dwell time is the user thinking, not the
// pipeline working — counting it would make "time taken" useless for
// judging what to actually optimize.
function computeTelemetry(flow: MissionFlowState): MissionTelemetry | null {
  const s1 = flow.stage1.result;
  const s2 = flow.stage2.result;
  const s3 = flow.stage3.result;
  if (!s1 || !s2 || !s3) return null;
  const s1Usage = s1.extraction.usage;
  const s3Usage = s3.usage;
  return {
    requests: (s1Usage ? 1 : 0) + s2.requestCount + (s3Usage ? 1 : 0),
    inputTokens: (s1Usage?.inputTokens ?? 0) + s2.usage.inputTokens + (s3Usage?.inputTokens ?? 0),
    outputTokens:
      (s1Usage?.outputTokens ?? 0) + s2.usage.outputTokens + (s3Usage?.outputTokens ?? 0),
    durationMs: s1.durationMs + s2.durationMs + s3.durationMs,
  };
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function TelemetryBar({ telemetry }: { telemetry: MissionTelemetry | null }) {
  if (!telemetry) return null;
  return (
    <div className="hgr-m-telemetry" title="LLM usage for this run — not available for resumed/past missions">
      <div className="hgr-m-telemetry-item">
        <span className="hgr-m-telemetry-num">{telemetry.requests}</span>
        <span className="hgr-m-telemetry-label">Requests</span>
      </div>
      <div className="hgr-m-telemetry-item">
        <span className="hgr-m-telemetry-num">{telemetry.inputTokens.toLocaleString()}</span>
        <span className="hgr-m-telemetry-label">Input tokens</span>
      </div>
      <div className="hgr-m-telemetry-item">
        <span className="hgr-m-telemetry-num">{telemetry.outputTokens.toLocaleString()}</span>
        <span className="hgr-m-telemetry-label">Output tokens</span>
      </div>
      <div className="hgr-m-telemetry-item">
        <span className="hgr-m-telemetry-num">{formatDuration(telemetry.durationMs)}</span>
        <span className="hgr-m-telemetry-label">Time taken</span>
      </div>
    </div>
  );
}

// TorqWings' missions are all India-based (Tamil Nadu, DGCA, etc.) — any
// cost/budget-named KPI should read in ₹/INR regardless of what unit the
// LLM happened to pick, so this overrides the display rather than trusting
// the model's own unit choice.
function formatKpiDisplay(name: string, target: string, unit: string): string {
  if (/cost|budget|price/i.test(name) && !/₹|inr/i.test(unit)) {
    return `₹${target}`;
  }
  return `${target} ${unit}`;
}

// Mirrors confidenceScore.ts's exact formula so the tooltip can show this
// mission's real inputs to it, not just the general method — same
// exact-match (trimmed, lowercased) check against "payload"/"range"/
// "endurance" KPI names that file itself uses for field completeness.
const CORE_FIELDS = ["payload", "range", "endurance"] as const;

interface ConfidenceBreakdown {
  sourceTypesUsedCount: number;
  foundFields: string[];
  missingFields: string[];
  sourceCompletenessPct: number;
  fieldCompletenessPct: number;
  validationFlagCount: number;
  penaltyPct: number;
}

function computeConfidenceBreakdown(
  kpis: KpiView[],
  sourceTypesUsedCount: number,
  validationFlagCount: number,
): ConfidenceBreakdown {
  const foundFields = CORE_FIELDS.filter((f) =>
    kpis.some((k) => k.name.trim().toLowerCase() === f),
  );
  const missingFields = CORE_FIELDS.filter((f) => !foundFields.includes(f));
  return {
    sourceTypesUsedCount,
    foundFields,
    missingFields,
    sourceCompletenessPct: Math.round(Math.min(sourceTypesUsedCount / 3, 1) * 100),
    fieldCompletenessPct: Math.round((foundFields.length / 3) * 100),
    validationFlagCount,
    penaltyPct: validationFlagCount * 5,
  };
}

interface FieldChange {
  field: CoreField;
  label: string;
  prevDisplay: string | null; // null = was missing before this boost
  newDisplay: string;
  changed: boolean;
}

// Per-field before/after for the boost explanation — covers both boost
// paths uniformly: a field that was genuinely missing and got answered
// shows as "missing → found"; a field that was already found and simply
// got resubmitted (the no-question path) shows as "unchanged," which is
// itself the honest answer for why the score still moved (see the
// source-completeness note next to it in the render).
function getFieldChanges(prev: KpiView[] | null, next: KpiView[]): FieldChange[] {
  if (!prev) return [];
  return CORE_FIELDS.map((field) => {
    const p = prev.find((k) => k.name.trim().toLowerCase() === field);
    const n = next.find((k) => k.name.trim().toLowerCase() === field);
    return {
      field,
      label: field.charAt(0).toUpperCase() + field.slice(1),
      prevDisplay: p ? `${p.target} ${p.unit}` : null,
      newDisplay: n ? `${n.target} ${n.unit}` : "still missing",
      changed:
        (p?.target ?? null) !== (n?.target ?? null) || (p?.unit ?? null) !== (n?.unit ?? null),
    };
  });
}

// "Increase confidence" wizard — every one of missionInputValidation.ts's
// validation flags is about these same 3 core fields (payload/range/
// endurance), so answering the missing ones addresses both the field-
// completeness term AND the validation-flag penalty in one pass, per field.
type CoreField = (typeof CORE_FIELDS)[number];

const BOOST_QUESTIONS: Record<
  CoreField,
  { question: string; unit: string; structuredKey: string }
> = {
  payload: {
    question: "What's the required payload capacity?",
    unit: "kg",
    structuredKey: "payload_kg",
  },
  range: { question: "What's the required range?", unit: "km", structuredKey: "range_km" },
  endurance: {
    question: "What's the required endurance / battery life?",
    unit: "min",
    structuredKey: "endurance_min",
  },
};

function parseLeadingNumberClient(text: string): number | null {
  const match = text.trim().match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

// Same 3 core fields computeValidationFlags (missionInputValidation.ts)
// already flags server-side when neither structured input nor an LLM hint
// produced a value — reusing its exact flag text here (rather than
// re-deriving "missing" some other way) is what lets this gate trust the
// list completely: if a field isn't in this list, Stage 1 already found a
// real value for it, structured or not.
function getMissingCoreFields(validationFlags: string[]): CoreField[] {
  return CORE_FIELDS.filter((f) =>
    validationFlags.includes(`${f}: no value extracted or provided`),
  );
}

// Grouped by where each constraint actually came from — the same
// provenance already carried in each constraint's sources[] tags, just
// used to cluster the list instead of repeating on every single card what
// category it belongs to. Fixed display order: hard rules first (least
// negotiable), user-stated last (most directly traceable to the brief).
const CONSTRAINT_GROUP_ORDER = [
  "Domain Rules",
  "Regulatory",
  "TorqWings AI",
  "From Your Brief",
] as const;

// Was regex-on-text before (`/^DOM-/`, `/FAR|DGCA|regulation/i`) — broke
// silently for every regulation-sourced constraint, since domainRules.ts
// tags those with the bare rule ID ("REG-001"), which contains none of
// "FAR"/"DGCA"/"regulation" as literal text, so they all fell through to
// "From Your Brief" instead of "Regulatory". Fixed by checking each rule's
// actual `source` field (via RULE_BY_ID, the same data domainRules.ts
// itself defines) instead of re-guessing a rule's category from how its ID
// happens to be spelled — can't drift out of sync with domainRules.ts by
// construction, the way the old regex could (and did).
function categorizeConstraint(sources: string[]): (typeof CONSTRAINT_GROUP_ORDER)[number] {
  if (sources.some((s) => RULE_BY_ID.get(s)?.source === "regulation")) return "Regulatory";
  if (sources.some((s) => RULE_BY_ID.has(s))) return "Domain Rules";
  if (sources.some((s) => s === "LLM inference (Stage 2.2)")) return "TorqWings AI";
  return "From Your Brief";
}

function groupConstraints(
  constraints: ConstraintView[],
): { label: string; items: ConstraintView[] }[] {
  const groups = new Map<string, ConstraintView[]>();
  for (const c of constraints) {
    const label = categorizeConstraint(c.sources);
    const list = groups.get(label) ?? [];
    list.push(c);
    groups.set(label, list);
  }
  return CONSTRAINT_GROUP_ORDER.filter((label) => groups.has(label)).map((label) => ({
    label,
    items: groups.get(label)!,
  }));
}

// One level finer than groupConstraints' 4 coarse buckets — within e.g.
// "Domain Rules", cluster by the *exact* sourceLabel tag (a specific rule
// ID like "DOM-001", or "Stage 2.1 hint"), so the tag becomes a subheading
// instead of a chip repeated under every single constraint. A constraint
// can carry more than one sourceLabel (finalizeConstraints merges
// duplicate-named constraints from different stages) — grouped under its
// first tag only, so it appears exactly once, not once per tag.
function subGroupBySourceLabel(
  items: ConstraintView[],
): { tag: string; items: ConstraintView[] }[] {
  const order: string[] = [];
  const groups = new Map<string, ConstraintView[]>();
  for (const c of items) {
    const tag = c.sources[0] ?? "—";
    if (!groups.has(tag)) order.push(tag);
    const list = groups.get(tag) ?? [];
    list.push(c);
    groups.set(tag, list);
  }
  return order.map((tag) => ({ tag, items: groups.get(tag)! }));
}

// Every sourceLabel a constraint can carry (constraintIdentification.ts) is
// either one of domainRules.ts's own rule IDs, or one of the two literal
// non-rule tags handled below — one lookup by exact ID, shared by
// describeSourceTag (subheading text) and categorizeConstraint (top-level
// bucket) below, so both stay in sync with domainRules.ts automatically
// and neither one re-derives a rule's identity by pattern-matching its ID
// string (see categorizeConstraint's comment for why that broke once).
const RULE_BY_ID = new Map(DOMAIN_RULES.map((r) => [r.id, r]));

function describeSourceTag(tag: string): string {
  if (tag === "Stage 2.1 hint") return "Noted while first reading your brief";
  if (tag === "LLM inference (Stage 2.2)") return "Inferred during reasoning & planning";
  return RULE_BY_ID.get(tag)?.trigger ?? tag;
}

// ── Gated stage flow state ──

type StageKey =
  | "input_processing"
  | "reasoning_planning"
  | "output_generation"
  | "output_interface";

interface StageSlot<TResult> {
  status: "pending" | "running" | "complete" | "error";
  result: TResult | null;
  errorMessage: string | null;
}

interface MissionFlowState {
  missionId: string | null;
  // Mirrors Stage1Result.sourceTypesUsed.length — kept as its own top-level
  // field (not just read off stage1.result) so a resumed past mission
  // (which has no real Stage1Result, only what MissionsListPanel already
  // knew) can still populate it for an accurate confidence breakdown.
  sourceTypesUsedCount: number | null;
  // When Stage 4 actually finished — client-side timestamp for a mission
  // generated this session (FinalMissionResponse itself carries no
  // timestamp), or the mission's real createdAt when reopened via
  // resumeMission. Shown beside the Spec ID (Section 13.1 dashboard) so
  // "when was this spec generated" doesn't require opening "Your missions".
  generatedAt: string | null;
  stage1: StageSlot<Stage1Result>;
  stage2: StageSlot<Stage2Result>;
  stage3: StageSlot<Stage3Output>;
  stage4: StageSlot<FinalMissionResponse>;
}

const EMPTY_SLOT = { status: "pending" as const, result: null, errorMessage: null };

const INITIAL_FLOW_STATE: MissionFlowState = {
  missionId: null,
  sourceTypesUsedCount: null,
  generatedAt: null,
  stage1: EMPTY_SLOT,
  stage2: EMPTY_SLOT,
  stage3: EMPTY_SLOT,
  stage4: EMPTY_SLOT,
};

// Stages run strictly in order, so the active one is simply the first that
// hasn't completed yet — no need to separately special-case "running"/"error".
function getActiveStage(flow: MissionFlowState): StageKey | "done" {
  if (flow.stage1.status !== "complete") return "input_processing";
  if (flow.stage2.status !== "complete") return "reasoning_planning";
  if (flow.stage3.status !== "complete") return "output_generation";
  if (flow.stage4.status !== "complete") return "output_interface";
  return "done";
}

const STAGE_ORDER: StageKey[] = [
  "input_processing",
  "reasoning_planning",
  "output_generation",
  "output_interface",
];

const STAGE_TITLES: Record<StageKey, string> = {
  input_processing: "Input Processing",
  reasoning_planning: "Reasoning & Planning",
  output_generation: "Output Generation",
  output_interface: "Output Interface",
};

// Section 4.4.1: each stage call is genuinely synchronous — one request,
// one response, no server-sent progress. This sub-step list is a UX pacing
// device only (advanced on a timer while Stage 1's request is in flight),
// not real per-step telemetry — scoped to Stage 1 only, since that's the
// one stage whose internals have actually been audited down to this level
// of detail. Stages 2-4 each show a single "Processing…" line instead.
const PROGRESS_STEPS = [
  "Intent understanding",
  "Entity extraction",
  "Context retrieval",
  "Validation & normalization",
];

// Shared fetch helper for all 4 stage calls — resolves the auth token,
// posts JSON, and normalizes both HTTP-error and network-error cases into
// one result shape so each stage handler below doesn't repeat this.
async function callStageApi<TResult>(
  path: string,
  body: unknown,
): Promise<{ ok: true; data: TResult } | { ok: false; error: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    return {
      ok: false,
      error:
        "No signed-in TorqWings session found. Flight Deck's current sign-in is a temporary demo stub and doesn't create a real account session — sign in with a real TorqWings account elsewhere in the app first, then retry.",
    };
  }
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      // A 400 here is a real, expected rejection (e.g. missionInputValidation.ts's
      // "nothing usable in this brief") — json.error already carries that
      // exact reason, same message either way.
      return { ok: false, error: json.error ?? `Request failed (HTTP ${res.status}).` };
    }
    return { ok: true, data: json as TResult };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Unexpected error — check your connection and try again.",
    };
  }
}

function TheHangarMission() {
  const ready = useHangarSession();

  // All hooks called unconditionally, before the `!ready` early return below
  // — useHangarSession's own redirect-in-progress render still needs these
  // declared in the same order every time (rules of hooks).
  const [briefText, setBriefText] = useState("");
  const [flow, setFlow] = useState<MissionFlowState>(INITIAL_FLOW_STATE);
  const [finalizeState, setFinalizeState] = useState<{
    status: "idle" | "saving" | "saved" | "error";
    errorMessage: string | null;
  }>({ status: "idle", errorMessage: null });
  const [progressStepIdx, setProgressStepIdx] = useState(0);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [llmStatus, setLlmStatus] = useState<"checking" | "live" | "offline">("checking");
  const [missionsList, setMissionsList] = useState<MissionListEntry[] | null>(null);
  const [missionsListStatus, setMissionsListStatus] = useState<"idle" | "loading" | "error">(
    "idle",
  );
  const [selectedMission, setSelectedMission] = useState<MissionListEntry | null>(null);
  const [planExpanded, setPlanExpanded] = useState(false);
  const [missionsExpanded, setMissionsExpanded] = useState(false);
  const [boostWizard, setBoostWizard] = useState<{
    active: boolean;
    questionIndex: number;
    answers: Partial<Record<CoreField, string>>;
  }>({ active: false, questionIndex: 0, answers: {} });
  const [boostRunning, setBoostRunning] = useState(false);
  // Pre-Stage-2 gate: as soon as Stage 1 finishes, if any of payload/range/
  // endurance came back with no value, this opens automatically (unlike
  // boostWizard below, which is user-initiated) and blocks "Proceed to
  // Reasoning & Planning" until every missing one is answered — so Stage
  // 2's KPI-deriving LLM call is never left to guess a number that later
  // stages then present as fact.
  const [gapWizard, setGapWizard] = useState<{
    active: boolean;
    questionIndex: number;
    answers: Partial<Record<CoreField, string>>;
  }>({ active: false, questionIndex: 0, answers: {} });
  const [gapAnswerDraft, setGapAnswerDraft] = useState("");
  const [boostError, setBoostError] = useState<string | null>(null);
  const [previousConfidenceScore, setPreviousConfidenceScore] = useState<number | null>(null);
  const [previousBreakdown, setPreviousBreakdown] = useState<ConfidenceBreakdown | null>(null);
  const [previousKpis, setPreviousKpis] = useState<KpiView[] | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Same "Welcome, {email}" pattern as /the-hangar and /the-hangar/welcome —
  // every bay page reads the real Supabase session this way, not just this
  // one, so it stays consistent as more bays come online.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserEmail(data.session?.user.email ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserEmail(session?.user.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // "AI" indicator — green when Claude is genuinely reachable through
  // ANTHROPIC_API_KEY (a real models.list() round-trip server-side, see
  // checkLlmLiveStatus), amber for anything short of that (no key, bad key,
  // Anthropic outage) so the badge never quietly lies about whether Stage
  // 1-3's LLM calls will actually work. Checked once on arrival and again
  // every 60s so a key that gets fixed/breaks mid-session is reflected
  // without a page reload.
  useEffect(() => {
    let cancelled = false;
    async function checkLlmStatus() {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      try {
        const res = await fetch("/api/hangar/llm-status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!cancelled) setLlmStatus(res.ok && json.live ? "live" : "offline");
      } catch {
        if (!cancelled) setLlmStatus("offline");
      }
    }
    checkLlmStatus();
    const interval = setInterval(checkLlmStatus, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // "Your missions" — loaded once on arrival, and again after each mission
  // reaches spec_ready/finalized so a just-finished mission shows up without
  // a manual refresh. Extracted into a named function so a "Retry" button
  // (ListFetchError, below) can re-invoke the exact same fetch on failure —
  // previously this list just went silently blank on a fetch error, with
  // no way to retry short of reloading the page.
  async function fetchMissionsList() {
    if (!currentUserEmail) return;
    setMissionsListStatus("loading");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setMissionsListStatus("error");
      return;
    }
    try {
      const res = await fetch("/api/hangar/missions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMissionsList(await res.json());
      setMissionsListStatus("idle");
    } catch {
      setMissionsListStatus("error");
    }
  }

  useEffect(() => {
    fetchMissionsList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserEmail, flow.stage4.status]);

  useEffect(
    () => () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    },
    [],
  );

  function resetFlow() {
    setFlow(INITIAL_FLOW_STATE);
    setBriefText("");
    setFinalizeState({ status: "idle", errorMessage: null });
    setSelectedMission(null);
    setBoostWizard({ active: false, questionIndex: 0, answers: {} });
    setBoostError(null);
    setPreviousConfidenceScore(null);
    setPreviousBreakdown(null);
    setPreviousKpis(null);
    setGapWizard({ active: false, questionIndex: 0, answers: {} });
    setGapAnswerDraft("");
  }

  // A mission clicked from "Your missions" that isn't finalized yet should
  // stay fully editable — reopened into the live dashboard (Save as
  // final / Edit and regenerate / the confidence boost, all working),
  // exactly as if it had just finished generating, not the stripped-down
  // read-only PastMissionDetail view. Only a genuinely finalized mission is
  // locked (routed to PastMissionDetail instead — see the click handler in
  // MissionsListPanel's render below).
  function resumeMission(m: MissionListEntry) {
    if (
      !m.missionSpecs ||
      !m.constraints ||
      !m.kpis ||
      m.summary === null ||
      m.confidenceScore === null
    ) {
      // No persisted spec to resume (failed/abandoned before spec_ready) —
      // fall back to the read-only view, which already handles this case
      // (shows the status message instead of a spec).
      setSelectedMission(m);
      return;
    }
    setFlow({
      missionId: m.missionId,
      sourceTypesUsedCount: m.sourceTypesUsedCount,
      generatedAt: m.createdAt,
      stage1: { status: "complete", result: null, errorMessage: null },
      stage2: { status: "complete", result: null, errorMessage: null },
      stage3: { status: "complete", result: null, errorMessage: null },
      stage4: {
        status: "complete",
        result: {
          mission_id: m.missionId,
          mission_code: m.missionCode,
          mission_specs: m.missionSpecs as unknown as Record<string, unknown>,
          constraints: m.constraints,
          kpis: m.kpis,
          summary: m.summary,
          confidence_score: m.confidenceScore,
          // Not retained separately per mission today (see
          // getOriginalBriefsForMissions) — a resumed mission's confidence
          // tooltip just won't list validation flags; the persisted score
          // itself is still exact.
          validation_flags: [],
        },
        errorMessage: null,
      },
    });
    setBriefText(m.briefText ?? "");
    setFinalizeState({ status: "idle", errorMessage: null });
    setBoostWizard({ active: false, questionIndex: 0, answers: {} });
    setBoostError(null);
    setPreviousConfidenceScore(null);
    setPreviousBreakdown(null);
    setPreviousKpis(null);
    setGapWizard({ active: false, questionIndex: 0, answers: {} });
    setGapAnswerDraft("");
    setSelectedMission(null);
    setPlanExpanded(true);
  }

  // "Edit and regenerate" — same reset as Start New, but keeps briefText so
  // the intake form reopens pre-filled with the original wording instead of
  // blank, ready to tweak. Resubmitting runs Stage 1 fresh, which creates a
  // brand new Hangar_missions row (new mission_id/mission_code) — this is
  // genuinely a new mission, not an edit-in-place of the old one, since
  // that's what runInputProcessingStage always does today (no update-in-place
  // path exists in the backend). A common way to chase a higher confidence
  // score: add whatever the validation flags or thin findings suggested was
  // missing, then resubmit.
  function editAndRegenerate() {
    setFlow(INITIAL_FLOW_STATE);
    setFinalizeState({ status: "idle", errorMessage: null });
    setBoostWizard({ active: false, questionIndex: 0, answers: {} });
    setBoostError(null);
    setPreviousConfidenceScore(null);
    setPreviousBreakdown(null);
    setPreviousKpis(null);
    setGapWizard({ active: false, questionIndex: 0, answers: {} });
    setGapAnswerDraft("");
  }

  async function saveAsFinal() {
    if (!flow.missionId || finalizeState.status === "saving" || finalizeState.status === "saved")
      return;
    setFinalizeState({ status: "saving", errorMessage: null });
    const outcome = await callStageApi<{ missionId: string; status: string }>(
      "/api/hangar/process-mission/finalize",
      { missionId: flow.missionId },
    );
    if (!outcome.ok) {
      setFinalizeState({ status: "error", errorMessage: outcome.error });
      return;
    }
    // Saved for good — nothing left to review or edit on this mission, so
    // return to the page's base state (both "Your missions" and "Plan a
    // new mission" collapsed) rather than lingering on a dashboard with
    // now-inert actions. resetFlow's own flow.stage4 change re-triggers
    // the missions-list fetch, so the list already reflects the new
    // "Finalized" status by the time it's opened again.
    resetFlow();
    setMissionsExpanded(false);
    setPlanExpanded(false);
  }

  function submitBrief(e: React.FormEvent) {
    e.preventDefault();
    runStage1();
  }

  async function runStage1() {
    if (!briefText.trim() || flow.stage1.status === "running") return;

    setFlow((f) => ({ ...f, stage1: { status: "running", result: null, errorMessage: null } }));
    let stepIdx = 0;
    setProgressStepIdx(0);
    progressTimer.current = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, PROGRESS_STEPS.length - 1);
      setProgressStepIdx(stepIdx);
    }, 2500);

    const sources = [{ source_type: "natural_language", raw_input: { text: briefText.trim() } }];
    const outcome = await callStageApi<Stage1Result>(
      "/api/hangar/process-mission/input-processing",
      {
        sources,
      },
    );
    if (progressTimer.current) clearInterval(progressTimer.current);

    if (!outcome.ok) {
      setFlow((f) => ({
        ...f,
        stage1: { status: "error", result: null, errorMessage: outcome.error },
      }));
      return;
    }
    setFlow((f) => ({
      ...f,
      missionId: outcome.data.missionId,
      sourceTypesUsedCount: outcome.data.sourceTypesUsed.length,
      stage1: { status: "complete", result: outcome.data, errorMessage: null },
    }));
    // Auto-open the gap-fill gate the moment Stage 1 lands, if any of
    // payload/range/endurance came back unresolved — before the user ever
    // gets a "Proceed" button to click, so there's no path from here into
    // Stage 2's KPI derivation with a silently-guessed number.
    const missing = getMissingCoreFields(outcome.data.validationFlags);
    setGapWizard(
      missing.length > 0
        ? { active: true, questionIndex: 0, answers: {} }
        : { active: false, questionIndex: 0, answers: {} },
    );
    setGapAnswerDraft("");
  }

  async function proceedToStage2() {
    const { missionId, stage1 } = flow;
    if (!missionId || !stage1.result) return;
    // Fold any gap-wizard answers in as overrides on top of Stage 1's
    // structuredFields — constraintIdentification.ts's STRUCTURED_KPI_OVERRIDES
    // then applies these deterministically, the same override path that
    // already guarantees an explicitly-provided value can't drift, so a
    // field the user just answered here can't drift either.
    const structuredFields = { ...stage1.result.structuredFields };
    for (const [field, answerText] of Object.entries(gapWizard.answers)) {
      const num = parseLeadingNumberClient(answerText as string);
      if (num !== null) structuredFields[BOOST_QUESTIONS[field as CoreField].structuredKey] = num;
    }
    setFlow((f) => ({ ...f, stage2: { status: "running", result: null, errorMessage: null } }));
    const outcome = await callStageApi<Stage2Result>(
      "/api/hangar/process-mission/reasoning-planning",
      {
        missionId,
        extraction: stage1.result.extraction,
        structuredFields,
        attachedRegulations: stage1.result.attachedRegulations,
      },
    );
    if (!outcome.ok) {
      setFlow((f) => ({
        ...f,
        stage2: { status: "error", result: null, errorMessage: outcome.error },
      }));
      return;
    }
    setFlow((f) => ({
      ...f,
      stage2: { status: "complete", result: outcome.data, errorMessage: null },
    }));
  }

  function submitGapAnswer() {
    const missing = flow.stage1.result
      ? getMissingCoreFields(flow.stage1.result.validationFlags)
      : [];
    const field = missing[gapWizard.questionIndex];
    if (!field || !gapAnswerDraft.trim()) return;
    const nextAnswers = { ...gapWizard.answers, [field]: gapAnswerDraft.trim() };
    setGapAnswerDraft("");
    if (gapWizard.questionIndex < missing.length - 1) {
      setGapWizard({
        active: true,
        questionIndex: gapWizard.questionIndex + 1,
        answers: nextAnswers,
      });
      return;
    }
    setGapWizard({ active: false, questionIndex: 0, answers: nextAnswers });
  }

  async function proceedToStage3() {
    const { missionId, stage1, stage2 } = flow;
    if (!missionId || !stage1.result || !stage2.result) return;
    setFlow((f) => ({ ...f, stage3: { status: "running", result: null, errorMessage: null } }));
    const outcome = await callStageApi<Stage3Output>(
      "/api/hangar/process-mission/output-generation",
      {
        missionId,
        detectedIntent: stage1.result.extraction.intent,
        sourceTypesUsedCount: stage1.result.sourceTypesUsed.length,
        validationFlagCount: stage1.result.validationFlags.length,
        operatingEnvironment:
          typeof stage1.result.structuredFields.operating_environment === "string"
            ? stage1.result.structuredFields.operating_environment
            : null,
        decomposedElements: stage2.result.decomposedElements,
        identifiedConstraints: stage2.result.identifiedConstraints,
        derivedKpis: stage2.result.derivedKpis,
        prioritizedTradeoffs: stage2.result.prioritizedTradeoffs,
      },
    );
    if (!outcome.ok) {
      setFlow((f) => ({
        ...f,
        stage3: { status: "error", result: null, errorMessage: outcome.error },
      }));
      return;
    }
    setFlow((f) => ({
      ...f,
      stage3: { status: "complete", result: outcome.data, errorMessage: null },
    }));
  }

  async function proceedToStage4() {
    const { missionId, stage1, stage3 } = flow;
    if (!missionId || !stage1.result || !stage3.result) return;
    setFlow((f) => ({ ...f, stage4: { status: "running", result: null, errorMessage: null } }));
    const outcome = await callStageApi<FinalMissionResponse>(
      "/api/hangar/process-mission/output-interface",
      {
        missionId,
        missionSpecs: stage3.result.missionSpecs,
        constraints: stage3.result.constraints,
        kpis: stage3.result.kpis,
        summary: stage3.result.summary,
        confidenceScore: stage3.result.confidenceScore,
        validation_flags: stage1.result.validationFlags,
      },
    );
    if (!outcome.ok) {
      setFlow((f) => ({
        ...f,
        stage4: { status: "error", result: null, errorMessage: outcome.error },
      }));
      return;
    }
    setFlow((f) => ({
      ...f,
      generatedAt: new Date().toISOString(),
      stage4: { status: "complete", result: outcome.data, errorMessage: null },
    }));
  }

  // Self-contained 4-stage run driven by local variables, not by reading
  // `flow` back between steps — React state updates aren't visible to the
  // next line of the same async function, so this can't just call
  // runStage1()/proceedToStage2()/etc. in sequence the way a manual click
  // does. Used only by the confidence-boost wizard below: a real new
  // mission (own missionId), run start-to-finish automatically instead of
  // gated by "Proceed" clicks, since the user already made the one
  // decision that matters (answering what was missing) and just wants to
  // see the result.
  async function runFullPipeline(
    sources: { source_type: string; raw_input: Record<string, unknown> }[],
  ): Promise<{ ok: true; final: FinalMissionResponse } | { ok: false; error: string }> {
    setFlow(INITIAL_FLOW_STATE);
    setFinalizeState({ status: "idle", errorMessage: null });

    setFlow((f) => ({ ...f, stage1: { status: "running", result: null, errorMessage: null } }));
    const stage1 = await callStageApi<Stage1Result>(
      "/api/hangar/process-mission/input-processing",
      { sources },
    );
    if (!stage1.ok) {
      setFlow((f) => ({
        ...f,
        stage1: { status: "error", result: null, errorMessage: stage1.error },
      }));
      return { ok: false, error: stage1.error };
    }
    setFlow((f) => ({
      ...f,
      missionId: stage1.data.missionId,
      sourceTypesUsedCount: stage1.data.sourceTypesUsed.length,
      stage1: { status: "complete", result: stage1.data, errorMessage: null },
    }));

    setFlow((f) => ({ ...f, stage2: { status: "running", result: null, errorMessage: null } }));
    const stage2 = await callStageApi<Stage2Result>(
      "/api/hangar/process-mission/reasoning-planning",
      {
        missionId: stage1.data.missionId,
        extraction: stage1.data.extraction,
        structuredFields: stage1.data.structuredFields,
        attachedRegulations: stage1.data.attachedRegulations,
      },
    );
    if (!stage2.ok) {
      setFlow((f) => ({
        ...f,
        stage2: { status: "error", result: null, errorMessage: stage2.error },
      }));
      return { ok: false, error: stage2.error };
    }
    setFlow((f) => ({
      ...f,
      stage2: { status: "complete", result: stage2.data, errorMessage: null },
    }));

    setFlow((f) => ({ ...f, stage3: { status: "running", result: null, errorMessage: null } }));
    const stage3 = await callStageApi<Stage3Output>(
      "/api/hangar/process-mission/output-generation",
      {
        missionId: stage1.data.missionId,
        detectedIntent: stage1.data.extraction.intent,
        sourceTypesUsedCount: stage1.data.sourceTypesUsed.length,
        validationFlagCount: stage1.data.validationFlags.length,
        operatingEnvironment:
          typeof stage1.data.structuredFields.operating_environment === "string"
            ? stage1.data.structuredFields.operating_environment
            : null,
        decomposedElements: stage2.data.decomposedElements,
        identifiedConstraints: stage2.data.identifiedConstraints,
        derivedKpis: stage2.data.derivedKpis,
        prioritizedTradeoffs: stage2.data.prioritizedTradeoffs,
      },
    );
    if (!stage3.ok) {
      setFlow((f) => ({
        ...f,
        stage3: { status: "error", result: null, errorMessage: stage3.error },
      }));
      return { ok: false, error: stage3.error };
    }
    setFlow((f) => ({
      ...f,
      stage3: { status: "complete", result: stage3.data, errorMessage: null },
    }));

    setFlow((f) => ({ ...f, stage4: { status: "running", result: null, errorMessage: null } }));
    const stage4 = await callStageApi<FinalMissionResponse>(
      "/api/hangar/process-mission/output-interface",
      {
        missionId: stage1.data.missionId,
        missionSpecs: stage3.data.missionSpecs,
        constraints: stage3.data.constraints,
        kpis: stage3.data.kpis,
        summary: stage3.data.summary,
        confidenceScore: stage3.data.confidenceScore,
        validation_flags: stage1.data.validationFlags,
      },
    );
    if (!stage4.ok) {
      setFlow((f) => ({
        ...f,
        stage4: { status: "error", result: null, errorMessage: stage4.error },
      }));
      return { ok: false, error: stage4.error };
    }
    setFlow((f) => ({
      ...f,
      generatedAt: new Date().toISOString(),
      stage4: { status: "complete", result: stage4.data, errorMessage: null },
    }));

    return { ok: true, final: stage4.data };
  }

  function startBoost() {
    setBoostError(null);
    setBoostWizard({ active: true, questionIndex: 0, answers: {} });
  }

  function cancelBoost() {
    setBoostWizard({ active: false, questionIndex: 0, answers: {} });
  }

  // Shared tail for both boost paths below — builds the requirements_form
  // source from whatever numeric answers it's given and re-runs the real
  // pipeline as a new mission.
  async function runBoostPipeline(structuredAnswers: Record<string, number>) {
    const prevResult = flow.stage4.result;
    setPreviousConfidenceScore(prevResult?.confidence_score ?? null);
    if (prevResult) {
      const prevKpisView = prevResult.kpis as unknown as KpiView[];
      setPreviousKpis(prevKpisView);
      setPreviousBreakdown(
        computeConfidenceBreakdown(
          prevKpisView,
          flow.sourceTypesUsedCount ?? 0,
          prevResult.validation_flags.length,
        ),
      );
    } else {
      setPreviousKpis(null);
      setPreviousBreakdown(null);
    }
    setBoostRunning(true);
    setBoostError(null);

    const sources = [
      { source_type: "natural_language", raw_input: { text: briefText.trim() } },
      ...(Object.keys(structuredAnswers).length > 0
        ? [{ source_type: "requirements_form", raw_input: structuredAnswers }]
        : []),
    ];

    const result = await runFullPipeline(sources);
    setBoostRunning(false);
    if (!result.ok) {
      setBoostError(result.error);
      setPreviousConfidenceScore(null);
      setPreviousBreakdown(null);
      setPreviousKpis(null);
    }
  }

  async function submitBoostAnswer(missingFields: CoreField[], answerText: string) {
    const field = missingFields[boostWizard.questionIndex];
    const nextAnswers = { ...boostWizard.answers, [field]: answerText };

    if (boostWizard.questionIndex < missingFields.length - 1) {
      setBoostWizard({
        active: true,
        questionIndex: boostWizard.questionIndex + 1,
        answers: nextAnswers,
      });
      return;
    }

    // Last question answered — close the wizard and re-run with the
    // answers folded in as a requirements_form source (structured,
    // deterministic) alongside the original brief text (unchanged).
    setBoostWizard({ active: false, questionIndex: 0, answers: {} });
    const structuredAnswers: Record<string, number> = {};
    for (const [field2, answerText2] of Object.entries(nextAnswers)) {
      const num = parseLeadingNumberClient(answerText2 as string);
      if (num !== null) structuredAnswers[BOOST_QUESTIONS[field2 as CoreField].structuredKey] = num;
    }
    await runBoostPipeline(structuredAnswers);
  }

  // All 3 core fields are already present (nothing to ask about), but
  // source completeness is still under its 3-type cap — re-submitting the
  // SAME already-known values as a second, structured source type (instead
  // of only ever the one natural_language brief) is a real increase, not a
  // trick: it moves values from "the LLM inferred this from prose" to
  // "explicitly confirmed," which is exactly what source_completeness
  // (confidenceScore.ts) is measuring. No typing needed, so no wizard step.
  async function boostWithKnownValues(kpis: KpiView[]) {
    const structuredAnswers: Record<string, number> = {};
    for (const field of CORE_FIELDS) {
      const kpi = kpis.find((k) => k.name.trim().toLowerCase() === field);
      const num = kpi ? parseLeadingNumberClient(kpi.target) : null;
      if (num !== null) structuredAnswers[BOOST_QUESTIONS[field].structuredKey] = num;
    }
    await runBoostPipeline(structuredAnswers);
  }

  if (!ready) return null;

  const activeStage = getActiveStage(flow);
  // Nothing started yet — no submission running, no resumed/finished
  // mission being shown. Only in this state does "Plan a new mission"
  // apply as a label, and only in this state does it make sense to
  // collapse the form away by default.
  const isIdle = flow.stage1.status === "pending" && activeStage !== "done";
  const missingCoreFields = flow.stage1.result
    ? getMissingCoreFields(flow.stage1.result.validationFlags)
    : [];

  return (
    <div className="hgr-m">
      <style>{HGR_MISSION_CSS}</style>

      <nav>
        <div className="hgr-m-wrap">
          <div className="hgr-m-crumbs">
            <Link to="/">TorqWings</Link>
            <span className="hgr-m-sep">/</span>
            <Link to="/the-hangar">The Hangar</Link>
            <span className="hgr-m-sep">/</span>
            <span className="hgr-m-cur">Bay 01 — Mission Agent</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {currentUserEmail && (
              <span
                className="hgr-m-mono"
                style={{ fontSize: 12.5, color: "var(--hgr-m-paper-dim)" }}
              >
                Welcome, {currentUserEmail}
              </span>
            )}
            <Link to="/the-hangar/welcome" className="hgr-m-exit">
              ← Back to Hangar
            </Link>
            <Link to="/the-hangar" className="hgr-m-exit">
              Exit site
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <div className="hgr-m-hero">
          <div className="hgr-m-doors">
            <div className="hgr-m-door hgr-m-door-left" />
            <div className="hgr-m-door hgr-m-door-right" />
          </div>
          <div className="hgr-m-wrap">
            <div className="hgr-m-status-row">
              <span className="hgr-m-badge hgr-m-badge-bay">BAY 01 OF 15</span>
              <span
                className={`hgr-m-badge hgr-m-badge-ai hgr-m-badge-ai-${llmStatus}`}
                title={
                  llmStatus === "checking"
                    ? "Checking connection to Anthropic…"
                    : llmStatus === "live"
                      ? "Live — connected to Anthropic (Claude Sonnet 5)"
                      : "Offline — not connected to Anthropic. Stage LLM calls will fall back to mock output."
                }
              >
                <span className="hgr-m-badge-ai-dot" />
                AI
              </span>
            </div>
            <div className="hgr-m-hero-row">
              <h1>Mission Agent</h1>
              <p className="hgr-m-lead">
                The first agent every mission passes through. It takes a brief in plain natural
                language and turns it into a <b>structured, gate-ready spec</b> — payload, range, endurance,
                constraints, KPIs — that Concept Agent and everything downstream builds against.
              </p>
            </div>
          </div>
        </div>

        <section id="process-mission">
          <div className="hgr-m-wrap">
            {missionsListStatus === "error" && <ListFetchError onRetry={fetchMissionsList} />}

            {/* "Your missions" and "+ Plan a new mission" are navigation
                aids for whatever's currently showing below -- the blank
                intake form, a resumed live dashboard, or a read-only past
                mission -- so both stay up here across all three, rather
                than disappearing the moment a finalized mission's detail
                view takes over the content area. */}
            {missionsListStatus !== "error" && missionsList && missionsList.length > 0 && (
              <MissionsListPanel
                missions={missionsList}
                expanded={missionsExpanded}
                onToggleExpanded={() => setMissionsExpanded((v) => !v)}
                onSelect={(m) => {
                  // Collapse the row list once something's picked -- the
                  // spec shows directly below -- but the panel itself (and
                  // its toggle) stays put so switching to a different past
                  // mission is still one click away.
                  setMissionsExpanded(false);
                  if (m.status === "finalized") setSelectedMission(m);
                  else resumeMission(m);
                }}
              />
            )}

            {(!isIdle || selectedMission) && (
              <button type="button" className="hgr-m-plan-new-link" onClick={resetFlow}>
                + Plan a new mission
              </button>
            )}

            {selectedMission ? (
              <PastMissionDetail
                mission={selectedMission}
                onBack={() => setSelectedMission(null)}
              />
            ) : (
              // The "Plan a new mission" collapsible header below only
              // applies before anything has started -- once a mission is
              // running or resumed, that label would be actively wrong
              // (you're not planning a NEW one), so it's shown open and
              // unlabeled instead. The reset link above takes its place
              // once a mission is active, so starting fresh doesn't
              // require scrolling all the way down to the dashboard's own
              // "Start a new mission" action.
              <>
                <div className={isIdle ? "hgr-m-missions-panel" : undefined}>
                {isIdle && (
                  <button
                    type="button"
                    className="hgr-m-missions-panel-title"
                    onClick={() => setPlanExpanded((v) => !v)}
                    aria-expanded={planExpanded}
                  >
                    <span>Plan a new mission</span>
                    <span
                      className={`hgr-m-missions-arrow${planExpanded ? " hgr-m-missions-arrow-open" : ""}`}
                    >
                      ▸
                    </span>
                  </button>
                )}
                {(!isIdle || planExpanded) && (
                  <div className={isIdle ? "hgr-m-plan-panel-body" : undefined}>
                    <div className="hgr-m-stage-tracker">
                      {STAGE_ORDER.map((key) => {
                        const complete =
                          STAGE_ORDER.indexOf(key) < STAGE_ORDER.indexOf(activeStage as StageKey) ||
                          activeStage === "done";
                        const isActive = key === activeStage;
                        const cls = complete
                          ? "hgr-m-stage-tracker-item-complete"
                          : isActive
                            ? "hgr-m-stage-tracker-item-active"
                            : "";
                        return (
                          <div key={key} className={`hgr-m-stage-tracker-item ${cls}`}>
                            <div className="hgr-m-stage-tracker-num">{complete ? "✓" : ""}</div>
                            <div className="hgr-m-stage-tracker-label">{STAGE_TITLES[key]}</div>
                          </div>
                        );
                      })}
                    </div>

                    {activeStage !== "done" && (
                      <>
                        <div className="hgr-m-process-grid">
                          <div>
                            {(flow.stage1.status === "pending" ||
                              flow.stage1.status === "error") && (
                              <form className="hgr-m-intake" onSubmit={submitBrief}>
                                <div className="hgr-m-field">
                                  <label htmlFor="hgrBrief">Mission brief</label>
                                  <textarea
                                    id="hgrBrief"
                                    rows={5}
                                    placeholder="e.g. Need a drone for crop monitoring over 200 hectares, budget under ₹5 lakh, must operate in Tamil Nadu."
                                    value={briefText}
                                    onChange={(e) => setBriefText(e.target.value)}
                                  />
                                </div>
                                <button
                                  type="submit"
                                  className="hgr-m-btn hgr-m-btn-amber"
                                  disabled={!briefText.trim()}
                                >
                                  Process Mission →
                                </button>
                              </form>
                            )}

                            {flow.stage1.status !== "pending" && flow.stage1.status !== "error" && (
                              <div className="hgr-m-intake-summary">
                                <span className="hgr-m-intake-summary-label">Mission brief</span>
                                <p>{briefText}</p>
                              </div>
                            )}

                            {flow.stage1.status === "error" && (
                              <StageErrorCard
                                title="Couldn't process the input."
                                message={flow.stage1.errorMessage}
                                onRetry={runStage1}
                              />
                            )}
                          </div>

                          <div className="hgr-m-status-panel">
                            <div className="hgr-m-status-panel-title">
                              {STAGE_TITLES[activeStage]}
                            </div>
                            {activeStage === "input_processing" &&
                            flow.stage1.status === "running" ? (
                              PROGRESS_STEPS.map((label, i) => {
                                const state =
                                  i < progressStepIdx
                                    ? "done"
                                    : i === progressStepIdx
                                      ? "active"
                                      : "pending";
                                return (
                                  <div
                                    key={label}
                                    className={`hgr-m-status-step hgr-m-status-step-${state}`}
                                  >
                                    <span className="hgr-m-status-icon">
                                      {state === "done" && "✓"}
                                      {state === "active" && (
                                        <span className="hgr-m-status-spinner" />
                                      )}
                                    </span>
                                    <span className="hgr-m-status-text">{label}</span>
                                  </div>
                                );
                              })
                            ) : (
                              <StatusPanelBody flow={flow} activeStage={activeStage} />
                            )}

                            {activeStage === "reasoning_planning" &&
                              flow.stage2.status === "pending" &&
                              gapWizard.active &&
                              missingCoreFields.length > 0 && (
                                <div className="hgr-m-gap-card">
                                  <div className="hgr-m-gap-card-title">
                                    {missingCoreFields.length} key parameter
                                    {missingCoreFields.length > 1 ? "s" : ""} weren't found in your
                                    brief —{" "}
                                    {missingCoreFields
                                      .map((f) =>
                                        f === "endurance"
                                          ? "Endurance (battery life)"
                                          : f.charAt(0).toUpperCase() + f.slice(1),
                                      )
                                      .join(", ")}
                                    . These feed the mission's KPIs directly, so guessing any of
                                    them here would carry an assumption into every stage after this
                                    one.
                                  </div>
                                  <div className="hgr-m-gap-card-question">
                                    Question {gapWizard.questionIndex + 1} of{" "}
                                    {missingCoreFields.length}:{" "}
                                    {
                                      BOOST_QUESTIONS[missingCoreFields[gapWizard.questionIndex]]
                                        .question
                                    }
                                  </div>
                                  <div className="hgr-m-gap-card-row">
                                    <input
                                      type="text"
                                      className="hgr-m-boost-input"
                                      autoFocus
                                      value={gapAnswerDraft}
                                      onChange={(e) => setGapAnswerDraft(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") submitGapAnswer();
                                      }}
                                      placeholder={`e.g. 12 ${BOOST_QUESTIONS[missingCoreFields[gapWizard.questionIndex]].unit}`}
                                    />
                                    <button
                                      type="button"
                                      className="hgr-m-btn hgr-m-btn-amber"
                                      disabled={!gapAnswerDraft.trim()}
                                      onClick={submitGapAnswer}
                                    >
                                      {gapWizard.questionIndex < missingCoreFields.length - 1
                                        ? "Next →"
                                        : "Continue →"}
                                    </button>
                                  </div>
                                </div>
                              )}
                            {activeStage === "reasoning_planning" &&
                              flow.stage2.status === "pending" &&
                              !gapWizard.active && (
                                <ProceedRow
                                  label="Proceed to Reasoning & Planning →"
                                  onClick={proceedToStage2}
                                />
                              )}
                            {activeStage === "reasoning_planning" &&
                              flow.stage2.status === "error" && (
                                <StageErrorCard
                                  title="Couldn't complete Reasoning & Planning."
                                  message={flow.stage2.errorMessage}
                                  onRetry={proceedToStage2}
                                />
                              )}
                            {activeStage === "output_generation" &&
                              flow.stage3.status === "pending" && (
                                <ProceedRow
                                  label="Proceed to Output Generation →"
                                  onClick={proceedToStage3}
                                />
                              )}
                            {activeStage === "output_generation" &&
                              flow.stage3.status === "error" && (
                                <StageErrorCard
                                  title="Couldn't complete Output Generation."
                                  message={flow.stage3.errorMessage}
                                  onRetry={proceedToStage3}
                                />
                              )}
                            {activeStage === "output_interface" &&
                              flow.stage4.status === "pending" && (
                                <ProceedRow
                                  label="Proceed to Output Interface →"
                                  onClick={proceedToStage4}
                                />
                              )}
                            {activeStage === "output_interface" &&
                              flow.stage4.status === "error" && (
                                <StageErrorCard
                                  title="Couldn't complete Output Interface."
                                  message={flow.stage4.errorMessage}
                                  onRetry={proceedToStage4}
                                />
                              )}
                          </div>
                        </div>

                        {/* Findings appear side by side as each stage completes, instead of
                    stacking into a long vertical scroll — each new card fades/slides
                    in as it arrives. */}
                        <div className="hgr-m-findings-track">
                          {flow.stage1.result && <Stage1Findings result={flow.stage1.result} />}
                          {flow.stage2.result && <Stage2Findings result={flow.stage2.result} />}
                          {flow.stage3.result && <Stage3Findings result={flow.stage3.result} />}
                        </div>
                      </>
                    )}

                    {activeStage === "done" && flow.stage4.result && (
                      <>
                        <PhasePreviewStrip flow={flow} />
                        <MissionDashboard
                          result={toMissionResult(flow.stage4.result)}
                          briefText={briefText}
                          generatedAt={flow.generatedAt}
                          telemetry={computeTelemetry(flow)}
                          sourceTypesUsedCount={flow.sourceTypesUsedCount ?? 0}
                          sourceTypesUsed={flow.stage1.result?.sourceTypesUsed ?? null}
                          onStartNew={resetFlow}
                          onEditAndRegenerate={editAndRegenerate}
                          finalizeState={finalizeState}
                          onSaveAsFinal={saveAsFinal}
                          boostWizard={boostWizard}
                          boostRunning={boostRunning}
                          boostError={boostError}
                          previousConfidenceScore={previousConfidenceScore}
                          previousBreakdown={previousBreakdown}
                          previousKpis={previousKpis}
                          onStartBoost={startBoost}
                          onCancelBoost={cancelBoost}
                          onSubmitBoostAnswer={submitBoostAnswer}
                          onBoostWithKnownValues={boostWithKnownValues}
                        />
                      </>
                    )}
                  </div>
                )}
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

// Right-hand panel content for stages 2-4 (not sub-stepped like Stage 1) —
// a single spinner line while running, or a quiet "waiting on you" note
// once the stage is done and sitting on its findings card, waiting for Proceed.
function StatusPanelBody({
  flow,
  activeStage,
}: {
  flow: MissionFlowState;
  activeStage: StageKey | "done";
}) {
  if (activeStage === "done") return null;
  const slot =
    activeStage === "input_processing"
      ? flow.stage1
      : activeStage === "reasoning_planning"
        ? flow.stage2
        : activeStage === "output_generation"
          ? flow.stage3
          : flow.stage4;

  if (slot.status === "running") {
    return (
      <div className="hgr-m-status-step hgr-m-status-step-active">
        <span className="hgr-m-status-icon">
          <span className="hgr-m-status-spinner" />
        </span>
        <span className="hgr-m-status-text">Processing…</span>
      </div>
    );
  }
  if (slot.status === "error") {
    return <p className="hgr-m-status-idle">Stopped — see the error below, then retry.</p>;
  }
  return <p className="hgr-m-status-idle">Waiting for you to review the findings and proceed.</p>;
}

function ProceedRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="hgr-m-proceed-row">
      <button type="button" className="hgr-m-btn hgr-m-btn-amber" onClick={onClick}>
        {label}
      </button>
    </div>
  );
}

// NEW — this list's fetch failure previously rendered nothing at all
// (missionsListStatus !== "error" && ... simply excluded the panel, no
// message, no retry short of reloading). Retrofitted in the same pass
// Bay 03's aircraft-design page introduced this pattern — it isn't
// Bay-03-only.
function ListFetchError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="hgr-m-list-fetch-error">
      <p>Couldn't load this list — check your connection and try again.</p>
      <button type="button" className="hgr-m-btn hgr-m-btn-ghost" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

function StageErrorCard({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="hgr-m-error">
      <b>{title}</b>
      <p>{message}</p>
      <button type="button" className="hgr-m-btn hgr-m-btn-ghost" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

function MockBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="hgr-m-findings-mock">Simulated response — no ANTHROPIC_API_KEY reply</span>
  );
}

// Green = this stage's finding came back from a real Claude call; amber =
// it fell back to that call's mock (see llmGateway.ts's callLlmGateway —
// covers both "no ANTHROPIC_API_KEY" and "the call/parse failed", callers
// can't tell which and don't need to). Same signal MockBadge's text already
// states in words; this is the same at-a-glance color-coding as the "AI"
// live-status badge (Bay 01 header), just per-stage instead of per-page.
function StageStatusBadge({ mock }: { mock: boolean }) {
  return (
    <span
      className={`hgr-m-findings-badge ${mock ? "hgr-m-findings-badge-mock" : "hgr-m-findings-badge-live"}`}
      title={mock ? "Simulated — no ANTHROPIC_API_KEY reply" : "Live — real Claude response"}
    >
      ✓
    </span>
  );
}

// Once the spec is ready, the full stacked findings cards are gone (the
const MISSION_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  processing: "Processing",
  spec_ready: "Spec Ready",
  finalized: "Finalized",
  error: "Error",
};

// "Your missions" — every mission this user has submitted, most recent
// first, so a past spec is always one click away instead of lost the
// moment you start a new brief.
function MissionsListPanel({
  missions,
  expanded,
  onToggleExpanded,
  onSelect,
}: {
  missions: MissionListEntry[];
  expanded: boolean;
  onToggleExpanded: () => void;
  onSelect: (m: MissionListEntry) => void;
}) {
  return (
    <div className="hgr-m-missions-panel">
      <button
        type="button"
        className="hgr-m-missions-panel-title"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
      >
        <span>Your missions ({missions.length})</span>
        <span className={`hgr-m-missions-arrow${expanded ? " hgr-m-missions-arrow-open" : ""}`}>
          ▸
        </span>
      </button>
      {expanded && (
        <div className="hgr-m-missions-list">
          {missions.map((m) => (
            <button
              key={m.missionId}
              type="button"
              className="hgr-m-mission-row"
              onClick={() => onSelect(m)}
            >
              <span className="hgr-m-mission-row-code">{m.missionCode}</span>
              <span className="hgr-m-mission-row-type">{m.missionSpecs?.missionType ?? "—"}</span>
              <span className={`hgr-m-mission-row-status hgr-m-mission-row-status-${m.status}`}>
                {MISSION_STATUS_LABEL[m.status] ?? m.status}
              </span>
              <span className="hgr-m-mission-row-confidence">
                {m.confidenceScore !== null ? `${Math.round(m.confidenceScore * 100)}%` : "—"}
              </span>
              <span className="hgr-m-mission-row-date">
                {new Date(m.createdAt).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Read-only view of a past mission, opened from MissionsListPanel — reuses
// MissionDashboard's section components so a historical spec looks the
// same as the one you just generated. No Save-as-final/Edit-and-regenerate
// here deliberately: those act on "the mission currently in flow," and a
// past mission being viewed isn't that — the one action offered is getting
// back out, either to the list or to a genuinely new brief.
function PastMissionDetail({ mission, onBack }: { mission: MissionListEntry; onBack: () => void }) {
  const hasSpec =
    mission.missionSpecs && mission.constraints && mission.kpis && mission.summary !== null;

  return (
    <div className="hgr-m-dash">
      <div className="hgr-m-dash-header">
        <div>
          <div className="hgr-m-dash-badge">
            {MISSION_STATUS_LABEL[mission.status] ?? mission.status}
          </div>
          <h3>{mission.missionSpecs?.missionType ?? mission.missionCode}</h3>
          <div className="hgr-m-dash-id">
            {mission.missionCode}
            <span className="hgr-m-dash-generated-at"> · Generated {formatGeneratedAt(mission.createdAt)}</span>
          </div>
        </div>
        {mission.confidenceScore !== null && (
          <div className="hgr-m-dash-confidence">
            <div className="hgr-m-dash-confidence-num">
              {Math.round(mission.confidenceScore * 100)}%
            </div>
            <div className="hgr-m-dash-confidence-label">Confidence</div>
            {hasSpec && (
              <Link
                to="/the-hangar/bernoulli"
                search={{ source: "mission", missionId: mission.missionId, sourceId: "" }}
                className="hgr-m-dash-bernoulli-link"
                style={
                  mission.status === "finalized"
                    ? { pointerEvents: "none", opacity: 0.4 }
                    : undefined
                }
                aria-disabled={mission.status === "finalized"}
                title={
                  mission.status === "finalized"
                    ? "This mission is finalized — a physics check on a locked spec isn't useful groundwork anymore."
                    : "Sanity-check this spec's numbers against conservation laws and aerospace empiricals."
                }
              >
                Ask Bernoulli →
              </Link>
            )}
          </div>
        )}
      </div>

      {mission.briefText && (
        <div className="hgr-m-dash-section">
          <h4>Mission Brief (Unprocessed)</h4>
          <p className="hgr-m-dash-brief">{mission.briefText}</p>
        </div>
      )}

      {hasSpec ? (
        <>
          <div className="hgr-m-dash-section">
            <h4>TorqWings Read</h4>
            <p className="hgr-m-dash-summary">{mission.summary}</p>
          </div>
          <div className="hgr-m-dash-section">
            <h4>Mission Specification</h4>
            <SpecFieldsGrid specs={mission.missionSpecs as unknown as MissionSpecsView} />
          </div>
          <div className="hgr-m-dash-section">
            <h4>Constraints ({mission.constraints!.length})</h4>
            <ConstraintsSection constraints={mission.constraints as unknown as ConstraintView[]} />
          </div>
          <div className="hgr-m-dash-section">
            <h4>KPIs &amp; Targets ({mission.kpis!.length})</h4>
            <KpisSection kpis={mission.kpis as unknown as KpiView[]} />
          </div>
        </>
      ) : (
        <div className="hgr-m-dash-section">
          <p className="hgr-m-dash-empty">
            No spec was generated for this mission — its status is "
            {MISSION_STATUS_LABEL[mission.status] ?? mission.status}
            ".
          </p>
        </div>
      )}

      <div className="hgr-m-dash-actions">
        <button type="button" className="hgr-m-btn hgr-m-btn-amber" onClick={onBack}>
          ← Back to your missions
        </button>
      </div>
    </div>
  );
}

// dashboard is the main event) — this keeps each stage's underlying output
// reachable without bringing back the scroll, via a compact tab strip that
// reveals its stage's findings card on hover.
function PhasePreviewStrip({ flow }: { flow: MissionFlowState }) {
  return (
    <div className="hgr-m-phase-strip">
      {flow.stage1.result && (
        <div className="hgr-m-phase-tab">
          <span>01 · Input Processing</span>
          <div className="hgr-m-phase-preview">
            <Stage1Findings result={flow.stage1.result} />
          </div>
        </div>
      )}
      {flow.stage2.result && (
        <div className="hgr-m-phase-tab">
          <span>02 · Reasoning &amp; Planning</span>
          <div className="hgr-m-phase-preview">
            <Stage2Findings result={flow.stage2.result} />
          </div>
        </div>
      )}
      {flow.stage3.result && (
        <div className="hgr-m-phase-tab">
          <span>03 · Output Generation</span>
          <div className="hgr-m-phase-preview">
            <Stage3Findings result={flow.stage3.result} />
          </div>
        </div>
      )}
    </div>
  );
}

function Stage1Findings({ result }: { result: Stage1Result }) {
  return (
    <div className="hgr-m-findings-card">
      <div className="hgr-m-findings-card-head">
        <div className="hgr-m-findings-title">
          <StageStatusBadge mock={result.extraction.mock} />
          Input Processing — findings
        </div>
        <MockBadge show={result.extraction.mock} />
      </div>
      <div className="hgr-m-findings-body">
        <div className="hgr-m-findings-row">
          <b>Intent</b>
          <span>{result.extraction.intent}</span>
        </div>
        <div className="hgr-m-findings-row">
          <b>Payload hint</b>
          <span>{result.extraction.payloadHint ?? "—"}</span>
        </div>
        <div className="hgr-m-findings-row">
          <b>Range hint</b>
          <span>{result.extraction.rangeHint ?? "—"}</span>
        </div>
        <div className="hgr-m-findings-row">
          <b>Endurance hint</b>
          <span>{result.extraction.enduranceHint ?? "—"}</span>
        </div>
        {result.extraction.constraintHints.length > 0 && (
          <div className="hgr-m-findings-row">
            <b>Constraint hints</b>
            <div className="hgr-m-findings-chips">
              {result.extraction.constraintHints.map((c) => (
                <span key={c} className="hgr-m-findings-chip">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
        {result.validationFlags.length > 0 && (
          <div className="hgr-m-findings-row">
            <b>Validation flags</b>
            <div className="hgr-m-findings-chips">
              {result.validationFlags.map((f) => (
                <span key={f} className="hgr-m-findings-chip">
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stage2Findings({ result }: { result: Stage2Result }) {
  return (
    <div className="hgr-m-findings-card">
      <div className="hgr-m-findings-card-head">
        <div className="hgr-m-findings-title">
          <StageStatusBadge mock={result.mock} />
          Reasoning & Planning — findings
        </div>
        <MockBadge show={result.mock} />
      </div>
      <div className="hgr-m-findings-body">
        <div className="hgr-m-findings-row">
          <b>Decomposed elements</b>
          <div className="hgr-m-findings-chips">
            {result.decomposedElements.map((e) => (
              <span key={e} className="hgr-m-findings-chip">
                {e}
              </span>
            ))}
          </div>
        </div>
        <div className="hgr-m-findings-row">
          <b>Constraints ({result.identifiedConstraints.length})</b>
          <div className="hgr-m-findings-chips">
            {result.identifiedConstraints.map((c, i) => (
              <span key={i} className="hgr-m-findings-chip">
                {c.name}: {c.value}
              </span>
            ))}
          </div>
        </div>
        <div className="hgr-m-findings-row">
          <b>KPIs ({result.derivedKpis.length})</b>
          <div className="hgr-m-findings-chips">
            {result.derivedKpis.map((k, i) => (
              <span key={i} className="hgr-m-findings-chip">
                {k.name}: {formatKpiDisplay(k.name, k.target, k.unit)}
              </span>
            ))}
          </div>
        </div>
        <div className="hgr-m-findings-row">
          <b>Trade-offs</b>
          <div className="hgr-m-findings-chips">
            {result.prioritizedTradeoffs.map((t, i) => (
              <span key={i} className="hgr-m-findings-chip">
                {t.item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stage3Findings({ result }: { result: Stage3Output }) {
  return (
    <div className="hgr-m-findings-card">
      <div className="hgr-m-findings-card-head">
        <div className="hgr-m-findings-title">
          <StageStatusBadge mock={result.mock} />
          Output Generation — findings
        </div>
        <MockBadge show={result.mock} />
      </div>
      <div className="hgr-m-findings-body">
        <div className="hgr-m-findings-row">
          <b>Mission type</b>
          <span>{result.missionSpecs.missionType}</span>
        </div>
        <div className="hgr-m-findings-row">
          <b>Vertical</b>
          <span>{result.missionSpecs.vertical ?? "—"}</span>
        </div>
        <div className="hgr-m-findings-row">
          <b>Confidence</b>
          <span>{Math.round(result.confidenceScore * 100)}%</span>
        </div>
        <div className="hgr-m-findings-row">
          <b>Summary</b>
          <span>{result.summary}</span>
        </div>
      </div>
    </div>
  );
}

// Dashboard View — MissionAgent.md Section 13.1's 7 sections, in reading
// order: header strip, summary, spec, constraints, KPIs, validation notes
// (if any), actions.
function MissionDashboard({
  result,
  briefText,
  generatedAt,
  telemetry,
  sourceTypesUsedCount,
  sourceTypesUsed,
  onStartNew,
  onEditAndRegenerate,
  finalizeState,
  onSaveAsFinal,
  boostWizard,
  boostRunning,
  boostError,
  previousConfidenceScore,
  previousBreakdown,
  previousKpis,
  onStartBoost,
  onCancelBoost,
  onSubmitBoostAnswer,
  onBoostWithKnownValues,
}: {
  result: MissionResult;
  briefText: string;
  generatedAt: string | null;
  telemetry: MissionTelemetry | null;
  sourceTypesUsedCount: number;
  // The real distinct SourceType values used this run (see
  // types/hangar-mission.ts) — only available for a mission run THIS
  // session (Stage 1's own result), same resumed-mission limitation as
  // generatedAt/telemetry. null falls back to anonymous count-only slots.
  sourceTypesUsed: SourceType[] | null;
  onStartNew: () => void;
  onEditAndRegenerate: () => void;
  finalizeState: { status: "idle" | "saving" | "saved" | "error"; errorMessage: string | null };
  onSaveAsFinal: () => void;
  boostWizard: {
    active: boolean;
    questionIndex: number;
    answers: Partial<Record<CoreField, string>>;
  };
  boostRunning: boolean;
  boostError: string | null;
  previousConfidenceScore: number | null;
  previousBreakdown: ConfidenceBreakdown | null;
  previousKpis: KpiView[] | null;
  onStartBoost: () => void;
  onCancelBoost: () => void;
  onSubmitBoostAnswer: (missingFields: CoreField[], answerText: string) => void;
  onBoostWithKnownValues: (kpis: KpiView[]) => void;
}) {
  const confidenceBreakdown = computeConfidenceBreakdown(
    result.kpis,
    sourceTypesUsedCount,
    result.validationFlags.length,
  );
  const [boostAnswerDraft, setBoostAnswerDraft] = useState("");
  const hasMissingFields = confidenceBreakdown.missingFields.length > 0;
  // Even with all 3 core fields already found, source completeness
  // (confidenceScore.ts) is capped by how many distinct source TYPES were
  // used — today that's realistically 1 (just the brief) unless a boost
  // has already added a requirements_form source, so there's still a real
  // lever to pull up to that 3-type cap.
  const canBoost =
    !boostRunning && (hasMissingFields || confidenceBreakdown.sourceTypesUsedCount < 3);

  return (
    <div className="hgr-m-dash">
      <TelemetryBar telemetry={telemetry} />

      {/* 1. Header strip */}
      <div className="hgr-m-dash-header">
        <div>
          <div className="hgr-m-dash-badge">Spec Ready</div>
          <h3>{result.missionSpecs.missionType}</h3>
          <div className="hgr-m-dash-id">
            {result.missionCode}
            {generatedAt && (
              <span className="hgr-m-dash-generated-at"> · Generated {formatGeneratedAt(generatedAt)}</span>
            )}
          </div>
        </div>
        <div className="hgr-m-dash-confidence">
          <div className="hgr-m-dash-confidence-top-row">
            <div className="hgr-m-dash-confidence-num">
              {Math.round(result.confidenceScore * 100)}%
            </div>
            {canBoost && !boostWizard.active && (
              <button
                type="button"
                className="hgr-m-boost-arrow"
                onClick={() =>
                  hasMissingFields ? onStartBoost() : onBoostWithKnownValues(result.kpis)
                }
                title={
                  hasMissingFields
                    ? "Answer what's missing to increase this score"
                    : "Confirm the values already found as structured input, to increase source completeness"
                }
              >
                ↑
              </button>
            )}
          </div>
          {previousConfidenceScore !== null && (
            <div className="hgr-m-boost-delta">
              {Math.round(previousConfidenceScore * 100)}% →{" "}
              {Math.round(result.confidenceScore * 100)}%
            </div>
          )}
          <div className="hgr-m-dash-confidence-label-row">
            <span className="hgr-m-dash-confidence-label">Confidence</span>
            <span className="hgr-m-info-tip">
              <span className="hgr-m-info-icon">?</span>
              <span className="hgr-m-info-panel">
                <span className="hgr-m-info-panel-inner">
                  <b>The basic logic</b>
                  <p>
                    40% source completeness (how many of your input types were used, out of 3
                    possible) + 40% field completeness (whether payload, range, and endurance were
                    all successfully extracted) − 5% for each validation flag raised.
                  </p>
                  <b className="hgr-m-info-panel-subhead">Applied to this mission</b>
                  <p>
                    Source completeness: {confidenceBreakdown.sourceTypesUsedCount}/3 input types
                    used → {confidenceBreakdown.sourceCompletenessPct}%.
                    <br />
                    Field completeness: {confidenceBreakdown.foundFields.length}/3 core fields found
                    {confidenceBreakdown.foundFields.length > 0 &&
                      ` (${confidenceBreakdown.foundFields.join(", ")})`}{" "}
                    → {confidenceBreakdown.fieldCompletenessPct}%.
                    <br />
                    Validation flags: {confidenceBreakdown.validationFlagCount} → −
                    {confidenceBreakdown.penaltyPct}%.
                  </p>
                </span>
              </span>
            </span>
          </div>
          <Link
            to="/the-hangar/bernoulli"
            search={{ source: "mission", missionId: result.missionId, sourceId: "" }}
            className="hgr-m-dash-bernoulli-link"
            style={
              finalizeState.status === "saved" ? { pointerEvents: "none", opacity: 0.4 } : undefined
            }
            aria-disabled={finalizeState.status === "saved"}
            title={
              finalizeState.status === "saved"
                ? "This mission is finalized — a physics check on a locked spec isn't useful groundwork anymore."
                : "Sanity-check this spec's numbers against conservation laws and aerospace empiricals."
            }
          >
            Ask Bernoulli →
          </Link>
        </div>
      </div>

      {previousConfidenceScore !== null && previousBreakdown && (
        <div className="hgr-m-boost-explain">
          <b>Why the score changed</b>
          <ul>
            {previousBreakdown.sourceCompletenessPct !==
              confidenceBreakdown.sourceCompletenessPct && (
              <li>
                Source completeness: {previousBreakdown.sourceCompletenessPct}% →{" "}
                {confidenceBreakdown.sourceCompletenessPct}% (
                {previousBreakdown.sourceTypesUsedCount}/3 →{" "}
                {confidenceBreakdown.sourceTypesUsedCount}/3 input types used)
              </li>
            )}
            {previousBreakdown.fieldCompletenessPct !==
              confidenceBreakdown.fieldCompletenessPct && (
              <li>
                Field completeness: {previousBreakdown.fieldCompletenessPct}% →{" "}
                {confidenceBreakdown.fieldCompletenessPct}% ({previousBreakdown.foundFields.length}
                /3 → {confidenceBreakdown.foundFields.length}/3 core fields found)
              </li>
            )}
            {previousBreakdown.penaltyPct !== confidenceBreakdown.penaltyPct && (
              <li>
                Validation flag penalty: −{previousBreakdown.penaltyPct}% → −
                {confidenceBreakdown.penaltyPct}% ({previousBreakdown.validationFlagCount} →{" "}
                {confidenceBreakdown.validationFlagCount} flags)
              </li>
            )}
          </ul>
          <div className="hgr-m-boost-fields">
            {getFieldChanges(previousKpis, result.kpis).map((fc) => (
              <div key={fc.field} className="hgr-m-boost-field-row">
                <span className="hgr-m-boost-field-label">{fc.label}</span>
                {!fc.changed ? (
                  <span className="hgr-m-boost-field-detail">
                    Unchanged — <b>{fc.newDisplay}</b>, already correctly found in the first pass.
                    The score moved because this value is now explicit structured input instead of
                    text the model had to infer, which is what source completeness measures.
                  </span>
                ) : fc.prevDisplay === null ? (
                  <span className="hgr-m-boost-field-detail">
                    Missing in the first pass — not stated clearly enough in your original brief for
                    the model to extract it with confidence. Now <b>{fc.newDisplay}</b>, provided
                    directly.
                  </span>
                ) : (
                  <span className="hgr-m-boost-field-detail">
                    Was <b>{fc.prevDisplay}</b> (inferred from your brief) → now{" "}
                    <b>{fc.newDisplay}</b> (confirmed directly).
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {boostWizard.active && (
        <div className="hgr-m-boost-card">
          <div className="hgr-m-boost-card-question">
            Question {boostWizard.questionIndex + 1} of {confidenceBreakdown.missingFields.length}:{" "}
            {
              BOOST_QUESTIONS[
                confidenceBreakdown.missingFields[boostWizard.questionIndex] as CoreField
              ].question
            }
          </div>
          <div className="hgr-m-boost-card-row">
            <input
              type="text"
              className="hgr-m-boost-input"
              autoFocus
              value={boostAnswerDraft}
              onChange={(e) => setBoostAnswerDraft(e.target.value)}
              placeholder={`e.g. 12 ${BOOST_QUESTIONS[confidenceBreakdown.missingFields[boostWizard.questionIndex] as CoreField].unit}`}
            />
            <button
              type="button"
              className="hgr-m-btn hgr-m-btn-amber"
              disabled={!boostAnswerDraft.trim()}
              onClick={() => {
                onSubmitBoostAnswer(
                  confidenceBreakdown.missingFields as CoreField[],
                  boostAnswerDraft.trim(),
                );
                setBoostAnswerDraft("");
              }}
            >
              {boostWizard.questionIndex < confidenceBreakdown.missingFields.length - 1
                ? "Next →"
                : "Boost confidence →"}
            </button>
            <button type="button" className="hgr-m-btn hgr-m-btn-ghost" onClick={onCancelBoost}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {boostRunning && (
        <div className="hgr-m-boost-running">
          <span className="hgr-m-status-spinner" />
          Re-running the pipeline with your answers — a new mission, real LLM calls, so this can
          take a minute…
        </div>
      )}

      {boostError && (
        <p className="hgr-m-dash-finalize-error">Couldn't re-run with your answers: {boostError}</p>
      )}

      {/* Original brief, as submitted */}
      <div className="hgr-m-dash-section">
        <h4>Mission Brief (Unprocessed)</h4>
        <p className="hgr-m-dash-brief">{briefText}</p>
      </div>

      {/* 2. Mission Summary */}
      <div className="hgr-m-dash-section">
        <h4>TorqWings Read</h4>
        <p className="hgr-m-dash-summary">{result.summary}</p>
      </div>

      {/* 3. Mission Specification */}
      <div className="hgr-m-dash-section">
        <h4>Mission Specification</h4>
        <SpecFieldsGrid specs={result.missionSpecs} />
      </div>

      {/* 4. Constraints */}
      <div className="hgr-m-dash-section">
        <h4>Constraints ({result.constraints.length})</h4>
        <ConstraintsSection constraints={result.constraints} />
      </div>

      {/* Confidence breakdown — the same 40/40/−5×n formula the header's "?"
          tooltip already states in words, made visible without a hover so
          it's something to glance at (and optimize against) directly. */}
      <div className="hgr-m-dash-section">
        <h4>Confidence Breakdown</h4>
        <ConfidenceBreakdownBars
          breakdown={confidenceBreakdown}
          score={result.confidenceScore}
          sourceTypesUsed={sourceTypesUsed}
        />
      </div>

      {/* 5. KPIs & Targets */}
      <div className="hgr-m-dash-section">
        <h4>KPIs &amp; Targets ({result.kpis.length})</h4>
        <KpisSection kpis={result.kpis} />
      </div>

      {/* 6. Validation flags (if any) */}
      {result.validationFlags.length > 0 && (
        <div className="hgr-m-dash-section">
          <h4>Validation Notes ({result.validationFlags.length})</h4>
          <ul className="hgr-m-dash-flags">
            {result.validationFlags.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 7. Actions */}
      <div className="hgr-m-dash-actions">
        <button
          type="button"
          className={`hgr-m-btn ${finalizeState.status === "saved" ? "hgr-m-btn-ghost" : "hgr-m-btn-amber"}`}
          onClick={onSaveAsFinal}
          disabled={finalizeState.status === "saving" || finalizeState.status === "saved"}
          title="Confirms this version as final — a status flip on the mission record, not a new row (Section 13.2)."
        >
          {finalizeState.status === "saving"
            ? "Saving…"
            : finalizeState.status === "saved"
              ? "Saved as final ✓"
              : "Save as final"}
        </button>
        <button
          type="button"
          className="hgr-m-btn hgr-m-btn-ghost"
          onClick={onEditAndRegenerate}
          title="Reopens your brief for editing. Resubmitting creates a new mission (Section 13.2's true version-2-of-the-same-mission flow isn't built yet)."
        >
          Edit and regenerate
        </button>
        <Link
          to="/the-hangar/concept"
          className="hgr-m-btn hgr-m-btn-ghost"
          style={{ textDecoration: "none" }}
        >
          Continue to Concept Agent →
        </Link>
        <button type="button" className="hgr-m-btn hgr-m-btn-amber" onClick={onStartNew}>
          Start a new mission
        </button>
        <Link
          to="/the-hangar/bernoulli"
          search={{ source: "mission", missionId: result.missionId, sourceId: "" }}
          className="hgr-m-btn hgr-m-dash-bernoulli-link"
          style={
            finalizeState.status === "saved" ? { pointerEvents: "none", opacity: 0.4 } : undefined
          }
          aria-disabled={finalizeState.status === "saved"}
          title={
            finalizeState.status === "saved"
              ? "This mission is finalized — a physics check on a locked spec isn't useful groundwork anymore."
              : "Sanity-check this spec's numbers against conservation laws and aerospace empiricals."
          }
        >
          Ask Bernoulli →
        </Link>
      </div>
      {finalizeState.status === "error" && (
        <p className="hgr-m-dash-finalize-error">
          Couldn't save as final: {finalizeState.errorMessage}
        </p>
      )}
    </div>
  );
}

// Extracted from MissionDashboard so PastMissionDetail (the "Your missions"
// history view) can render the same spec/constraints/KPI presentation
// without duplicating it.

function SpecFieldsGrid({ specs }: { specs: MissionSpecsView }) {
  return (
    <div className="hgr-m-dash-fields">
      <DashField label="Domain" value={specs.domain} />
      <DashField label="Vertical" value={specs.vertical} />
      <DashField label="Vehicle Class" value={specs.vehicleClass} />
      <DashField label="Mission Type" value={specs.missionType} />
      <DashField label="Phase" value={specs.phase} />
      <DashField label="Operating Environment" value={specs.operatingEnvironment} />
    </div>
  );
}

function ConstraintsSection({ constraints }: { constraints: ConstraintView[] }) {
  if (constraints.length === 0)
    return <p className="hgr-m-dash-empty">No constraints identified.</p>;
  return (
    <>
      {groupConstraints(constraints).map((group) => (
        <div key={group.label} className="hgr-m-dash-constraint-group">
          <div className="hgr-m-dash-constraint-group-label">
            {group.label} ({group.items.length})
          </div>
          {subGroupBySourceLabel(group.items).map((sub) => (
            <div key={sub.tag} className="hgr-m-dash-constraint-subgroup">
              <div className="hgr-m-dash-constraint-subgroup-label" title={sub.tag}>
                {describeSourceTag(sub.tag)} ({sub.items.length})
              </div>
              <div className="hgr-m-dash-constraints">
                {sub.items.map((c, i) => {
                  // The subheading above already carries this exact tag —
                  // repeating it (or the coarse group label) under every
                  // single row too is redundant. Any OTHER tags this
                  // constraint also carries (it can have more than one —
                  // see subGroupBySourceLabel) still show, since those are
                  // real additional signal.
                  const extraSources = c.sources.slice(1);
                  return (
                    <div key={i} className="hgr-m-dash-constraint">
                      <div className="hgr-m-dash-constraint-num">{i + 1}</div>
                      <div className="hgr-m-dash-constraint-body">
                        <div className="hgr-m-dash-constraint-main">
                          <b>{c.name}</b>: {c.value}
                        </div>
                        {extraSources.length > 0 && (
                          <div className="hgr-m-dash-tags">
                            {extraSources.map((s) => (
                              <span key={s} className="hgr-m-dash-tag" title={s}>
                                {describeSourceTag(s)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

// All 6 real SourceType values (types/hangar-mission.ts) — only
// "natural_language" (the brief textarea) and "requirements_form" (the
// confidence-boost wizard) are actually reachable from this UI today;
// document/existing_project/regulations/market_data have parser-level
// plumbing (missionSourceParsing.ts) but no client path that ever sends
// that source_type yet. Labeled here anyway so a slot that IS used always
// names itself correctly, whichever type it turns out to be.
const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  natural_language: "Brief text",
  document: "Document",
  requirements_form: "Requirements form",
  existing_project: "Existing project",
  regulations: "Regulations",
  market_data: "Market data",
};

// Same formula the header's "?" info-tip already spells out in words
// (confidenceScore.ts: 40% source completeness + 40% field completeness −
// 5% per validation flag) — this just makes it visible as bars instead of
// requiring a hover, so it's something to glance at while deciding what to
// fix (e.g. answer a missing core field, or confirm a value as structured
// input) to actually raise the score.
function ConfidenceBreakdownBars({
  breakdown,
  score,
  sourceTypesUsed,
}: {
  breakdown: ConfidenceBreakdown;
  score: number;
  sourceTypesUsed: SourceType[] | null;
}) {
  return (
    <div className="hgr-m-confbars">
      <div className="hgr-m-confbar-row">
        <div className="hgr-m-confbar-head">
          <span className="hgr-m-confbar-label">
            Source completeness ({breakdown.sourceTypesUsedCount}/3 input types, 40% max)
          </span>
          <span className="hgr-m-confbar-value">
            +{Math.round(breakdown.sourceCompletenessPct * 0.4)}%
          </span>
        </div>
        {/* 3 is the formula's own cap (confidenceScore.ts) — reaching any 3
            DISTINCT source types (of 6 real ones) earns full credit here,
            not 3 specific named types. Each slot shows the real type name
            when we know it (a mission run this session — sourceTypesUsed
            not null); for a resumed mission (sourceTypesUsed null) it
            falls back to the plain count, since we only know how many
            types were used, not which ones. */}
        <div className="hgr-m-confbar-slots">
          {[0, 1, 2].map((i) => {
            const type = sourceTypesUsed?.[i];
            const achieved = sourceTypesUsed ? Boolean(type) : i < breakdown.sourceTypesUsedCount;
            const label = type ? SOURCE_TYPE_LABEL[type] : achieved ? "Used" : "Not yet added";
            return (
              <div
                key={i}
                className={`hgr-m-confbar-slot${achieved ? " hgr-m-confbar-slot-yes" : " hgr-m-confbar-slot-no"}`}
                title={achieved ? undefined : "Adding another input type (e.g. requirements form) earns credit here"}
              >
                {label}
              </div>
            );
          })}
        </div>
      </div>
      <div className="hgr-m-confbar-row">
        <div className="hgr-m-confbar-head">
          <span className="hgr-m-confbar-label">
            Field completeness ({breakdown.foundFields.length}/3 core fields, 40% max)
          </span>
          <span className="hgr-m-confbar-value">
            +{Math.round(breakdown.fieldCompletenessPct * 0.4)}%
          </span>
        </div>
        {/* Unlike source completeness, the exact 3 fields are known — so
            each slot is named and independently true/false, not just a
            count. */}
        <div className="hgr-m-confbar-slots">
          {CORE_FIELDS.map((field) => {
            const found = breakdown.foundFields.includes(field);
            return (
              <div
                key={field}
                className={`hgr-m-confbar-slot${found ? " hgr-m-confbar-slot-yes" : " hgr-m-confbar-slot-no"}`}
              >
                {field.charAt(0).toUpperCase() + field.slice(1)}
              </div>
            );
          })}
        </div>
      </div>
      <div className="hgr-m-confbar-row">
        <div className="hgr-m-confbar-head">
          <span className="hgr-m-confbar-label">
            Validation flags ({breakdown.validationFlagCount} raised)
          </span>
          <span className="hgr-m-confbar-value">−{breakdown.penaltyPct}%</span>
        </div>
        <div className="hgr-m-confbar-track">
          <div
            className="hgr-m-confbar-fill hgr-m-confbar-fill-penalty"
            style={{ width: `${Math.min(breakdown.penaltyPct * 4, 100)}%` }}
          />
        </div>
      </div>
      <div className="hgr-m-confbar-total">
        <span>Confidence score</span>
        <b>{Math.round(score * 100)}%</b>
      </div>
    </div>
  );
}

// "Instrument Row" layout — one row per KPI: tier badge on the left, then
// KPI (eyebrow + name) and Target (eyebrow + value, right-aligned) as two
// explicitly labeled fields, not one blended name+number line. Gate-tier/
// ranked stat pair up top gives the composition before the reader even
// reaches the list.
function KpisSection({ kpis }: { kpis: KpiView[] }) {
  if (kpis.length === 0) return <p className="hgr-m-dash-empty">No KPIs derived.</p>;
  const criticalKpis = kpis.filter((k) => k.priority === "critical");
  const rankedKpis = kpis
    .filter((k) => k.priority !== "critical")
    .sort((a, b) => (a.priority as number) - (b.priority as number));
  const orderedKpis = [...criticalKpis, ...rankedKpis];
  return (
    <>
      <div className="hgr-m-dash-kpi-stats">
        <div className="hgr-m-dash-kpi-stat hgr-m-dash-kpi-stat-gate">
          <b>{criticalKpis.length}</b>
          <span>Gate-tier</span>
        </div>
        <div className="hgr-m-dash-kpi-stat hgr-m-dash-kpi-stat-ranked">
          <b>{rankedKpis.length}</b>
          <span>Ranked</span>
        </div>
      </div>
      <div className="hgr-m-dash-kpis">
        {orderedKpis.map((k, i) => (
          <div key={i} className="hgr-m-dash-kpi-row">
            <div className={`hgr-m-dash-kpi-tier${k.priority === "critical" ? " hgr-m-dash-kpi-tier-gate" : ""}`}>
              {k.priority === "critical" ? "GATE" : `P${k.priority}`}
            </div>
            <div className="hgr-m-dash-kpi-field">
              <div className="hgr-m-dash-kpi-eyebrow">KPI</div>
              <div className="hgr-m-dash-kpi-name">{k.name}</div>
            </div>
            <div className="hgr-m-dash-kpi-target-field">
              <div className="hgr-m-dash-kpi-eyebrow">Target</div>
              <div
                className={`hgr-m-dash-kpi-target-value${k.priority === "critical" ? " hgr-m-dash-kpi-target-value-gate" : ""}`}
              >
                {formatKpiDisplay(k.name, k.target, k.unit)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function DashField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="hgr-m-dash-field">
      <div className="hgr-m-dash-field-label">{label}</div>
      <div className="hgr-m-dash-field-value">{value ?? "—"}</div>
    </div>
  );
}

const HGR_MISSION_CSS = `
.hgr-m{
  --hgr-m-navy-deep:#08131F; --hgr-m-navy-panel:#0F2136; --hgr-m-navy-panel-2:#132A44;
  --hgr-m-blue-line:#3E7CA6; --hgr-m-blue-bright:#6FB4E0;
  --hgr-m-amber:#E8A33D; --hgr-m-amber-bright:#F6C374;
  --hgr-m-bernoulli:#9B7FE8; --hgr-m-bernoulli-bright:#B6A2F2;
  --hgr-m-paper:#ECEFF3; --hgr-m-paper-dim:#8FA5BB;
  --hgr-m-grid:rgba(111,180,224,0.08); --hgr-m-hairline:rgba(111,180,224,0.20);

  background:var(--hgr-m-navy-deep); color:var(--hgr-m-paper); font-family:'IBM Plex Sans', sans-serif;
  background-image:linear-gradient(var(--hgr-m-grid) 1px, transparent 1px), linear-gradient(90deg, var(--hgr-m-grid) 1px, transparent 1px);
  background-size:44px 44px;
  min-height:100vh;
}
.hgr-m *{ box-sizing:border-box; }
.hgr-m h1,.hgr-m h2,.hgr-m h3{ font-family:'Space Grotesk', sans-serif; font-weight:600; letter-spacing:-0.01em; margin:0; }
.hgr-m-mono{ font-family:'IBM Plex Mono', monospace; }
.hgr-m-wrap{ max-width:1180px; margin:0 auto; padding:0 32px; }
.hgr-m a{ color:inherit; }

.hgr-m nav{ border-bottom:1px solid var(--hgr-m-hairline); position:sticky; top:0; background:rgba(8,19,31,0.9); backdrop-filter:blur(8px); z-index:20; }
.hgr-m nav .hgr-m-wrap{ display:flex; align-items:center; justify-content:space-between; height:68px; }
.hgr-m-crumbs{ font-size:14px; color:var(--hgr-m-paper-dim); display:flex; align-items:center; gap:8px; }
.hgr-m-crumbs a{ text-decoration:none; color:var(--hgr-m-paper-dim); }
.hgr-m-crumbs a:hover{ color:var(--hgr-m-blue-bright); }
.hgr-m-sep{ color:var(--hgr-m-blue-line); }
.hgr-m-cur{ color:var(--hgr-m-paper); font-weight:500; }
.hgr-m-exit{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-m-paper-dim); text-decoration:none; border:1px solid var(--hgr-m-hairline); padding:8px 15px; border-radius:2px; }
.hgr-m-exit:hover{ color:var(--hgr-m-paper); border-color:var(--hgr-m-blue-bright); }

.hgr-m main{ padding-bottom:100px; }

.hgr-m-hero{ padding:56px 0 20px; border-bottom:1px solid var(--hgr-m-hairline); position:relative; overflow:hidden; }
.hgr-m-doors{ position:absolute; inset:0; z-index:5; display:flex; pointer-events:none; }
.hgr-m-door{ flex:1; background: repeating-linear-gradient(90deg, #0C1E30 0 78px, #08131F 78px 80px); position:relative; }
.hgr-m-door::after{ content:""; position:absolute; top:0; bottom:0; width:2px; background:var(--hgr-m-blue-line); opacity:.5; }
.hgr-m-door-left{ animation: hgr-m-openLeft 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
.hgr-m-door-right{ animation: hgr-m-openRight 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
.hgr-m-door-left::after{ right:0; }
.hgr-m-door-right::after{ left:0; }
@keyframes hgr-m-openLeft{ from{ transform:translateX(0);} to{ transform:translateX(-100%);} }
@keyframes hgr-m-openRight{ from{ transform:translateX(0);} to{ transform:translateX(100%);} }
@media (prefers-reduced-motion: reduce){ .hgr-m-doors{ display:none; } }
.hgr-m-status-row{ display:flex; align-items:center; gap:12px; margin-top:-12px; margin-bottom:22px; flex-wrap:wrap; }
.hgr-m-badge{
  font-family:'IBM Plex Mono',monospace; font-size:11.5px; letter-spacing:.1em; text-transform:uppercase;
  padding:6px 13px; border-radius:2px; display:inline-flex; align-items:center; gap:8px;
}
.hgr-m-badge-bay{ color:var(--hgr-m-paper-dim); border:1px solid var(--hgr-m-hairline); }
.hgr-m-badge-ai{ font-weight:700; }
.hgr-m-badge-ai-dot{ width:7px; height:7px; border-radius:50%; flex-shrink:0; }
.hgr-m-badge-ai-checking{ color:var(--hgr-m-paper-dim); border:1px solid var(--hgr-m-hairline); }
.hgr-m-badge-ai-checking .hgr-m-badge-ai-dot{ background:var(--hgr-m-paper-dim); }
.hgr-m-badge-ai-live{ color:#4ADE80; border:1px solid rgba(74,222,128,.4); background:rgba(74,222,128,.08); }
.hgr-m-badge-ai-live .hgr-m-badge-ai-dot{ background:#4ADE80; box-shadow:0 0 6px rgba(74,222,128,.8); animation:hgr-m-ai-pulse 2s ease-in-out infinite; }
.hgr-m-badge-ai-offline{ color:var(--hgr-m-amber); border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); }
.hgr-m-badge-ai-offline .hgr-m-badge-ai-dot{ background:var(--hgr-m-amber); box-shadow:0 0 6px rgba(232,163,61,.6); }
@keyframes hgr-m-ai-pulse{ 0%,100%{ opacity:1; } 50%{ opacity:.4; } }

.hgr-m-hero-row{ display:flex; align-items:center; gap:48px; flex-wrap:wrap; }
@media(max-width:760px){ .hgr-m-hero-row{ flex-direction:column; align-items:flex-start; gap:16px; } }
.hgr-m-hero h1{ font-size:clamp(34px,5vw,58px); margin:0; flex-shrink:0; }
.hgr-m-hero .hgr-m-lead{ color:var(--hgr-m-paper-dim); font-size:15.5px; max-width:480px; line-height:1.6; margin:0; flex:1; min-width:280px; }
.hgr-m-hero .hgr-m-lead b{ color:var(--hgr-m-paper); font-weight:600; }

.hgr-m section{ padding:60px 0; border-bottom:1px solid var(--hgr-m-hairline); }
#process-mission{ padding-top:32px; }
.hgr-m-kicker{ font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--hgr-m-amber); margin-bottom:12px; }
.hgr-m-sec-title{ font-size:clamp(22px,2.6vw,30px); margin-bottom:10px; }
.hgr-m-sec-sub{ color:var(--hgr-m-paper-dim); font-size:14.5px; max-width:600px; margin-bottom:36px; }

.hgr-m-chip-groups{ display:grid; grid-template-columns:1fr 1fr; gap:40px; }
@media(max-width:760px){ .hgr-m-chip-groups{ grid-template-columns:1fr; } }
.hgr-m-chip-group h4{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-m-paper-dim); margin-bottom:14px; }
.hgr-m-chips{ display:flex; flex-wrap:wrap; gap:9px; }
.hgr-m-chip{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-m-paper-dim); border:1px solid var(--hgr-m-hairline); padding:7px 13px; border-radius:2px; }

.hgr-m-contract{ display:grid; grid-template-columns:1fr 1fr; gap:1px; background:var(--hgr-m-hairline); border:1px solid var(--hgr-m-hairline); }
@media(max-width:760px){ .hgr-m-contract{ grid-template-columns:1fr; } }
.hgr-m-contract-panel{ background:var(--hgr-m-navy-panel); }
.hgr-m-contract-panel .hgr-m-ch{ padding:14px 20px; border-bottom:1px solid var(--hgr-m-hairline); font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-m-paper-dim); }
.hgr-m-contract-panel pre{ padding:20px; font-family:'IBM Plex Mono',monospace; font-size:12px; line-height:1.7; color:var(--hgr-m-blue-bright); overflow-x:auto; white-space:pre; margin:0; }
.hgr-m-k{ color:var(--hgr-m-paper-dim); }
.hgr-m-v{ color:var(--hgr-m-amber-bright); }

.hgr-m-btn{ font-family:'IBM Plex Mono',monospace; font-size:13px; padding:12px 22px; border-radius:2px; display:inline-flex; align-items:center; gap:8px; text-decoration:none; border:1px solid transparent; cursor:pointer; background:none; }
.hgr-m-btn-ghost{ border:1px solid var(--hgr-m-hairline); color:var(--hgr-m-paper-dim); }
.hgr-m-btn-ghost:hover{ color:var(--hgr-m-paper); border-color:var(--hgr-m-blue-bright); }
.hgr-m-btn-amber{ background:var(--hgr-m-amber); color:var(--hgr-m-navy-deep); font-weight:600; }
.hgr-m-btn-amber:hover{ background:var(--hgr-m-amber-bright); }
.hgr-m-btn:disabled{ opacity:.4; cursor:not-allowed; }
.hgr-m-btn:disabled:hover{ color:var(--hgr-m-paper-dim); border-color:var(--hgr-m-hairline); }

/* ── Your missions ── */
.hgr-m-plan-new-link{
  display:inline-flex; align-items:center; gap:6px; margin-bottom:20px;
  font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:.04em;
  color:var(--hgr-m-blue-bright); background:none; border:1px solid var(--hgr-m-hairline);
  border-radius:2px; padding:9px 16px; cursor:pointer;
}
.hgr-m-plan-new-link:hover{ color:var(--hgr-m-paper); border-color:var(--hgr-m-blue-bright); }
.hgr-m-missions-panel{ border:1px solid var(--hgr-m-hairline); background:var(--hgr-m-navy-panel); border-radius:2px; margin-bottom:32px; }
.hgr-m-missions-panel-title{
  display:flex; align-items:center; justify-content:space-between; width:100%;
  font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase;
  color:var(--hgr-m-paper-dim); padding:14px 18px; border:none; background:none; cursor:pointer;
}
.hgr-m-missions-panel-title:hover{ color:var(--hgr-m-paper); }
.hgr-m-missions-arrow{ display:inline-block; font-size:11px; transition:transform .15s; }
.hgr-m-missions-arrow-open{ transform:rotate(90deg); }
.hgr-m-missions-list{ max-height:260px; overflow-y:auto; border-top:1px solid var(--hgr-m-hairline); }
.hgr-m-mission-row{
  display:grid; grid-template-columns:1.2fr 2fr 1fr 0.7fr 1fr; align-items:center; gap:12px; width:100%;
  padding:12px 18px; border:none; border-bottom:1px dashed var(--hgr-m-hairline); background:none; cursor:pointer;
  text-align:left; font-family:'IBM Plex Sans',sans-serif; transition:background .15s;
}
.hgr-m-mission-row:last-child{ border-bottom:none; }
.hgr-m-mission-row:hover{ background:rgba(111,180,224,.07); }
@media(max-width:700px){ .hgr-m-mission-row{ grid-template-columns:1fr 1fr; row-gap:4px; } }
.hgr-m-mission-row-code{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-m-blue-bright); }
.hgr-m-mission-row-type{ font-size:13px; color:var(--hgr-m-paper); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hgr-m-mission-row-status{
  font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.05em; text-transform:uppercase;
  color:var(--hgr-m-paper-dim); border:1px solid var(--hgr-m-hairline); padding:3px 8px; border-radius:2px;
  justify-self:start; white-space:nowrap;
}
.hgr-m-mission-row-status-spec_ready{ color:var(--hgr-m-blue-bright); border-color:rgba(111,180,224,.4); }
.hgr-m-mission-row-status-finalized{ color:var(--hgr-m-amber-bright); border-color:rgba(232,163,61,.4); }
.hgr-m-mission-row-status-error{ color:var(--hgr-m-amber); border-color:rgba(232,163,61,.4); }
.hgr-m-mission-row-confidence{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-m-paper-dim); }
.hgr-m-mission-row-date{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-m-paper-dim); text-align:right; }

.hgr-m-stage-tracker{ display:flex; gap:1px; background:var(--hgr-m-hairline); border:1px solid var(--hgr-m-hairline); margin-bottom:28px; }
.hgr-m-stage-tracker-item{ flex:1; background:var(--hgr-m-navy-panel); padding:12px 10px; text-align:center; }
.hgr-m-stage-tracker-num{
  width:24px; height:24px; border-radius:50%; margin:0 auto 6px;
  display:flex; align-items:center; justify-content:center;
  font-family:'IBM Plex Mono',monospace; font-size:14px; font-weight:700;
  border:1.5px solid var(--hgr-m-hairline); color:transparent; transition:.2s;
}
.hgr-m-stage-tracker-label{ font-size:12px; color:var(--hgr-m-paper-dim); }
.hgr-m-stage-tracker-item-complete{ background:#132A44; }
.hgr-m-stage-tracker-item-complete .hgr-m-stage-tracker-label{ color:var(--hgr-m-paper); }
.hgr-m-stage-tracker-item-complete .hgr-m-stage-tracker-num{
  background:var(--hgr-m-blue-bright); border-color:var(--hgr-m-blue-bright);
  color:var(--hgr-m-navy-deep); box-shadow:0 0 10px rgba(111,180,224,0.5);
}
.hgr-m-stage-tracker-item-active{ background:#1B3A57; box-shadow:inset 0 0 0 1px rgba(232,163,61,.4); }
.hgr-m-stage-tracker-item-active .hgr-m-stage-tracker-label{ color:var(--hgr-m-paper); }
.hgr-m-stage-tracker-item-active .hgr-m-stage-tracker-num{ border-color:var(--hgr-m-amber); }

/* ── Intake form + live status ── */
.hgr-m-process-grid{ display:grid; grid-template-columns:1fr 320px; gap:32px; align-items:start; }
@media(max-width:820px){ .hgr-m-process-grid{ grid-template-columns:1fr; } }
.hgr-m-intake{ max-width:640px; }
.hgr-m-field{ margin-bottom:22px; }
.hgr-m-field label{ display:block; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-m-paper-dim); margin-bottom:10px; }
.hgr-m-field textarea{
  width:100%; background:var(--hgr-m-navy-panel); border:1px solid var(--hgr-m-hairline);
  color:var(--hgr-m-paper); font-family:'IBM Plex Sans',sans-serif; font-size:14.5px; line-height:1.6;
  padding:14px 16px; border-radius:2px; outline:none; resize:vertical; transition:border-color .15s;
}
.hgr-m-field textarea:focus{ border-color:var(--hgr-m-blue-bright); }
.hgr-m-intake-summary{
  max-width:640px; padding:14px 16px; border:1px solid rgba(111,180,224,.3);
  border-left:3px solid var(--hgr-m-blue-bright); background:rgba(111,180,224,.09);
  border-radius:2px; margin-bottom:20px;
}
.hgr-m-intake-summary-label{ display:block; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-m-blue-bright); margin-bottom:8px; }
.hgr-m-intake-summary p{ margin:0; font-size:14px; color:var(--hgr-m-paper); line-height:1.6; }

/* ── Live status panel ── */
.hgr-m-status-panel{
  border:1px solid var(--hgr-m-hairline); background:var(--hgr-m-navy-panel); border-radius:2px;
  padding:20px;
}
.hgr-m-status-panel-title{ font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-m-paper-dim); margin-bottom:16px; }
.hgr-m-status-idle{ color:var(--hgr-m-paper-dim); font-size:13px; line-height:1.6; margin:0; }
.hgr-m-status-step{ display:flex; align-items:flex-start; gap:10px; padding:9px 0; border-top:1px dashed var(--hgr-m-hairline); }
.hgr-m-status-step:first-child{ border-top:none; }
.hgr-m-status-icon{ width:18px; height:18px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; margin-top:1px; border-radius:50%; }
.hgr-m-status-step-done .hgr-m-status-icon{ background:var(--hgr-m-blue-bright); color:var(--hgr-m-navy-deep); box-shadow:0 0 6px rgba(111,180,224,0.5); }
.hgr-m-status-spinner{
  width:13px; height:13px; border-radius:50%; border:2px solid var(--hgr-m-hairline); border-top-color:var(--hgr-m-amber);
  animation:hgr-m-spin 0.8s linear infinite;
}
.hgr-m-status-text{ font-size:12.5px; line-height:1.5; color:var(--hgr-m-paper-dim); }
.hgr-m-status-text b{ font-family:'IBM Plex Mono',monospace; color:var(--hgr-m-paper-dim); margin-right:6px; }
.hgr-m-status-step-active .hgr-m-status-text{ color:var(--hgr-m-paper); }
.hgr-m-status-step-active .hgr-m-status-text b{ color:var(--hgr-m-amber); }
.hgr-m-status-step-done .hgr-m-status-text{ color:var(--hgr-m-paper); }
.hgr-m-status-step-done .hgr-m-status-text b{ color:var(--hgr-m-blue-bright); }

/* ── Findings cards — side by side, not stacked, so completing all 4
   stages doesn't turn into a long vertical scroll ── */
.hgr-m-findings-track{ display:flex; flex-wrap:wrap; gap:16px; margin-top:28px; align-items:flex-start; }
.hgr-m-findings-track .hgr-m-findings-card{ flex:1 1 320px; max-width:380px; animation:hgr-m-findings-in .4s ease both; }
@keyframes hgr-m-findings-in{ from{ opacity:0; transform:translateY(10px) scale(.98); } to{ opacity:1; transform:none; } }
.hgr-m-findings-card{ border:1px solid var(--hgr-m-hairline); background:var(--hgr-m-navy-panel); border-radius:2px; padding:20px 22px; }
.hgr-m-findings-card-head{ display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px; flex-wrap:wrap; }
.hgr-m-findings-title{ font-family:'Space Grotesk',sans-serif; font-size:15px; font-weight:600; display:flex; align-items:center; gap:10px; }
.hgr-m-findings-badge{ width:22px; height:22px; border-radius:50%; background:var(--hgr-m-blue-bright); color:var(--hgr-m-navy-deep); display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; flex-shrink:0; box-shadow:0 0 8px rgba(111,180,224,0.5); }
.hgr-m-findings-badge-live{ background:#4ADE80; box-shadow:0 0 8px rgba(74,222,128,.5); }
.hgr-m-findings-badge-mock{ background:var(--hgr-m-amber); box-shadow:0 0 8px rgba(232,163,61,.5); }
.hgr-m-findings-mock{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.05em; text-transform:uppercase; color:var(--hgr-m-amber); border:1px solid rgba(232,163,61,.4); padding:3px 8px; border-radius:2px; }
.hgr-m-findings-body{ font-size:13px; color:var(--hgr-m-paper-dim); }
.hgr-m-findings-row{ padding:8px 0; border-top:1px dashed var(--hgr-m-hairline); }
.hgr-m-findings-row:first-child{ border-top:none; }
.hgr-m-findings-row b{ display:block; color:var(--hgr-m-paper-dim); font-weight:500; font-family:'IBM Plex Mono',monospace; font-size:10.5px; text-transform:uppercase; letter-spacing:.04em; margin-bottom:5px; }
.hgr-m-findings-row > span{ color:var(--hgr-m-paper); font-size:13.5px; line-height:1.6; }
.hgr-m-findings-chips{ display:flex; flex-wrap:wrap; gap:6px; }
.hgr-m-findings-chip{ font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--hgr-m-blue-bright); border:1px solid rgba(111,180,224,.35); padding:3px 9px; border-radius:2px; }
.hgr-m-proceed-row{ display:flex; align-items:center; gap:14px; }
.hgr-m-status-panel .hgr-m-proceed-row{ margin-top:16px; }
.hgr-m-status-panel .hgr-m-proceed-row .hgr-m-btn{ width:100%; justify-content:center; }
.hgr-m-status-panel .hgr-m-error{ max-width:none; margin-top:16px; padding:16px 18px; }
.hgr-m-gap-card{
  margin-top:16px; padding:14px 16px; border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08);
  border-radius:2px;
}
.hgr-m-gap-card-title{ font-size:12.5px; color:var(--hgr-m-paper-dim); line-height:1.55; margin-bottom:12px; }
.hgr-m-gap-card-question{ font-size:13.5px; color:var(--hgr-m-paper); margin-bottom:12px; line-height:1.5; }
.hgr-m-gap-card-row{ display:flex; flex-direction:column; gap:10px; }
.hgr-m-gap-card-row .hgr-m-btn{ width:100%; justify-content:center; }

/* ── Error ── */
@keyframes hgr-m-spin{ to{ transform:rotate(360deg); } }
.hgr-m-error{
  border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px;
  padding:20px 22px; max-width:640px; margin-top:20px;
}
.hgr-m-list-fetch-error{ display:flex; align-items:center; justify-content:space-between; gap:16px; padding:14px 18px; margin-bottom:20px; border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; }
.hgr-m-list-fetch-error p{ margin:0; color:var(--hgr-m-paper-dim); font-size:13.5px; }
.hgr-m-error b{ color:var(--hgr-m-amber-bright); display:block; margin-bottom:6px; font-size:14px; }
.hgr-m-error p{ color:var(--hgr-m-paper-dim); font-size:13.5px; margin:0 0 16px; line-height:1.6; }

/* ── Phase hover-preview strip (post spec-ready) ── */
.hgr-m-phase-strip{ display:flex; gap:12px; margin-bottom:20px; flex-wrap:wrap; }
.hgr-m-phase-tab{ position:relative; }
.hgr-m-phase-tab > span{
  display:inline-block; font-family:'IBM Plex Mono',monospace; font-size:12px; color:var(--hgr-m-blue-bright);
  border:1px solid rgba(111,180,224,.4); padding:8px 14px; border-radius:2px; cursor:default; transition:.15s;
}
.hgr-m-phase-tab:hover > span{ color:var(--hgr-m-navy-deep); background:var(--hgr-m-blue-bright); }
.hgr-m-phase-preview{
  position:absolute; top:100%; left:0; width:360px; z-index:30; padding-top:10px;
  opacity:0; pointer-events:none; transition:opacity .15s;
}
.hgr-m-phase-tab:hover .hgr-m-phase-preview{ opacity:1; pointer-events:auto; }
.hgr-m-phase-preview .hgr-m-findings-card{ box-shadow:0 12px 32px rgba(0,0,0,0.5); }

/* ── Dashboard View (Section 13.1) ── */
.hgr-m-dash{ border:1px solid var(--hgr-m-hairline); background:var(--hgr-m-navy-panel); }
.hgr-m-telemetry{
  display:flex; flex-wrap:wrap; gap:1px; background:var(--hgr-m-hairline);
  border-bottom:1px solid var(--hgr-m-hairline);
}
.hgr-m-telemetry-item{
  flex:1; min-width:110px; background:var(--hgr-m-navy-deep); padding:12px 16px;
  display:flex; flex-direction:column; gap:2px;
}
.hgr-m-telemetry-num{ font-family:'Space Grotesk',sans-serif; font-size:17px; font-weight:600; }
.hgr-m-telemetry-label{
  font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.06em; text-transform:uppercase;
  color:var(--hgr-m-paper-dim);
}
.hgr-m-dash-header{ display:flex; align-items:flex-start; justify-content:space-between; gap:24px; padding:26px 28px; border-bottom:1px solid var(--hgr-m-hairline); flex-wrap:wrap; }
.hgr-m-dash-badge{
  display:inline-block; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.08em; text-transform:uppercase;
  color:var(--hgr-m-blue-bright); border:1px solid rgba(111,180,224,.4); padding:4px 10px; border-radius:2px; margin-bottom:10px;
}
.hgr-m-dash-header h3{ font-size:20px; margin-bottom:6px; }
.hgr-m-dash-id{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-m-paper-dim); }
.hgr-m-dash-generated-at{ opacity:.75; }
.hgr-m-dash-confidence{ text-align:center; flex-shrink:0; }
.hgr-m-dash-confidence-top-row{ display:flex; align-items:center; gap:8px; }
.hgr-m-dash-confidence-num{ font-family:'Space Grotesk',sans-serif; font-size:32px; font-weight:700; color:var(--hgr-m-amber-bright); line-height:1; }
.hgr-m-dash-confidence-label{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-m-paper-dim); }
.hgr-m-dash-confidence-label-row{ display:flex; align-items:center; justify-content:center; gap:6px; margin-top:6px; }
.hgr-m-dash-bernoulli-link{
  display:inline-flex; align-items:center; gap:6px; margin-top:10px; font-family:'IBM Plex Mono',monospace;
  font-size:12.5px; font-weight:700; color:#160F2E; text-decoration:none;
  background:var(--hgr-m-bernoulli); border:1px solid var(--hgr-m-bernoulli); border-radius:2px;
  padding:9px 16px; white-space:nowrap; box-shadow:0 0 14px rgba(155,127,232,.45);
  transition:background .2s, box-shadow .2s;
}
.hgr-m-dash-bernoulli-link:hover{
  background:var(--hgr-m-bernoulli-bright); border-color:var(--hgr-m-bernoulli-bright);
  box-shadow:0 0 18px rgba(155,127,232,.65);
}
/* In the bottom actions row (alongside Save as final / Edit and
   regenerate / etc.) it needs to match those .hgr-m-btn siblings' exact
   size, not the smaller/offset version used under the confidence score —
   overriding just the sizing here rather than changing the shared class,
   since the header usages still need their own margin-top spacing. */
.hgr-m-dash-actions .hgr-m-dash-bernoulli-link{
  margin-top:0; padding:12px 22px; font-size:13px;
}

/* ── Confidence boost wizard ── */
.hgr-m-boost-arrow{
  width:24px; height:24px; border-radius:50%; border:1px solid rgba(111,180,224,.4); background:none;
  color:var(--hgr-m-blue-bright); font-size:13px; font-weight:700; cursor:pointer; display:flex;
  align-items:center; justify-content:center; transition:.15s; flex-shrink:0;
}
.hgr-m-boost-arrow:hover{ background:var(--hgr-m-blue-bright); color:var(--hgr-m-navy-deep); }
.hgr-m-boost-delta{ font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--hgr-m-blue-bright); margin-top:4px; }
.hgr-m-boost-explain{
  margin:0 28px 24px; padding:16px 18px; border:1px solid var(--hgr-m-hairline); background:var(--hgr-m-navy-deep);
  border-radius:2px;
}
.hgr-m-boost-explain b{ display:block; font-size:13px; color:var(--hgr-m-paper); margin-bottom:10px; }
.hgr-m-boost-explain ul{ margin:0 0 10px; padding-left:18px; }
.hgr-m-boost-explain li{ font-size:12.5px; color:var(--hgr-m-paper-dim); line-height:1.7; }
.hgr-m-boost-explain-note{ margin:0; font-size:12.5px; color:var(--hgr-m-blue-bright); line-height:1.6; }
.hgr-m-boost-fields{ display:flex; flex-direction:column; gap:10px; }
.hgr-m-boost-field-row{ padding:10px 0; border-top:1px dashed var(--hgr-m-hairline); }
.hgr-m-boost-field-row:first-child{ border-top:none; padding-top:0; }
.hgr-m-boost-field-label{
  display:block; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.05em;
  text-transform:uppercase; color:var(--hgr-m-amber); margin-bottom:4px;
}
.hgr-m-boost-field-detail{ font-size:12.5px; color:var(--hgr-m-paper-dim); line-height:1.6; }
.hgr-m-boost-field-detail b{ color:var(--hgr-m-paper); font-weight:600; }
.hgr-m-boost-card{
  margin:0 28px 24px; padding:16px 18px; border:1px solid rgba(111,180,224,.4); background:rgba(111,180,224,.06);
  border-radius:2px;
}
.hgr-m-boost-card-question{ font-size:13.5px; color:var(--hgr-m-paper); margin-bottom:12px; line-height:1.5; }
.hgr-m-boost-card-row{ display:flex; gap:10px; flex-wrap:wrap; }
.hgr-m-boost-input{
  flex:1; min-width:160px; background:var(--hgr-m-navy-deep); border:1px solid var(--hgr-m-hairline);
  color:var(--hgr-m-paper); font-family:'IBM Plex Sans',sans-serif; font-size:14px; padding:10px 12px;
  border-radius:2px; outline:none;
}
.hgr-m-boost-input:focus{ border-color:var(--hgr-m-blue-bright); }
.hgr-m-boost-running{
  display:flex; align-items:center; gap:10px; margin:0 28px 24px; padding:14px 16px;
  color:var(--hgr-m-paper-dim); font-size:13px; border:1px solid var(--hgr-m-hairline); border-radius:2px;
}
.hgr-m-info-tip{ position:relative; display:inline-flex; }
.hgr-m-info-icon{
  width:14px; height:14px; border-radius:50%; border:1px solid var(--hgr-m-paper-dim); color:var(--hgr-m-paper-dim);
  font-family:'IBM Plex Mono',monospace; font-size:9px; display:flex; align-items:center; justify-content:center; cursor:default;
}
.hgr-m-info-tip:hover .hgr-m-info-icon{ border-color:var(--hgr-m-blue-bright); color:var(--hgr-m-blue-bright); }
.hgr-m-info-panel{
  position:absolute; top:100%; right:0; padding-top:8px; width:300px; z-index:40;
  opacity:0; pointer-events:none; transition:opacity .15s; text-align:left;
}
.hgr-m-info-tip:hover .hgr-m-info-panel{ opacity:1; pointer-events:auto; }
.hgr-m-info-panel-inner{
  display:block; background:var(--hgr-m-navy-deep); border:1px solid var(--hgr-m-hairline);
  border-radius:2px; padding:12px 14px; box-shadow:0 12px 32px rgba(0,0,0,0.5);
}
.hgr-m-info-panel-inner b{ display:block; font-size:12px; color:var(--hgr-m-paper); margin-bottom:6px; }
.hgr-m-info-panel-subhead{ margin-top:12px; padding-top:10px; border-top:1px dashed var(--hgr-m-hairline); }
.hgr-m-info-panel-inner p{ margin:0; font-size:12px; color:var(--hgr-m-paper-dim); line-height:1.6; }
.hgr-m-dash-section{ padding:24px 28px; border-bottom:1px solid var(--hgr-m-hairline); }
.hgr-m-dash-section:last-of-type{ border-bottom:none; }
.hgr-m-dash-section h4{ font-family:'Space Grotesk',sans-serif; font-size:14.5px; font-weight:600; margin-bottom:16px; }
.hgr-m-dash-summary{ color:var(--hgr-m-paper); font-size:14.5px; line-height:1.7; margin:0; }
.hgr-m-dash-brief{
  color:var(--hgr-m-paper); font-size:14px; line-height:1.7; margin:0;
  padding:12px 14px; border-left:3px solid var(--hgr-m-blue-bright); background:rgba(111,180,224,.09); border-radius:2px;
}
.hgr-m-dash-empty{ color:var(--hgr-m-paper-dim); font-size:13px; margin:0; }
.hgr-m-dash-fields{ display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
@media(max-width:700px){ .hgr-m-dash-fields{ grid-template-columns:1fr 1fr; } }
.hgr-m-dash-field-label{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--hgr-m-paper-dim); margin-bottom:6px; }
.hgr-m-dash-field-value{ font-size:14px; }
.hgr-m-dash-constraint-group{ margin-bottom:20px; }
.hgr-m-dash-constraint-group:last-child{ margin-bottom:0; }
.hgr-m-dash-constraint-group-label{
  font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.06em; text-transform:uppercase;
  color:var(--hgr-m-amber); margin-bottom:10px;
}
.hgr-m-dash-constraint-subgroup{ margin-bottom:16px; }
.hgr-m-dash-constraint-subgroup:last-child{ margin-bottom:0; }
.hgr-m-dash-constraint-subgroup-label{
  font-family:'IBM Plex Mono',monospace; font-size:10.5px; color:var(--hgr-m-paper-dim); margin-bottom:6px;
}
.hgr-m-dash-constraints{ background:var(--hgr-m-navy-deep); border:1px solid var(--hgr-m-hairline); border-radius:2px; }
.hgr-m-dash-constraint{ display:flex; gap:12px; padding:14px 16px; border-top:1px dashed var(--hgr-m-hairline); }
.hgr-m-dash-constraint:first-child{ border-top:none; }
.hgr-m-dash-constraint-num{
  font-family:'IBM Plex Mono',monospace; font-size:12px; color:var(--hgr-m-paper-dim);
  flex-shrink:0; width:20px;
}
.hgr-m-dash-constraint-body{ flex:1; min-width:0; }
.hgr-m-dash-constraint-main{ font-size:13.5px; margin-bottom:8px; }
.hgr-m-dash-tags{ display:flex; flex-wrap:wrap; gap:6px; }
.hgr-m-dash-tag{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; color:var(--hgr-m-blue-bright); border:1px solid rgba(111,180,224,.35); padding:3px 9px; border-radius:2px; }
.hgr-m-dash-kpi-stats{ display:flex; gap:28px; margin-bottom:16px; }
.hgr-m-dash-kpi-stat b{ display:block; font-family:'Space Grotesk',sans-serif; font-size:26px; font-weight:700; font-variant-numeric:tabular-nums; line-height:1; }
.hgr-m-dash-kpi-stat span{ display:block; font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.06em; text-transform:uppercase; color:var(--hgr-m-paper-dim); margin-top:6px; }
.hgr-m-dash-kpi-stat-gate b{ color:var(--hgr-m-amber-bright); }
.hgr-m-dash-kpi-stat-ranked b{ color:var(--hgr-m-blue-bright); }
.hgr-m-dash-kpis{ background:var(--hgr-m-navy-deep); border:1px solid var(--hgr-m-hairline); border-radius:2px; }
.hgr-m-dash-kpi-row{
  display:grid; grid-template-columns:52px 1fr auto; align-items:center; gap:16px;
  padding:13px 18px; border-top:1px dashed var(--hgr-m-hairline);
}
.hgr-m-dash-kpi-row:first-child{ border-top:none; }
.hgr-m-dash-kpi-tier{
  font-family:'IBM Plex Mono',monospace; font-size:10px; font-weight:600; text-align:center;
  padding:4px 0; border-radius:2px; letter-spacing:.04em;
  background:rgba(111,180,224,.1); color:var(--hgr-m-blue-bright); border:1px solid rgba(111,180,224,.3);
}
.hgr-m-dash-kpi-tier-gate{
  background:rgba(232,163,61,.18); color:var(--hgr-m-amber-bright); border-color:rgba(232,163,61,.4);
}
.hgr-m-dash-kpi-field{ min-width:0; }
.hgr-m-dash-kpi-target-field{ text-align:right; }
.hgr-m-dash-kpi-eyebrow{
  font-family:'IBM Plex Mono',monospace; font-size:9px; letter-spacing:.1em; text-transform:uppercase;
  color:var(--hgr-m-paper-dim);
}
.hgr-m-dash-kpi-name{ font-size:14px; font-weight:500; margin-top:1px; }
.hgr-m-dash-kpi-target-value{
  font-family:'IBM Plex Mono',monospace; font-size:15.5px; font-weight:600; color:var(--hgr-m-blue-bright);
  font-variant-numeric:tabular-nums; margin-top:1px;
}
.hgr-m-dash-kpi-target-value-gate{ color:var(--hgr-m-amber-bright); }

.hgr-m-confbars{ background:var(--hgr-m-navy-deep); border:1px solid var(--hgr-m-hairline); border-radius:2px; padding:20px 22px; }
.hgr-m-confbar-row{ margin-bottom:16px; }
.hgr-m-confbar-row:last-child{ margin-bottom:0; }
.hgr-m-confbar-head{ display:flex; justify-content:space-between; align-items:baseline; gap:12px; margin-bottom:6px; flex-wrap:wrap; }
.hgr-m-confbar-label{ font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.02em; color:var(--hgr-m-paper-dim); }
.hgr-m-confbar-value{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; font-weight:600; color:var(--hgr-m-paper); font-variant-numeric:tabular-nums; }
.hgr-m-confbar-track{ height:8px; background:rgba(255,255,255,.05); border-radius:4px; overflow:hidden; }
.hgr-m-confbar-slots{ display:flex; gap:6px; }
.hgr-m-confbar-slot{
  flex:1; height:28px; border-radius:2px; display:flex; align-items:center; justify-content:center;
  font-family:'IBM Plex Mono',monospace; font-size:10px; font-weight:600; letter-spacing:.02em;
}
.hgr-m-confbar-slot-yes{ background:rgba(74,222,128,.15); border:1px solid rgba(74,222,128,.5); color:#4ADE80; }
.hgr-m-confbar-slot-no{ background:rgba(248,113,113,.1); border:1px dashed rgba(248,113,113,.4); color:#F87171; }
.hgr-m-confbar-fill{ height:100%; border-radius:4px; background:var(--hgr-m-blue-bright); }
.hgr-m-confbar-fill-penalty{ background:var(--hgr-m-amber-bright); }
.hgr-m-confbar-total{
  display:flex; justify-content:space-between; align-items:baseline; margin-top:18px; padding-top:14px;
  border-top:1px dashed var(--hgr-m-hairline);
  font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.08em; text-transform:uppercase;
  color:var(--hgr-m-paper-dim);
}
.hgr-m-confbar-total b{
  font-family:'Space Grotesk',sans-serif; font-size:22px; font-weight:700; color:var(--hgr-m-paper);
  font-variant-numeric:tabular-nums; text-transform:none; letter-spacing:normal;
}
.hgr-m-dash-flags{ margin:0; padding-left:20px; color:var(--hgr-m-paper-dim); font-size:13px; line-height:1.9; }
.hgr-m-dash-actions{ display:flex; flex-wrap:wrap; gap:12px; padding:24px 28px; }
.hgr-m-dash-finalize-error{ margin:0 28px 24px; color:var(--hgr-m-amber-bright); font-size:13px; }
`;
