import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useHangarSession } from "@/lib/the-hangar/session";
import { supabase } from "@/integrations/supabase/client";
import type { MissionListEntry } from "@/lib/the-hangar/missionAgentPipeline";
import type {
  Stage1Result,
  Stage2Result,
  Stage3Result,
  Stage4Result,
  ConceptListEntry,
} from "@/lib/the-hangar/conceptAgentPipeline";
import type { CandidateConcept } from "@/lib/the-hangar/conceptIdeation";
import type { ConceptTradeoffNote, ConstraintFit } from "@/lib/the-hangar/tradeoffReasoning";
import type { RankedConcept } from "@/lib/the-hangar/conceptRanking";
import type { ConceptUsage } from "@/lib/the-hangar/conceptUsage";
import { describeInrCost, estimateCostUsd, formatCostInr } from "@/lib/the-hangar/missionUsage";
import {
  EXPORT_FORMAT_META,
  buildConceptExportModel,
  downloadBlob,
  exportConcept,
  type ConceptExportFormat,
  type ConceptExportInput,
} from "@/lib/the-hangar/conceptExport";

// ─────────────────────────────────────────────────────────────────────────
// The Hangar — Bay 02 (Concept Agent) detail page. New, self-contained page
// (no shared imports with the-hangar.mission.tsx, matching the welcome
// page's own "fully isolated" convention for each bay) that mirrors Mission
// Agent's gated 4-stage pattern, adapted to the concept domain: pick one of
// your finalized mission specs, generate + rank candidate concepts against
// it. There is no ConceptAgent.md — this page's 4 steps (Concept Ideation ->
// Trade-off Reasoning -> Ranking & Scoring -> Output Interface) were
// designed against the welcome page's own one-line description of Bay 02
// and confirmed with the user, since no reference doc exists for this bay
// the way MissionAgent.md exists for Bay 01.
// ─────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/the-hangar/concept")({
  component: TheHangarConcept,
});

type StageKey = "concept_ideation" | "trade_off_reasoning" | "ranking_scoring" | "output_interface";

interface StageSlot<T> {
  status: "pending" | "running" | "complete" | "error";
  result: T | null;
  errorMessage: string | null;
}

const EMPTY_SLOT: StageSlot<never> = { status: "pending", result: null, errorMessage: null };

interface ConceptFlowState {
  conceptId: string | null;
  conceptCode: string | null;
  // Usage the server rebuilt from Hangar_concept_runs, for a concept reopened
  // from "Your concepts" (which has no live stage results to read usage
  // from). null for a concept run this session — its stage results carry
  // the usage directly. Mirrors Mission Agent's flow.persistedUsage.
  persistedUsage: ConceptUsage | null;
  // Client-side timestamp for a concept generated this session (Stage4Result
  // carries no timestamp of its own), or the concept's real createdAt when
  // reopened via resumeConcept — same pattern as Mission Agent's
  // flow.generatedAt.
  generatedAt: string | null;
  stage1: StageSlot<Stage1Result>;
  stage2: StageSlot<Stage2Result>;
  stage3: StageSlot<Stage3Result>;
  stage4: StageSlot<Stage4Result>;
}

const INITIAL_FLOW_STATE: ConceptFlowState = {
  conceptId: null,
  conceptCode: null,
  generatedAt: null,
  persistedUsage: null,
  stage1: EMPTY_SLOT,
  stage2: EMPTY_SLOT,
  stage3: EMPTY_SLOT,
  stage4: EMPTY_SLOT,
};

const STAGE_ORDER: StageKey[] = [
  "concept_ideation",
  "trade_off_reasoning",
  "ranking_scoring",
  "output_interface",
];

const STAGE_TITLES: Record<StageKey, string> = {
  concept_ideation: "Concept Ideation",
  trade_off_reasoning: "Trade-off Reasoning",
  ranking_scoring: "Ranking & Scoring",
  output_interface: "Output Interface",
};

function getActiveStage(flow: ConceptFlowState): StageKey | "done" {
  if (flow.stage1.status !== "complete") return "concept_ideation";
  if (flow.stage2.status !== "complete") return "trade_off_reasoning";
  if (flow.stage3.status !== "complete") return "ranking_scoring";
  if (flow.stage4.status !== "complete") return "output_interface";
  return "done";
}

const CONCEPT_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  processing: "Processing",
  spec_ready: "Spec Ready",
  finalized: "Finalized",
  error: "Error",
};

// Beside the Concept ID on the live dashboard — same date+time convention
// as Mission Agent's formatGeneratedAt.
function formatGeneratedAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// Per-run LLM usage/timing, mirroring Mission Agent's MissionTelemetry —
// only available for a concept run THIS session (a resumed/past concept
// has no real Stage1-3 results to total). Stage 3 (ranking) has no LLM
// component at all, unlike Mission Agent's Stage 3 (which does) — its
// contribution here is duration-only, requests/tokens stay at whatever
// Stage 1-2 alone produced.
interface ConceptTelemetry {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  /** null when unknown — time is only measured for a run made this session. */
  durationMs: number | null;
  /** True when some stage's usage was never recorded, so the totals are a floor. */
  partial: boolean;
}

function computeTelemetry(flow: ConceptFlowState): ConceptTelemetry | null {
  const s1 = flow.stage1.result;
  const s2 = flow.stage2.result;
  const s3 = flow.stage3.result;
  if (s1 && s2 && s3) {
    const inputTokens = (s1.usage?.inputTokens ?? 0) + (s2.usage?.inputTokens ?? 0);
    const outputTokens = (s1.usage?.outputTokens ?? 0) + (s2.usage?.outputTokens ?? 0);
    return {
      requests: (s1.usage ? 1 : 0) + (s2.usage ? 1 : 0),
      inputTokens,
      outputTokens,
      estimatedCostUsd: estimateCostUsd(inputTokens, outputTokens),
      durationMs: s1.durationMs + s2.durationMs + s3.durationMs,
      partial: false,
    };
  }
  const persisted = flow.persistedUsage;
  if (!persisted) return null;
  return {
    requests: persisted.requests,
    inputTokens: persisted.inputTokens,
    outputTokens: persisted.outputTokens,
    estimatedCostUsd: persisted.estimatedCostUsd,
    durationMs: null,
    partial: !persisted.complete,
  };
}

// Per-stage checkpoint: requests on the left, tokens on the right, one row
// per pipeline stage. A row is null until that stage's usage is known —
// live, as each "Proceed" lands, or (for a reopened concept) from the
// persisted usage. Stages 3/4 have no LLM call, so once complete they're a
// real 0/0, not "unknown" — direct port of Mission Agent's StageUsageTable.
interface ConceptStageUsageRow {
  key: StageKey;
  mock: boolean;
  requests: number;
  inputTokens: number;
  outputTokens: number;
}

function computeStageUsage(flow: ConceptFlowState): (ConceptStageUsageRow | null)[] {
  const s1 = flow.stage1.result;
  const s2 = flow.stage2.result;
  const s3 = flow.stage3.result;
  const persisted = flow.persistedUsage?.stages;
  const fromPersisted = (key: StageKey): ConceptStageUsageRow | null => {
    const p = persisted?.[key as "concept_ideation" | "trade_off_reasoning"];
    return p ? { key, ...p } : null;
  };
  return [
    s1
      ? {
          key: "concept_ideation",
          mock: s1.mock,
          requests: s1.usage ? 1 : 0,
          inputTokens: s1.usage?.inputTokens ?? 0,
          outputTokens: s1.usage?.outputTokens ?? 0,
        }
      : fromPersisted("concept_ideation"),
    s2
      ? {
          key: "trade_off_reasoning",
          mock: s2.mock,
          requests: s2.usage ? 1 : 0,
          inputTokens: s2.usage?.inputTokens ?? 0,
          outputTokens: s2.usage?.outputTokens ?? 0,
        }
      : fromPersisted("trade_off_reasoning"),
    s3 || (flow.persistedUsage && flow.stage3.status === "complete")
      ? { key: "ranking_scoring", mock: false, requests: 0, inputTokens: 0, outputTokens: 0 }
      : null,
    flow.stage4.status === "complete" && (s1 || flow.persistedUsage)
      ? { key: "output_interface", mock: false, requests: 0, inputTokens: 0, outputTokens: 0 }
      : null,
  ];
}

function StageUsageTable({ flow }: { flow: ConceptFlowState }) {
  const rows = computeStageUsage(flow);
  const done = rows.filter((r): r is ConceptStageUsageRow => r !== null);
  const totalRequests = done.reduce((n, r) => n + r.requests, 0);
  const totalInput = done.reduce((n, r) => n + r.inputTokens, 0);
  const totalOutput = done.reduce((n, r) => n + r.outputTokens, 0);
  const partial = !!flow.persistedUsage && !flow.persistedUsage.complete;
  return (
    <table
      className="hgr-c-usage-table"
      title="LLM requests and tokens per stage. Cost is an estimate in INR at a fixed USD rate, not a bill."
    >
      <thead>
        <tr>
          <th>Stage</th>
          <th className="hgr-c-usage-num">Requests</th>
          <th className="hgr-c-usage-num">Tokens</th>
        </tr>
      </thead>
      <tbody>
        {STAGE_ORDER.map((key, i) => {
          const row = rows[i];
          return (
            <tr key={key}>
              <td>
                {STAGE_TITLES[key]}
                {row?.mock && (
                  <span
                    className="hgr-c-usage-mock"
                    title="No live Claude reply — this stage's content is placeholder output"
                  >
                    simulated
                  </span>
                )}
              </td>
              <td className="hgr-c-usage-num">{row ? row.requests : "—"}</td>
              <td className="hgr-c-usage-num">
                {row ? (row.inputTokens + row.outputTokens).toLocaleString() : "—"}
                {row && row.requests > 0 && (
                  <span className="hgr-c-usage-split">
                    {" "}
                    in {row.inputTokens.toLocaleString()} · out {row.outputTokens.toLocaleString()}
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr>
          <td>Total</td>
          <td className="hgr-c-usage-num">
            {partial ? "≥ " : ""}
            {totalRequests}
          </td>
          <td className="hgr-c-usage-num">{(totalInput + totalOutput).toLocaleString()}</td>
        </tr>
        <tr>
          <td colSpan={2}>Estimated cost</td>
          <td className="hgr-c-usage-num" title={describeInrCost(estimateCostUsd(totalInput, totalOutput))}>
            {partial ? "≥ " : "~"}
            {formatCostInr(estimateCostUsd(totalInput, totalOutput))}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function TelemetryBar({ telemetry }: { telemetry: ConceptTelemetry | null }) {
  if (!telemetry) return null;
  return (
    <div
      className="hgr-c-telemetry"
      title="LLM usage for this concept. Cost is an estimate in INR at a fixed USD rate, not a bill. Time is only known for a run made in this session."
    >
      <div className="hgr-c-telemetry-item">
        <span className="hgr-c-telemetry-num">
          {telemetry.partial ? "≥ " : ""}
          {telemetry.requests}
        </span>
        <span className="hgr-c-telemetry-label">Requests</span>
      </div>
      <div className="hgr-c-telemetry-item">
        <span className="hgr-c-telemetry-num">{telemetry.inputTokens.toLocaleString()}</span>
        <span className="hgr-c-telemetry-label">Input tokens</span>
      </div>
      <div className="hgr-c-telemetry-item">
        <span className="hgr-c-telemetry-num">{telemetry.outputTokens.toLocaleString()}</span>
        <span className="hgr-c-telemetry-label">Output tokens</span>
      </div>
      <div className="hgr-c-telemetry-item" title={describeInrCost(telemetry.estimatedCostUsd)}>
        <span className="hgr-c-telemetry-num">
          {telemetry.partial ? "≥ " : "~"}
          {formatCostInr(telemetry.estimatedCostUsd)}
        </span>
        <span className="hgr-c-telemetry-label">Est. cost</span>
      </div>
      {telemetry.durationMs !== null && (
        <div className="hgr-c-telemetry-item">
          <span className="hgr-c-telemetry-num">{formatDuration(telemetry.durationMs)}</span>
          <span className="hgr-c-telemetry-label">Time taken</span>
        </div>
      )}
    </div>
  );
}

const FIT_LABEL: Record<ConstraintFit, string> = {
  pass: "Fits",
  partial: "Partial fit",
  fail: "Fails constraints",
};

// Same fetch/auth/error-normalizing helper as the-hangar.mission.tsx's
// callStageApi, duplicated rather than shared — this page's own isolation
// convention (see the welcome page's header comment).
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
        "No signed-in TorqWings session found. Sign in with a real TorqWings account first, then retry.",
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

function TheHangarConcept() {
  const ready = useHangarSession();

  const [flow, setFlow] = useState<ConceptFlowState>(INITIAL_FLOW_STATE);
  const [finalizeState, setFinalizeState] = useState<{
    status: "idle" | "saving" | "saved" | "error";
    errorMessage: string | null;
  }>({ status: "idle", errorMessage: null });
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [llmStatus, setLlmStatus] = useState<"checking" | "live" | "offline">("checking");
  const [savedSpecs, setSavedSpecs] = useState<MissionListEntry[] | null>(null);
  const [savedSpecsStatus, setSavedSpecsStatus] = useState<"idle" | "loading" | "error">("idle");
  const [savedSpecsExpanded, setSavedSpecsExpanded] = useState(false);
  const [concepts, setConcepts] = useState<ConceptListEntry[] | null>(null);
  const [conceptsStatus, setConceptsStatus] = useState<"idle" | "loading" | "error">("idle");
  const [conceptsExpanded, setConceptsExpanded] = useState(false);
  const [selectedSpec, setSelectedSpec] = useState<MissionListEntry | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<ConceptListEntry | null>(null);
  const [planExpanded, setPlanExpanded] = useState(false);

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

  // "AI" indicator — same live check Mission Agent's Bay 01 header uses
  // (checkLlmLiveStatus in llmGateway.ts is generic, not Mission-Agent-
  // specific, so this reuses the exact same /api/hangar/llm-status
  // endpoint rather than standing up a Concept-Agent-scoped copy).
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

  // "Your saved specs" — finalized mission specs only, reusing
  // /api/hangar/missions (Mission Agent's own list route) with a status
  // filter, rather than a parallel query. Extracted into a named function
  // so Retry (ListFetchError) can re-invoke it — previously silently blank
  // on error.
  async function fetchSavedSpecs() {
    if (!currentUserEmail) return;
    setSavedSpecsStatus("loading");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setSavedSpecsStatus("error");
      return;
    }
    try {
      const res = await fetch("/api/hangar/missions?status=finalized", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSavedSpecs(await res.json());
      setSavedSpecsStatus("idle");
    } catch {
      setSavedSpecsStatus("error");
    }
  }

  useEffect(() => {
    fetchSavedSpecs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserEmail]);

  // "Your concepts" — refetched whenever a concept reaches spec_ready, same
  // pattern as Mission Agent's "Your missions" refresh trigger. Extracted
  // for the same Retry reason as fetchSavedSpecs above.
  async function fetchConceptsList() {
    if (!currentUserEmail) return;
    setConceptsStatus("loading");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setConceptsStatus("error");
      return;
    }
    try {
      const res = await fetch("/api/hangar/concepts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setConcepts(await res.json());
      setConceptsStatus("idle");
    } catch {
      setConceptsStatus("error");
    }
  }

  useEffect(() => {
    fetchConceptsList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserEmail, flow.stage4.status]);

  function resetFlow() {
    setFlow(INITIAL_FLOW_STATE);
    setSelectedSpec(null);
    setSelectedConcept(null);
    setFinalizeState({ status: "idle", errorMessage: null });
  }

  function selectSavedSpec(m: MissionListEntry) {
    resetFlow();
    setSelectedSpec(m);
    setPlanExpanded(true);
  }

  // A concept clicked from "Your concepts" that isn't finalized yet stays
  // fully editable — reopened into the live dashboard, same reasoning as
  // Mission Agent's resumeMission. Only a genuinely finalized concept, or
  // one with no persisted spec at all (failed before spec_ready), is
  // routed to the read-only detail view.
  function resumeConcept(c: ConceptListEntry) {
    if (
      c.status === "finalized" ||
      !c.candidateConcepts ||
      !c.tradeOffNotes ||
      !c.rankedConcepts ||
      c.confidenceScore === null
    ) {
      setSelectedConcept(c);
      return;
    }
    setFlow({
      conceptId: c.conceptId,
      conceptCode: c.conceptCode,
      generatedAt: c.createdAt,
      persistedUsage: c.usage,
      stage1: { status: "complete", result: null, errorMessage: null },
      stage2: { status: "complete", result: null, errorMessage: null },
      stage3: { status: "complete", result: null, errorMessage: null },
      stage4: {
        status: "complete",
        result: {
          conceptId: c.conceptId,
          conceptCode: c.conceptCode,
          candidates: c.candidateConcepts,
          tradeoffNotes: c.tradeOffNotes,
          rankedConcepts: c.rankedConcepts,
          confidenceScore: c.confidenceScore,
          specVersion: c.specVersion ?? 1,
          export: { status: "stubbed", reason: "Export (PDF/DOCX/Excel) is v2 — not implemented" },
          eventPublish: {
            status: "stubbed",
            reason: "No queue/bus/consumer exists yet",
            eventType: "concept.spec_ready",
          },
        },
        errorMessage: null,
      },
    });
    setSelectedSpec(null);
    setSelectedConcept(null);
    setFinalizeState({ status: "idle", errorMessage: null });
    setPlanExpanded(true);
  }

  // Same reset-but-keep-the-seed pattern as Mission Agent's
  // editAndRegenerate — reopens with the same saved spec pre-selected,
  // ready to regenerate. Resubmitting creates a new Hangar_concepts row
  // (no update-in-place path exists, same as Mission Agent).
  function editAndRegenerate() {
    const spec = selectedSpec;
    setFlow(INITIAL_FLOW_STATE);
    setFinalizeState({ status: "idle", errorMessage: null });
    setSelectedSpec(spec);
  }

  async function startConceptGeneration() {
    if (
      !selectedSpec ||
      !selectedSpec.missionSpecs ||
      !selectedSpec.constraints ||
      !selectedSpec.kpis ||
      selectedSpec.summary === null
    ) {
      return;
    }
    setFlow((f) => ({ ...f, stage1: { status: "running", result: null, errorMessage: null } }));
    const outcome = await callStageApi<Stage1Result>(
      "/api/hangar/process-concept/concept-ideation",
      {
        sourceMissionId: selectedSpec.missionId,
        missionSpecs: selectedSpec.missionSpecs,
        constraints: selectedSpec.constraints,
        kpis: selectedSpec.kpis,
        summary: selectedSpec.summary,
      },
    );
    if (!outcome.ok) {
      setFlow((f) => ({
        ...f,
        stage1: { status: "error", result: null, errorMessage: outcome.error },
      }));
      return;
    }
    setFlow((f) => ({
      ...f,
      conceptId: outcome.data.conceptId,
      conceptCode: outcome.data.conceptCode,
      stage1: { status: "complete", result: outcome.data, errorMessage: null },
    }));
  }

  async function proceedToStage2() {
    const { conceptId, stage1 } = flow;
    if (!conceptId || !stage1.result || !selectedSpec?.constraints || !selectedSpec?.kpis) return;
    setFlow((f) => ({ ...f, stage2: { status: "running", result: null, errorMessage: null } }));
    const outcome = await callStageApi<Stage2Result>(
      "/api/hangar/process-concept/trade-off-reasoning",
      {
        conceptId,
        candidates: stage1.result.candidates,
        constraints: selectedSpec.constraints,
        kpis: selectedSpec.kpis,
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

  async function proceedToStage3() {
    const { conceptId, stage1, stage2 } = flow;
    if (!conceptId || !stage1.result || !stage2.result) return;
    setFlow((f) => ({ ...f, stage3: { status: "running", result: null, errorMessage: null } }));
    const outcome = await callStageApi<Stage3Result>(
      "/api/hangar/process-concept/ranking-scoring",
      {
        conceptId,
        candidates: stage1.result.candidates,
        tradeoffNotes: stage2.result.notes,
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
    const { conceptId, stage1, stage2, stage3 } = flow;
    if (!conceptId || !stage1.result || !stage2.result || !stage3.result) return;
    setFlow((f) => ({ ...f, stage4: { status: "running", result: null, errorMessage: null } }));
    const outcome = await callStageApi<Stage4Result>(
      "/api/hangar/process-concept/output-interface",
      {
        conceptId,
        candidates: stage1.result.candidates,
        tradeoffNotes: stage2.result.notes,
        rankedConcepts: stage3.result.rankedConcepts,
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

  async function saveAsFinal() {
    if (!flow.conceptId) return;
    setFinalizeState({ status: "saving", errorMessage: null });
    const outcome = await callStageApi<{ conceptId: string; status: string }>(
      "/api/hangar/process-concept/finalize",
      { conceptId: flow.conceptId },
    );
    if (!outcome.ok) {
      setFinalizeState({ status: "error", errorMessage: outcome.error });
      return;
    }
    resetFlow();
    setConceptsExpanded(false);
    setSavedSpecsExpanded(false);
  }

  if (!ready) return null;

  const activeStage = getActiveStage(flow);
  const isIdle = flow.stage1.status === "pending" && activeStage !== "done";

  return (
    <div className="hgr-c">
      <style>{HGR_CONCEPT_CSS}</style>

      <nav>
        <div className="hgr-c-wrap">
          <div className="hgr-c-crumbs">
            <Link to="/">TorqWings</Link>
            <span className="hgr-c-sep">/</span>
            <Link to="/the-hangar">The Hangar</Link>
            <span className="hgr-c-sep">/</span>
            <span className="hgr-c-cur">Bay 02 — Concept Agent</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {currentUserEmail && (
              <span
                className="hgr-c-mono"
                style={{ fontSize: 12.5, color: "var(--hgr-c-paper-dim)" }}
              >
                Welcome, {currentUserEmail}
              </span>
            )}
            <Link to="/the-hangar/welcome" className="hgr-c-exit">
              ← Back to Hangar
            </Link>
            <Link to="/the-hangar" className="hgr-c-exit">
              Exit site
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <div className="hgr-c-hero">
          <div className="hgr-c-doors">
            <div className="hgr-c-door hgr-c-door-left" />
            <div className="hgr-c-door hgr-c-door-right" />
          </div>
          <div className="hgr-c-wrap">
            <div className="hgr-c-status-row">
              <span className="hgr-c-badge hgr-c-badge-bay">BAY 02 OF 15</span>
              <span
                className={`hgr-c-badge hgr-c-badge-ai hgr-c-badge-ai-${llmStatus}`}
                title={
                  llmStatus === "checking"
                    ? "Checking connection to Anthropic…"
                    : llmStatus === "live"
                      ? "Live — connected to Anthropic (Claude Sonnet 5)"
                      : "Offline — not connected to Anthropic. Stage LLM calls will fall back to mock output."
                }
              >
                <span className="hgr-c-badge-ai-dot" />
                AI
              </span>
            </div>
            <div className="hgr-c-hero-row">
              <h1>Concept Agent</h1>
              <p className="hgr-c-lead">
                Takes a <b>finalized mission spec</b> from Bay 01 and generates candidate vehicle
                concepts, reasons through their trade-offs against your own KPIs and constraints,
                and ranks them — before anything is committed to.
              </p>
            </div>
          </div>
        </div>

        <section id="generate-concept">
          <div className="hgr-c-wrap">
            <div className="hgr-c-kicker">Generate a concept</div>
            <h2 className="hgr-c-sec-title">Turn a finalized spec into ranked concept options.</h2>
            <p className="hgr-c-sec-sub">
              Runs 4 steps against the real Claude backend — concept ideation, trade-off reasoning,
              ranking &amp; scoring, and persistence. There's no real benchmark database or
              knowledge-graph yet, so trade-off reasoning is Claude reasoning against your mission's
              own stated KPIs and constraints, not a market lookup — review each stage's findings
              and proceed when you're ready.
            </p>

            {savedSpecsStatus === "error" && <ListFetchError onRetry={fetchSavedSpecs} />}

            {savedSpecsStatus !== "error" &&
              savedSpecs &&
              savedSpecs.length > 0 &&
              !selectedConcept && (
                <ListPanel
                  title={`Your saved specs (${savedSpecs.length})`}
                  expanded={savedSpecsExpanded}
                  onToggleExpanded={() => setSavedSpecsExpanded((v) => !v)}
                >
                  {savedSpecs.map((m) => (
                    <button
                      key={m.missionId}
                      type="button"
                      className="hgr-c-list-row"
                      onClick={() => selectSavedSpec(m)}
                    >
                      <span className="hgr-c-list-row-code">{m.missionCode}</span>
                      <span className="hgr-c-list-row-type">
                        {m.missionSpecs?.missionType ?? "—"}
                      </span>
                      <span className="hgr-c-list-row-confidence">
                        {m.confidenceScore !== null
                          ? `${Math.round(m.confidenceScore * 100)}%`
                          : "—"}
                      </span>
                      <span className="hgr-c-list-row-date">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </ListPanel>
              )}

            {savedSpecsStatus !== "error" && savedSpecs && savedSpecs.length === 0 && (
              <p className="hgr-c-empty-hint">
                No finalized mission specs yet — finalize one in{" "}
                <Link to="/the-hangar/mission">Mission Agent</Link> first, then come back here to
                generate concepts from it.
              </p>
            )}

            {conceptsStatus === "error" && <ListFetchError onRetry={fetchConceptsList} />}

            {concepts && concepts.length > 0 && !selectedConcept && (
              <ListPanel
                title={`Your concepts (${concepts.length})`}
                expanded={conceptsExpanded}
                onToggleExpanded={() => setConceptsExpanded((v) => !v)}
              >
                {concepts.map((c) => (
                  <button
                    key={c.conceptId}
                    type="button"
                    className="hgr-c-list-row"
                    onClick={() => resumeConcept(c)}
                  >
                    <span className="hgr-c-list-row-code">{c.conceptCode}</span>
                    <span className="hgr-c-list-row-type">
                      {c.rankedConcepts?.[0]?.conceptName ?? "—"}
                    </span>
                    <span className={`hgr-c-list-row-status hgr-c-list-row-status-${c.status}`}>
                      {CONCEPT_STATUS_LABEL[c.status] ?? c.status}
                    </span>
                    <span className="hgr-c-list-row-confidence">
                      {c.confidenceScore !== null ? `${Math.round(c.confidenceScore * 100)}%` : "—"}
                    </span>
                    <span className="hgr-c-list-row-date">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </ListPanel>
            )}

            {selectedConcept ? (
              <PastConceptDetail
                concept={selectedConcept}
                onBack={() => setSelectedConcept(null)}
              />
            ) : (
              <div className={isIdle ? "hgr-c-collapsible" : undefined}>
                {isIdle && (
                  <button
                    type="button"
                    className="hgr-c-collapsible-title"
                    onClick={() => setPlanExpanded((v) => !v)}
                    aria-expanded={planExpanded}
                  >
                    <span>Generate a concept</span>
                    <span className={`hgr-c-arrow${planExpanded ? " hgr-c-arrow-open" : ""}`}>
                      ▸
                    </span>
                  </button>
                )}
                {(!isIdle || planExpanded) && (
                  <div className={isIdle ? "hgr-c-collapsible-body" : undefined}>
                    <div className="hgr-c-stage-tracker">
                      {STAGE_ORDER.map((key) => {
                        const complete =
                          STAGE_ORDER.indexOf(key) < STAGE_ORDER.indexOf(activeStage as StageKey) ||
                          activeStage === "done";
                        const isActive = key === activeStage;
                        const cls = complete
                          ? "hgr-c-stage-tracker-item-complete"
                          : isActive
                            ? "hgr-c-stage-tracker-item-active"
                            : "";
                        return (
                          <div key={key} className={`hgr-c-stage-tracker-item ${cls}`}>
                            <div className="hgr-c-stage-tracker-num">{complete ? "✓" : ""}</div>
                            <div className="hgr-c-stage-tracker-label">{STAGE_TITLES[key]}</div>
                          </div>
                        );
                      })}
                    </div>

                    {(flow.stage1.result || flow.persistedUsage) && <StageUsageTable flow={flow} />}

                    {activeStage !== "done" && (
                      <>
                        <div className="hgr-c-process-grid">
                          <div>
                            {(flow.stage1.status === "pending" ||
                              flow.stage1.status === "error") && (
                              <>
                                {selectedSpec ? (
                                  <div className="hgr-c-selected-spec">
                                    <span className="hgr-c-selected-spec-label">
                                      Generating from
                                    </span>
                                    <p>
                                      <b>{selectedSpec.missionCode}</b> —{" "}
                                      {selectedSpec.missionSpecs?.missionType ?? "—"}
                                    </p>
                                    <button
                                      type="button"
                                      className="hgr-c-btn hgr-c-btn-amber"
                                      onClick={startConceptGeneration}
                                    >
                                      Generate Concept →
                                    </button>
                                  </div>
                                ) : (
                                  <p className="hgr-c-status-idle">
                                    Select a saved spec above to begin generating concepts.
                                  </p>
                                )}
                                {flow.stage1.status === "error" && (
                                  <StageErrorCard
                                    title="Couldn't generate concepts."
                                    message={flow.stage1.errorMessage}
                                    onRetry={startConceptGeneration}
                                  />
                                )}
                              </>
                            )}

                            {flow.stage1.status !== "pending" &&
                              flow.stage1.status !== "error" &&
                              selectedSpec && (
                                <div className="hgr-c-selected-spec">
                                  <span className="hgr-c-selected-spec-label">Source spec</span>
                                  <p>
                                    <b>{selectedSpec.missionCode}</b> —{" "}
                                    {selectedSpec.missionSpecs?.missionType ?? "—"}
                                  </p>
                                </div>
                              )}
                          </div>

                          <div className="hgr-c-status-panel">
                            <div className="hgr-c-status-panel-title">
                              {STAGE_TITLES[activeStage]}
                            </div>
                            <StatusPanelBody flow={flow} activeStage={activeStage} />

                            {activeStage === "trade_off_reasoning" &&
                              flow.stage2.status === "pending" && (
                                <ProceedRow
                                  label="Proceed to Trade-off Reasoning →"
                                  onClick={proceedToStage2}
                                />
                              )}
                            {activeStage === "trade_off_reasoning" &&
                              flow.stage2.status === "error" && (
                                <StageErrorCard
                                  title="Couldn't complete Trade-off Reasoning."
                                  message={flow.stage2.errorMessage}
                                  onRetry={proceedToStage2}
                                />
                              )}
                            {activeStage === "ranking_scoring" &&
                              flow.stage3.status === "pending" && (
                                <ProceedRow
                                  label="Proceed to Ranking & Scoring →"
                                  onClick={proceedToStage3}
                                />
                              )}
                            {activeStage === "ranking_scoring" &&
                              flow.stage3.status === "error" && (
                                <StageErrorCard
                                  title="Couldn't complete Ranking & Scoring."
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

                        <div className="hgr-c-findings-track">
                          {flow.stage1.result && <Stage1Findings result={flow.stage1.result} />}
                          {flow.stage2.result && <Stage2Findings result={flow.stage2.result} />}
                          {flow.stage3.result && <Stage3Findings result={flow.stage3.result} />}
                        </div>
                      </>
                    )}

                    {activeStage === "done" && flow.stage4.result && (
                      <ConceptDashboard
                        result={flow.stage4.result}
                        sourceMissionId={selectedSpec?.missionId ?? null}
                        generatedAt={flow.generatedAt}
                        telemetry={computeTelemetry(flow)}
                        onStartNew={resetFlow}
                        onEditAndRegenerate={editAndRegenerate}
                        finalizeState={finalizeState}
                        onSaveAsFinal={saveAsFinal}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function ListPanel({
  title,
  expanded,
  onToggleExpanded,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggleExpanded: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="hgr-c-collapsible" style={{ marginBottom: 20 }}>
      <button
        type="button"
        className="hgr-c-collapsible-title"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
      >
        <span>{title}</span>
        <span className={`hgr-c-arrow${expanded ? " hgr-c-arrow-open" : ""}`}>▸</span>
      </button>
      {expanded && <div className="hgr-c-list">{children}</div>}
    </div>
  );
}

function StatusPanelBody({
  flow,
  activeStage,
}: {
  flow: ConceptFlowState;
  activeStage: StageKey | "done";
}) {
  if (activeStage === "done") return null;
  const slot =
    activeStage === "concept_ideation"
      ? flow.stage1
      : activeStage === "trade_off_reasoning"
        ? flow.stage2
        : activeStage === "ranking_scoring"
          ? flow.stage3
          : flow.stage4;

  if (slot.status === "running") {
    return (
      <div className="hgr-c-status-step hgr-c-status-step-active">
        <span className="hgr-c-status-icon">
          <span className="hgr-c-status-spinner" />
        </span>
        <span className="hgr-c-status-text">Processing…</span>
      </div>
    );
  }
  if (slot.status === "error") {
    return <p className="hgr-c-status-idle">Stopped — see the error below, then retry.</p>;
  }
  if (activeStage === "concept_ideation") {
    return <p className="hgr-c-status-idle">Select a saved spec, then generate to begin.</p>;
  }
  return <p className="hgr-c-status-idle">Waiting for you to review the findings and proceed.</p>;
}

function ProceedRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="hgr-c-proceed-row">
      <button type="button" className="hgr-c-btn hgr-c-btn-amber" onClick={onClick}>
        {label}
      </button>
    </div>
  );
}

// NEW — both of this page's list-fetch failures previously rendered
// nothing at all. Retrofitted in the same pass Bay 03's aircraft-design
// page introduced this pattern.
function ListFetchError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="hgr-c-list-fetch-error">
      <p>Couldn't load this list — check your connection and try again.</p>
      <button type="button" className="hgr-c-btn hgr-c-btn-ghost" onClick={onRetry}>
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
    <div className="hgr-c-error">
      <b>{title}</b>
      <p>{message}</p>
      <button type="button" className="hgr-c-btn hgr-c-btn-ghost" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

function MockBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="hgr-c-findings-mock">Simulated response — no ANTHROPIC_API_KEY reply</span>
  );
}

function FitBadge({ fit }: { fit: ConstraintFit }) {
  return <span className={`hgr-c-fit-badge hgr-c-fit-badge-${fit}`}>{FIT_LABEL[fit]}</span>;
}

// Green = this stage's finding came back from a real Claude call; amber =
// it fell back to that call's mock — same at-a-glance color-coding as the
// "AI" live-status badge above, per-stage instead of per-page. Only
// Stage 1/2 (the LLM stages) use this; Stage 3 (deterministic ranking) has
// no mock/live state to show, so it keeps the plain neutral badge.
function StageStatusBadge({ num, mock }: { num: number; mock: boolean }) {
  return (
    <span
      className={`hgr-c-findings-badge ${mock ? "hgr-c-findings-badge-mock" : "hgr-c-findings-badge-live"}`}
      title={mock ? "Simulated — no ANTHROPIC_API_KEY reply" : "Live — real Claude response"}
    >
      {num}
    </span>
  );
}

// Export the spec as PDF / Word / Excel. Generated in the browser from the
// spec already on screen; the export libraries load on click, not with the
// page — direct port of Mission Agent's ExportButtons.
function ExportButtons({ input }: { input: ConceptExportInput }) {
  const [busy, setBusy] = useState<ConceptExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(format: ConceptExportFormat) {
    if (busy) return;
    setBusy(format);
    setError(null);
    try {
      const { blob, fileName } = await exportConcept(format, buildConceptExportModel(input));
      downloadBlob(fileName, blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <span className="hgr-c-export">
      <span className="hgr-c-export-label">Export</span>
      {(Object.keys(EXPORT_FORMAT_META) as ConceptExportFormat[]).map((format) => (
        <button
          key={format}
          type="button"
          className="hgr-c-btn hgr-c-btn-ghost"
          disabled={busy !== null}
          onClick={() => run(format)}
          title={`Download this spec as ${EXPORT_FORMAT_META[format].label}`}
        >
          {busy === format ? "Preparing…" : EXPORT_FORMAT_META[format].label}
        </button>
      ))}
      {error && <span className="hgr-c-export-error">Couldn't export: {error}</span>}
    </span>
  );
}

function Stage1Findings({ result }: { result: Stage1Result }) {
  return (
    <div className="hgr-c-findings-card">
      <div className="hgr-c-findings-card-head">
        <span className="hgr-c-findings-title">
          <StageStatusBadge num={1} mock={result.mock} />
          Concept Ideation
        </span>
        <MockBadge show={result.mock} />
      </div>
      <div className="hgr-c-findings-body">
        {result.candidates.map((c: CandidateConcept, i: number) => (
          <div key={i} className="hgr-c-findings-row">
            <b>{c.conceptName}</b>
            <span>
              {c.vehicleClass} — {c.description}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stage2Findings({ result }: { result: Stage2Result }) {
  return (
    <div className="hgr-c-findings-card">
      <div className="hgr-c-findings-card-head">
        <span className="hgr-c-findings-title">
          <StageStatusBadge num={2} mock={result.mock} />
          Trade-off Reasoning
        </span>
        <MockBadge show={result.mock} />
      </div>
      <div className="hgr-c-findings-body">
        {result.notes.map((n: ConceptTradeoffNote, i: number) => (
          <div key={i} className="hgr-c-findings-row">
            <b>{n.conceptName}</b>
            <span>
              <FitBadge fit={n.constraintFit} /> · Fit {n.fitScore}/10
            </span>
            <ul className="hgr-c-proscons">
              {n.prosCons.map((p, j) => (
                <li key={j}>{p}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stage3Findings({ result }: { result: Stage3Result }) {
  return (
    <div className="hgr-c-findings-card">
      <div className="hgr-c-findings-card-head">
        <span className="hgr-c-findings-title">
          <span className="hgr-c-findings-badge">3</span>Ranking &amp; Scoring
        </span>
      </div>
      <div className="hgr-c-findings-body">
        {result.rankedConcepts.map((r: RankedConcept) => (
          <div key={r.conceptName} className="hgr-c-findings-row">
            <b>
              #{r.rank} — {r.conceptName}
            </b>
            <span>
              <FitBadge fit={r.constraintFit} /> · Fit {r.fitScore}/10
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankedConceptsSection({ rankedConcepts }: { rankedConcepts: RankedConcept[] }) {
  return (
    <div className="hgr-c-rank-list">
      {rankedConcepts.map((r) => (
        <div
          key={r.conceptName}
          className={`hgr-c-rank-card${r.rank === 1 ? " hgr-c-rank-card-top" : ""}`}
        >
          <div className="hgr-c-rank-num">#{r.rank}</div>
          <div className="hgr-c-rank-body">
            <div className="hgr-c-rank-name">{r.conceptName}</div>
            <p className="hgr-c-rank-desc">{r.description}</p>
            <div className="hgr-c-rank-meta">
              <FitBadge fit={r.constraintFit} />
              <span className="hgr-c-rank-score">Fit {r.fitScore}/10</span>
            </div>
            <p className="hgr-c-rank-rationale">{r.rationale}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ConceptDashboard({
  result,
  sourceMissionId,
  generatedAt,
  telemetry,
  onStartNew,
  onEditAndRegenerate,
  finalizeState,
  onSaveAsFinal,
}: {
  result: Stage4Result;
  sourceMissionId: string | null;
  generatedAt: string | null;
  telemetry: ConceptTelemetry | null;
  onStartNew: () => void;
  onEditAndRegenerate: () => void;
  finalizeState: { status: "idle" | "saving" | "saved" | "error"; errorMessage: string | null };
  onSaveAsFinal: () => void;
}) {
  const top = result.rankedConcepts[0];
  return (
    <div className="hgr-c-dash">
      <TelemetryBar telemetry={telemetry} />

      <div className="hgr-c-dash-header">
        <div>
          <div className="hgr-c-dash-badge">Spec Ready</div>
          <h3>{top?.conceptName ?? result.conceptCode}</h3>
          <div className="hgr-c-dash-id">
            {result.conceptCode}
            {generatedAt && (
              <span className="hgr-c-dash-generated-at"> · Generated {formatGeneratedAt(generatedAt)}</span>
            )}
          </div>
        </div>
        <div className="hgr-c-dash-confidence">
          <div className="hgr-c-dash-confidence-num">
            {Math.round(result.confidenceScore * 100)}%
          </div>
          <div className="hgr-c-dash-confidence-label">Confidence</div>
          {sourceMissionId && (
            <Link
              to="/the-hangar/bernoulli"
              search={{ source: "concept", missionId: sourceMissionId, sourceId: "" }}
              className="hgr-c-dash-bernoulli-link"
              style={
                finalizeState.status === "saved" ? { pointerEvents: "none", opacity: 0.4 } : undefined
              }
              aria-disabled={finalizeState.status === "saved"}
              title={
                finalizeState.status === "saved"
                  ? "This concept is finalized — a physics check on a locked spec isn't useful groundwork anymore."
                  : "Sanity-check this concept's source mission spec against conservation laws and aerospace empiricals."
              }
            >
              Ask Bernoulli →
            </Link>
          )}
        </div>
      </div>

      <div className="hgr-c-dash-section">
        <h4>Ranked Concepts ({result.rankedConcepts.length})</h4>
        <RankedConceptsSection rankedConcepts={result.rankedConcepts} />
      </div>

      <div className="hgr-c-dash-actions">
        <button
          type="button"
          className={`hgr-c-btn ${finalizeState.status === "saved" ? "hgr-c-btn-ghost" : "hgr-c-btn-amber"}`}
          onClick={onSaveAsFinal}
          disabled={finalizeState.status === "saving" || finalizeState.status === "saved"}
          title="Confirms this version as final — a status flip on the concept record, not a new row."
        >
          {finalizeState.status === "saving"
            ? "Saving…"
            : finalizeState.status === "saved"
              ? "Saved as final ✓"
              : "Save as final"}
        </button>
        <button type="button" className="hgr-c-btn hgr-c-btn-ghost" onClick={onEditAndRegenerate}>
          Edit and regenerate
        </button>
        <button
          type="button"
          className="hgr-c-btn hgr-c-btn-ghost"
          disabled
          title="Bay 03 not yet built"
        >
          Continue to Aircraft Design Agent →
        </button>
        <button type="button" className="hgr-c-btn hgr-c-btn-amber" onClick={onStartNew}>
          Start a new concept
        </button>
        <ExportButtons
          input={{
            conceptCode: result.conceptCode,
            generatedAt,
            confidenceScore: result.confidenceScore,
            version: result.specVersion,
            candidates: result.candidates,
            tradeoffNotes: result.tradeoffNotes,
            rankedConcepts: result.rankedConcepts,
          }}
        />
        {sourceMissionId && (
          <Link
            to="/the-hangar/bernoulli"
            search={{ source: "concept", missionId: sourceMissionId, sourceId: "" }}
            className="hgr-c-btn hgr-c-dash-bernoulli-link"
            style={
              finalizeState.status === "saved" ? { pointerEvents: "none", opacity: 0.4 } : undefined
            }
            aria-disabled={finalizeState.status === "saved"}
            title={
              finalizeState.status === "saved"
                ? "This concept is finalized — a physics check on a locked spec isn't useful groundwork anymore."
                : "Sanity-check this concept's source mission spec against conservation laws and aerospace empiricals."
            }
          >
            Ask Bernoulli →
          </Link>
        )}
      </div>
      {finalizeState.status === "error" && (
        <p className="hgr-c-dash-finalize-error">
          Couldn't save as final: {finalizeState.errorMessage}
        </p>
      )}
    </div>
  );
}

// Read-only view of a past concept, opened from "Your concepts" — reuses
// RankedConceptsSection so a historical spec looks the same as one you
// just generated. No Save-as-final/Edit-and-regenerate here, same
// reasoning as Mission Agent's PastMissionDetail.
function PastConceptDetail({ concept, onBack }: { concept: ConceptListEntry; onBack: () => void }) {
  const hasSpec = concept.rankedConcepts && concept.rankedConcepts.length > 0;
  return (
    <div className="hgr-c-dash">
      <div className="hgr-c-dash-header">
        <div>
          <div className="hgr-c-dash-badge">
            {CONCEPT_STATUS_LABEL[concept.status] ?? concept.status}
          </div>
          <h3>{concept.rankedConcepts?.[0]?.conceptName ?? concept.conceptCode}</h3>
          <div className="hgr-c-dash-id">
            {concept.conceptCode}
            <span className="hgr-c-dash-generated-at"> · Generated {formatGeneratedAt(concept.createdAt)}</span>
          </div>
        </div>
        {concept.confidenceScore !== null && (
          <div className="hgr-c-dash-confidence">
            <div className="hgr-c-dash-confidence-num">
              {Math.round(concept.confidenceScore * 100)}%
            </div>
            <div className="hgr-c-dash-confidence-label">Confidence</div>
            {hasSpec && (
              <Link
                to="/the-hangar/bernoulli"
                search={{ source: "concept", missionId: concept.sourceMissionId, sourceId: "" }}
                className="hgr-c-dash-bernoulli-link"
                style={
                  concept.status === "finalized"
                    ? { pointerEvents: "none", opacity: 0.4 }
                    : undefined
                }
                aria-disabled={concept.status === "finalized"}
                title={
                  concept.status === "finalized"
                    ? "This concept is finalized — a physics check on a locked spec isn't useful groundwork anymore."
                    : "Sanity-check this concept's source mission spec against conservation laws and aerospace empiricals."
                }
              >
                Ask Bernoulli →
              </Link>
            )}
          </div>
        )}
      </div>
      {hasSpec ? (
        <div className="hgr-c-dash-section">
          <h4>Ranked Concepts ({concept.rankedConcepts!.length})</h4>
          <RankedConceptsSection rankedConcepts={concept.rankedConcepts!} />
        </div>
      ) : (
        <div className="hgr-c-dash-section">
          <p className="hgr-c-dash-empty">
            No spec was generated for this concept — its status is "
            {CONCEPT_STATUS_LABEL[concept.status] ?? concept.status}".
          </p>
        </div>
      )}
      <div className="hgr-c-dash-actions">
        <button type="button" className="hgr-c-btn hgr-c-btn-ghost" onClick={onBack}>
          ← Back to Your concepts
        </button>
        {hasSpec && (
          <ExportButtons
            input={{
              conceptCode: concept.conceptCode,
              generatedAt: concept.createdAt,
              confidenceScore: concept.confidenceScore ?? 0,
              version: concept.specVersion,
              candidates: concept.candidateConcepts ?? [],
              tradeoffNotes: concept.tradeOffNotes ?? [],
              rankedConcepts: concept.rankedConcepts ?? [],
            }}
          />
        )}
      </div>
    </div>
  );
}

const HGR_CONCEPT_CSS = `
.hgr-c{
  --hgr-c-navy-deep:#08131F; --hgr-c-navy-panel:#0F2136;
  --hgr-c-blue-line:#3E7CA6; --hgr-c-blue-bright:#6FB4E0;
  --hgr-c-amber:#E8A33D; --hgr-c-amber-bright:#F6C374;
  --hgr-c-paper:#ECEFF3; --hgr-c-paper-dim:#8FA5BB;
  --hgr-c-green:#5FBF8F; --hgr-c-red:#E0715A;
  --hgr-c-bernoulli:#9B7FE8; --hgr-c-bernoulli-bright:#B6A2F2;
  --hgr-c-grid:rgba(111,180,224,0.08); --hgr-c-hairline:rgba(111,180,224,0.20);

  background:var(--hgr-c-navy-deep); color:var(--hgr-c-paper); font-family:'IBM Plex Sans', sans-serif;
  background-image:linear-gradient(var(--hgr-c-grid) 1px, transparent 1px), linear-gradient(90deg, var(--hgr-c-grid) 1px, transparent 1px);
  background-size:44px 44px;
  min-height:100vh;
}
.hgr-c *{ box-sizing:border-box; }
.hgr-c h1,.hgr-c h2,.hgr-c h3{ font-family:'Space Grotesk', sans-serif; font-weight:600; letter-spacing:-0.01em; margin:0; }
.hgr-c-mono{ font-family:'IBM Plex Mono', monospace; }
.hgr-c-wrap{ max-width:1180px; margin:0 auto; padding:0 32px; }
.hgr-c a{ color:inherit; }

.hgr-c nav{ border-bottom:1px solid var(--hgr-c-hairline); position:sticky; top:0; background:rgba(8,19,31,0.9); backdrop-filter:blur(8px); z-index:20; }
.hgr-c nav .hgr-c-wrap{ display:flex; align-items:center; justify-content:space-between; height:68px; }
.hgr-c-crumbs{ font-size:14px; color:var(--hgr-c-paper-dim); display:flex; align-items:center; gap:8px; }
.hgr-c-crumbs a{ text-decoration:none; color:var(--hgr-c-paper-dim); }
.hgr-c-crumbs a:hover{ color:var(--hgr-c-blue-bright); }
.hgr-c-sep{ color:var(--hgr-c-blue-line); }
.hgr-c-cur{ color:var(--hgr-c-paper); font-weight:500; }
.hgr-c-exit{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-c-paper-dim); text-decoration:none; border:1px solid var(--hgr-c-hairline); padding:8px 15px; border-radius:2px; }
.hgr-c-exit:hover{ color:var(--hgr-c-paper); border-color:var(--hgr-c-blue-bright); }

.hgr-c main{ padding-bottom:100px; }
.hgr-c-hero{ padding:56px 0 20px; border-bottom:1px solid var(--hgr-c-hairline); position:relative; overflow:hidden; }
.hgr-c-doors{ position:absolute; inset:0; z-index:5; display:flex; pointer-events:none; }
.hgr-c-door{ flex:1; background: repeating-linear-gradient(90deg, #0C1E30 0 78px, #08131F 78px 80px); position:relative; }
.hgr-c-door::after{ content:""; position:absolute; top:0; bottom:0; width:2px; background:var(--hgr-c-blue-line); opacity:.5; }
.hgr-c-door-left{ animation: hgr-c-openLeft 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
.hgr-c-door-right{ animation: hgr-c-openRight 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
.hgr-c-door-left::after{ right:0; }
.hgr-c-door-right::after{ left:0; }
@keyframes hgr-c-openLeft{ from{ transform:translateX(0);} to{ transform:translateX(-100%);} }
@keyframes hgr-c-openRight{ from{ transform:translateX(0);} to{ transform:translateX(100%);} }
@media (prefers-reduced-motion: reduce){ .hgr-c-doors{ display:none; } }
.hgr-c-status-row{ display:flex; align-items:center; gap:12px; margin-bottom:22px; flex-wrap:wrap; }
.hgr-c-badge{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; letter-spacing:.1em; text-transform:uppercase; padding:6px 13px; border-radius:2px; display:inline-flex; align-items:center; gap:8px; }
.hgr-c-badge-bay{ color:var(--hgr-c-paper-dim); border:1px solid var(--hgr-c-hairline); }
.hgr-c-badge-ai{ font-weight:700; }
.hgr-c-badge-ai-dot{ width:7px; height:7px; border-radius:50%; flex-shrink:0; }
.hgr-c-badge-ai-checking{ color:var(--hgr-c-paper-dim); border:1px solid var(--hgr-c-hairline); }
.hgr-c-badge-ai-checking .hgr-c-badge-ai-dot{ background:var(--hgr-c-paper-dim); }
.hgr-c-badge-ai-live{ color:#4ADE80; border:1px solid rgba(74,222,128,.4); background:rgba(74,222,128,.08); }
.hgr-c-badge-ai-live .hgr-c-badge-ai-dot{ background:#4ADE80; box-shadow:0 0 6px rgba(74,222,128,.8); animation:hgr-c-ai-pulse 2s ease-in-out infinite; }
.hgr-c-badge-ai-offline{ color:var(--hgr-c-amber); border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); }
.hgr-c-badge-ai-offline .hgr-c-badge-ai-dot{ background:var(--hgr-c-amber); box-shadow:0 0 6px rgba(232,163,61,.6); }
@keyframes hgr-c-ai-pulse{ 0%,100%{ opacity:1; } 50%{ opacity:.4; } }
.hgr-c-hero-row{ display:flex; align-items:center; gap:48px; flex-wrap:wrap; }
@media(max-width:760px){ .hgr-c-hero-row{ flex-direction:column; align-items:flex-start; gap:16px; } }
.hgr-c-hero h1{ font-size:clamp(34px,5vw,58px); margin:0; flex-shrink:0; }
.hgr-c-hero .hgr-c-lead{ color:var(--hgr-c-paper-dim); font-size:15.5px; max-width:480px; line-height:1.6; margin:0; flex:1; min-width:280px; }
.hgr-c-hero .hgr-c-lead b{ color:var(--hgr-c-paper); font-weight:600; }

.hgr-c section{ padding:60px 0; }
#generate-concept{ padding-top:32px; }
.hgr-c-kicker{ font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--hgr-c-amber); margin-bottom:12px; }
.hgr-c-sec-title{ font-size:clamp(22px,2.6vw,30px); margin-bottom:10px; }
.hgr-c-sec-sub{ color:var(--hgr-c-paper-dim); font-size:14.5px; max-width:640px; margin-bottom:36px; }
.hgr-c-empty-hint{ color:var(--hgr-c-paper-dim); font-size:13.5px; margin-bottom:24px; }
.hgr-c-empty-hint a{ color:var(--hgr-c-blue-bright); }

.hgr-c-btn{ font-family:'IBM Plex Mono',monospace; font-size:13px; padding:12px 22px; border-radius:2px; display:inline-flex; align-items:center; gap:8px; text-decoration:none; border:1px solid transparent; cursor:pointer; background:none; }
.hgr-c-btn-ghost{ border:1px solid var(--hgr-c-hairline); color:var(--hgr-c-paper-dim); }
.hgr-c-btn-ghost:hover{ color:var(--hgr-c-paper); border-color:var(--hgr-c-blue-bright); }
.hgr-c-btn-amber{ background:var(--hgr-c-amber); color:var(--hgr-c-navy-deep); font-weight:600; }
.hgr-c-btn-amber:hover{ background:var(--hgr-c-amber-bright); }
.hgr-c-btn:disabled{ opacity:.4; cursor:not-allowed; }
.hgr-c-btn:disabled:hover{ color:var(--hgr-c-paper-dim); border-color:var(--hgr-c-hairline); }

/* ── Collapsible panels (Your saved specs / Your concepts / Generate a concept) ── */
.hgr-c-collapsible{ border:1px solid var(--hgr-c-hairline); background:var(--hgr-c-navy-panel); border-radius:2px; margin-bottom:32px; }
.hgr-c-collapsible-title{ display:flex; align-items:center; justify-content:space-between; width:100%; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-c-paper-dim); padding:14px 18px; border:none; background:none; cursor:pointer; }
.hgr-c-collapsible-title:hover{ color:var(--hgr-c-paper); }
.hgr-c-collapsible-body{ padding: 0 0 0; }
.hgr-c-arrow{ display:inline-block; font-size:11px; transition:transform .15s; }
.hgr-c-arrow-open{ transform:rotate(90deg); }
.hgr-c-list{ max-height:260px; overflow-y:auto; border-top:1px solid var(--hgr-c-hairline); }
.hgr-c-list-row{ display:grid; grid-template-columns:1.2fr 2fr 0.7fr 1fr; align-items:center; gap:12px; width:100%; padding:12px 18px; border:none; border-bottom:1px dashed var(--hgr-c-hairline); background:none; cursor:pointer; text-align:left; font-family:'IBM Plex Sans',sans-serif; transition:background .15s; }
.hgr-c-list-row:last-child{ border-bottom:none; }
.hgr-c-list-row:hover{ background:rgba(111,180,224,.07); }
@media(max-width:700px){ .hgr-c-list-row{ grid-template-columns:1fr 1fr; row-gap:4px; } }
.hgr-c-list-row-code{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-c-blue-bright); }
.hgr-c-list-row-type{ font-size:13px; color:var(--hgr-c-paper); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hgr-c-list-row-status{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.05em; text-transform:uppercase; color:var(--hgr-c-paper-dim); border:1px solid var(--hgr-c-hairline); padding:3px 8px; border-radius:2px; justify-self:start; white-space:nowrap; }
.hgr-c-list-row-status-spec_ready{ color:var(--hgr-c-blue-bright); border-color:rgba(111,180,224,.4); }
.hgr-c-list-row-status-finalized{ color:var(--hgr-c-amber-bright); border-color:rgba(232,163,61,.4); }
.hgr-c-list-row-status-error{ color:var(--hgr-c-amber); border-color:rgba(232,163,61,.4); }
.hgr-c-list-row-confidence{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-c-paper-dim); }
.hgr-c-list-row-date{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-c-paper-dim); text-align:right; }

/* ── Stage tracker ── */
.hgr-c-stage-tracker{ display:flex; gap:1px; background:var(--hgr-c-hairline); border:1px solid var(--hgr-c-hairline); margin-bottom:28px; }
.hgr-c-stage-tracker-item{ flex:1; background:var(--hgr-c-navy-panel); padding:12px 10px; text-align:center; }
.hgr-c-stage-tracker-num{ width:24px; height:24px; border-radius:50%; margin:0 auto 6px; display:flex; align-items:center; justify-content:center; font-family:'IBM Plex Mono',monospace; font-size:14px; font-weight:700; border:1.5px solid var(--hgr-c-hairline); color:transparent; transition:.2s; }
.hgr-c-stage-tracker-label{ font-size:12px; color:var(--hgr-c-paper-dim); }
.hgr-c-stage-tracker-item-complete{ background:#132A44; }
.hgr-c-stage-tracker-item-complete .hgr-c-stage-tracker-label{ color:var(--hgr-c-paper); }
.hgr-c-stage-tracker-item-complete .hgr-c-stage-tracker-num{ background:var(--hgr-c-blue-bright); border-color:var(--hgr-c-blue-bright); color:var(--hgr-c-navy-deep); box-shadow:0 0 10px rgba(111,180,224,0.5); }
.hgr-c-stage-tracker-item-active{ background:#1B3A57; box-shadow:inset 0 0 0 1px rgba(232,163,61,.4); }
.hgr-c-stage-tracker-item-active .hgr-c-stage-tracker-label{ color:var(--hgr-c-paper); }
.hgr-c-stage-tracker-item-active .hgr-c-stage-tracker-num{ border-color:var(--hgr-c-amber); }

/* ── Per-stage usage table + export buttons ── */
.hgr-c-usage-table{
  width:100%; border-collapse:collapse; margin:0 0 20px; background:var(--hgr-c-navy-deep);
  border:1px solid var(--hgr-c-hairline); font-size:13px;
}
.hgr-c-usage-table th, .hgr-c-usage-table td{ padding:9px 16px; text-align:left; border-bottom:1px solid var(--hgr-c-hairline); }
.hgr-c-usage-table th{
  font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.06em; text-transform:uppercase;
  color:var(--hgr-c-paper-dim); font-weight:400;
}
.hgr-c-usage-table tfoot td{ border-bottom:0; font-weight:600; }
.hgr-c-usage-table .hgr-c-usage-num{ text-align:right; font-variant-numeric:tabular-nums; }
.hgr-c-usage-mock{
  margin-left:10px; font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.05em; text-transform:uppercase;
  color:var(--hgr-c-amber); border:1px solid rgba(232,163,61,.4); padding:2px 6px; border-radius:2px;
}
.hgr-c-usage-split{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; color:var(--hgr-c-paper-dim); }
.hgr-c-export{ display:inline-flex; align-items:center; gap:8px; flex-wrap:wrap; }
.hgr-c-export-label{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-c-paper-dim); }
.hgr-c-export-error{ font-size:12.5px; color:#ffb4b4; }

/* ── Process grid + selected-spec / status panel ── */
.hgr-c-process-grid{ display:grid; grid-template-columns:1fr 320px; gap:32px; align-items:start; }
@media(max-width:820px){ .hgr-c-process-grid{ grid-template-columns:1fr; } }
.hgr-c-selected-spec{ max-width:640px; padding:14px 16px; border:1px solid rgba(111,180,224,.3); border-left:3px solid var(--hgr-c-blue-bright); background:rgba(111,180,224,.09); border-radius:2px; margin-bottom:20px; }
.hgr-c-selected-spec-label{ display:block; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-c-blue-bright); margin-bottom:8px; }
.hgr-c-selected-spec p{ margin:0 0 14px; font-size:14px; color:var(--hgr-c-paper); line-height:1.6; }

.hgr-c-status-panel{ border:1px solid var(--hgr-c-hairline); background:var(--hgr-c-navy-panel); border-radius:2px; padding:20px; }
.hgr-c-status-panel-title{ font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-c-paper-dim); margin-bottom:16px; }
.hgr-c-status-idle{ color:var(--hgr-c-paper-dim); font-size:13px; line-height:1.6; margin:0; }
.hgr-c-status-step{ display:flex; align-items:flex-start; gap:10px; padding:9px 0; }
.hgr-c-status-icon{ width:18px; height:18px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; margin-top:1px; border-radius:50%; }
.hgr-c-status-spinner{ width:13px; height:13px; border-radius:50%; border:2px solid var(--hgr-c-hairline); border-top-color:var(--hgr-c-amber); animation:hgr-c-spin 0.8s linear infinite; }
.hgr-c-status-text{ font-size:12.5px; line-height:1.5; color:var(--hgr-c-paper-dim); }
.hgr-c-status-step-active .hgr-c-status-text{ color:var(--hgr-c-paper); }
.hgr-c-proceed-row{ display:flex; align-items:center; gap:14px; margin-top:16px; }
.hgr-c-status-panel .hgr-c-proceed-row .hgr-c-btn{ width:100%; justify-content:center; }
.hgr-c-status-panel .hgr-c-error{ max-width:none; margin-top:16px; padding:16px 18px; }

/* ── Findings cards ── */
.hgr-c-findings-track{ display:flex; flex-wrap:wrap; gap:16px; margin-top:28px; align-items:flex-start; }
.hgr-c-findings-track .hgr-c-findings-card{ flex:1 1 320px; max-width:380px; animation:hgr-c-findings-in .4s ease both; }
@keyframes hgr-c-findings-in{ from{ opacity:0; transform:translateY(10px) scale(.98); } to{ opacity:1; transform:none; } }
.hgr-c-findings-card{ border:1px solid var(--hgr-c-hairline); background:var(--hgr-c-navy-panel); border-radius:2px; padding:20px 22px; }
.hgr-c-findings-card-head{ display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px; flex-wrap:wrap; }
.hgr-c-findings-title{ font-family:'Space Grotesk',sans-serif; font-size:15px; font-weight:600; display:flex; align-items:center; gap:10px; }
.hgr-c-findings-badge{ width:22px; height:22px; border-radius:50%; background:var(--hgr-c-blue-bright); color:var(--hgr-c-navy-deep); display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; flex-shrink:0; box-shadow:0 0 8px rgba(111,180,224,0.5); }
.hgr-c-findings-badge-live{ background:#4ADE80; box-shadow:0 0 8px rgba(74,222,128,.5); }
.hgr-c-findings-badge-mock{ background:var(--hgr-c-amber); box-shadow:0 0 8px rgba(232,163,61,.5); }
.hgr-c-findings-mock{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.05em; text-transform:uppercase; color:var(--hgr-c-amber); border:1px solid rgba(232,163,61,.4); padding:3px 8px; border-radius:2px; }
.hgr-c-findings-body{ font-size:13px; color:var(--hgr-c-paper-dim); }
.hgr-c-findings-row{ padding:8px 0; border-top:1px dashed var(--hgr-c-hairline); }
.hgr-c-findings-row:first-child{ border-top:none; }
.hgr-c-findings-row b{ display:block; color:var(--hgr-c-paper); font-weight:600; font-size:13px; margin-bottom:4px; }
.hgr-c-findings-row > span{ color:var(--hgr-c-paper-dim); font-size:12.5px; line-height:1.6; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.hgr-c-proscons{ margin:6px 0 0; padding-left:16px; }
.hgr-c-proscons li{ font-size:12px; color:var(--hgr-c-paper-dim); line-height:1.6; }

/* ── Fit badges ── */
.hgr-c-fit-badge{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.05em; text-transform:uppercase; padding:3px 8px; border-radius:2px; border:1px solid; }
.hgr-c-fit-badge-pass{ color:var(--hgr-c-green); border-color:rgba(95,191,143,.4); }
.hgr-c-fit-badge-partial{ color:var(--hgr-c-amber); border-color:rgba(232,163,61,.4); }
.hgr-c-fit-badge-fail{ color:var(--hgr-c-red); border-color:rgba(224,113,90,.4); }

/* ── Error ── */
@keyframes hgr-c-spin{ to{ transform:rotate(360deg); } }
.hgr-c-error{ border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; padding:20px 22px; max-width:640px; margin-top:20px; }
.hgr-c-list-fetch-error{ display:flex; align-items:center; justify-content:space-between; gap:16px; padding:14px 18px; margin-bottom:20px; border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; }
.hgr-c-list-fetch-error p{ margin:0; color:var(--hgr-c-paper-dim); font-size:13.5px; }
.hgr-c-error b{ color:var(--hgr-c-amber-bright); display:block; margin-bottom:6px; font-size:14px; }
.hgr-c-error p{ color:var(--hgr-c-paper-dim); font-size:13.5px; margin:0 0 16px; line-height:1.6; }

/* ── Dashboard ── */
.hgr-c-dash{ border:1px solid var(--hgr-c-hairline); background:var(--hgr-c-navy-panel); }
.hgr-c-telemetry{
  display:flex; flex-wrap:wrap; gap:1px; background:var(--hgr-c-hairline);
  border-bottom:1px solid var(--hgr-c-hairline);
}
.hgr-c-telemetry-item{
  flex:1; min-width:110px; background:var(--hgr-c-navy-deep); padding:12px 16px;
  display:flex; flex-direction:column; gap:2px;
}
.hgr-c-telemetry-num{ font-family:'Space Grotesk',sans-serif; font-size:17px; font-weight:600; }
.hgr-c-telemetry-label{
  font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.06em; text-transform:uppercase;
  color:var(--hgr-c-paper-dim);
}
.hgr-c-dash-header{ display:flex; align-items:flex-start; justify-content:space-between; gap:24px; padding:26px 28px; border-bottom:1px solid var(--hgr-c-hairline); flex-wrap:wrap; }
.hgr-c-dash-badge{ display:inline-block; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-c-blue-bright); border:1px solid rgba(111,180,224,.4); padding:4px 10px; border-radius:2px; margin-bottom:10px; }
.hgr-c-dash-header h3{ font-size:20px; margin-bottom:6px; }
.hgr-c-dash-id{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-c-paper-dim); }
.hgr-c-dash-generated-at{ opacity:.75; }
.hgr-c-dash-confidence{ text-align:center; flex-shrink:0; }
.hgr-c-dash-confidence-num{ font-family:'Space Grotesk',sans-serif; font-size:32px; font-weight:700; color:var(--hgr-c-amber-bright); line-height:1; }
.hgr-c-dash-confidence-label{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-c-paper-dim); }
.hgr-c-dash-bernoulli-link{
  display:inline-flex; align-items:center; gap:6px; margin-top:10px; font-family:'IBM Plex Mono',monospace;
  font-size:12.5px; font-weight:700; color:#160F2E; text-decoration:none;
  background:var(--hgr-c-bernoulli); border:1px solid var(--hgr-c-bernoulli); border-radius:2px;
  padding:9px 16px; white-space:nowrap; box-shadow:0 0 14px rgba(155,127,232,.45);
  transition:background .2s, box-shadow .2s;
}
.hgr-c-dash-bernoulli-link:hover{
  background:var(--hgr-c-bernoulli-bright); border-color:var(--hgr-c-bernoulli-bright);
  box-shadow:0 0 18px rgba(155,127,232,.65);
}
/* In the bottom actions row (alongside Save as final / Edit and
   regenerate / etc.) it needs to match those .hgr-c-btn siblings' exact
   size, not the smaller/offset version used under the confidence score —
   same fix already applied to Mission Agent's equivalent. */
.hgr-c-dash-actions .hgr-c-dash-bernoulli-link{
  margin-top:0; padding:12px 22px; font-size:13px;
}
.hgr-c-dash-section{ padding:24px 28px; border-bottom:1px solid var(--hgr-c-hairline); }
.hgr-c-dash-section:last-of-type{ border-bottom:none; }
.hgr-c-dash-section h4{ font-family:'Space Grotesk',sans-serif; font-size:14.5px; font-weight:600; margin-bottom:16px; }
.hgr-c-dash-empty{ color:var(--hgr-c-paper-dim); font-size:13px; margin:0; }
.hgr-c-dash-actions{ display:flex; flex-wrap:wrap; gap:12px; padding:24px 28px; }
.hgr-c-dash-finalize-error{ margin:0 28px 24px; color:var(--hgr-c-amber-bright); font-size:13px; }

/* ── Ranked concept cards ── */
.hgr-c-rank-list{ display:flex; flex-direction:column; gap:14px; }
.hgr-c-rank-card{ display:flex; gap:16px; padding:18px 20px; background:var(--hgr-c-navy-deep); border:1px solid var(--hgr-c-hairline); border-radius:2px; }
.hgr-c-rank-card-top{ box-shadow:inset 0 0 0 1px rgba(232,163,61,.4); background:#1A1509; }
.hgr-c-rank-num{ font-family:'Space Grotesk',sans-serif; font-size:22px; font-weight:700; color:var(--hgr-c-paper-dim); flex-shrink:0; width:36px; }
.hgr-c-rank-card-top .hgr-c-rank-num{ color:var(--hgr-c-amber-bright); }
.hgr-c-rank-name{ font-size:15px; font-weight:600; margin-bottom:6px; }
.hgr-c-rank-desc{ color:var(--hgr-c-paper-dim); font-size:13px; line-height:1.6; margin:0 0 10px; }
.hgr-c-rank-meta{ display:flex; align-items:center; gap:10px; margin-bottom:10px; }
.hgr-c-rank-score{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-c-paper-dim); }
.hgr-c-rank-rationale{ color:var(--hgr-c-paper-dim); font-size:12.5px; line-height:1.6; margin:0; }
`;
