import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useHangarSession } from "@/lib/the-hangar/session";
import { supabase } from "@/integrations/supabase/client";
import type { CFDAnalysisListEntry } from "@/lib/the-hangar/cfdAnalysisAgentPipeline";
import type { StructuralListEntry } from "@/lib/the-hangar/structuralAgentPipeline";
import type {
  OptimizationResult,
  OptimizationListEntry,
} from "@/lib/the-hangar/optimizationAgentPipeline";
import type { ObjectiveScores, RecommendedAdjustment } from "@/lib/the-hangar/optimizationGeneration";

// ─────────────────────────────────────────────────────────────────────────
// The Hangar — Bay 08 (Optimization Agent) detail page, phase 1. New,
// self-contained page (no shared imports with any other bay page, matching
// the welcome page's own "fully isolated" convention — see
// the-hangar.structural.tsx's own header comment for the precedent).
//
// First bay page with TWO upstream pickers instead of one: a spec-ready
// CFD analysis (Bay 06) and a spec-ready structural analysis (Bay 07),
// both required before "Run Optimization" is enabled. Everything else
// mirrors the-hangar.structural.tsx's shape — deliberately NOT a
// multi-item gated-stage tracker (this bay has exactly one real stage
// today, folding OptimizationAgent.md Sections 3.1-3.3 into a single call
// — see optimizationAgentPipeline.ts's own header comment).
//
// source_was_mock is surfaced durably (live result, list row, past-
// optimization view) via MockSourceBadge, matching every prior bay's own
// convention. risk_flags are rendered as visible, non-blocking advisory
// warnings, same as Bay 05/07's own RiskFlagsList — OptimizationAgent.md
// leaves gate-then-score-vs-advisory as an open question; nothing here is
// disabled based on their presence.
// ─────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/the-hangar/optimization")({
  component: TheHangarOptimization,
});

interface FlowState {
  status: "idle" | "running" | "complete" | "error";
  result: OptimizationResult | null;
  errorMessage: string | null;
}

const INITIAL_FLOW_STATE: FlowState = { status: "idle", result: null, errorMessage: null };

const OPTIMIZATION_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  processing: "Processing",
  spec_ready: "Spec Ready",
  finalized: "Finalized",
  error: "Error",
};

// Same fetch/auth/error-normalizing helper as every other bay page's
// callStageApi, duplicated rather than shared — this page's own isolation
// convention.
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

function TheHangarOptimization() {
  const ready = useHangarSession();

  const [flow, setFlow] = useState<FlowState>(INITIAL_FLOW_STATE);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  const [cfdAnalyses, setCfdAnalyses] = useState<CFDAnalysisListEntry[] | null>(null);
  const [cfdAnalysesStatus, setCfdAnalysesStatus] = useState<"idle" | "loading" | "error">("idle");
  const [cfdExpanded, setCfdExpanded] = useState(false);

  const [structurals, setStructurals] = useState<StructuralListEntry[] | null>(null);
  const [structuralsStatus, setStructuralsStatus] = useState<"idle" | "loading" | "error">("idle");
  const [structuralsExpanded, setStructuralsExpanded] = useState(false);

  const [optimizations, setOptimizations] = useState<OptimizationListEntry[] | null>(null);
  const [optimizationsStatus, setOptimizationsStatus] = useState<"idle" | "loading" | "error">(
    "idle",
  );
  const [optimizationsExpanded, setOptimizationsExpanded] = useState(false);

  const [selectedCfd, setSelectedCfd] = useState<CFDAnalysisListEntry | null>(null);
  const [selectedStructuralInput, setSelectedStructuralInput] = useState<StructuralListEntry | null>(
    null,
  );
  const [selectedOptimization, setSelectedOptimization] = useState<OptimizationListEntry | null>(
    null,
  );
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

  // "Your spec-ready CFD analyses" — reuses /api/hangar/cfd-analyses (Bay
  // 06's own list route, no status filter) and filters to spec_ready
  // client-side, same pattern the-hangar.structural.tsx used for Bay 04's
  // list.
  async function fetchCfdAnalyses() {
    setCfdAnalysesStatus("loading");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setCfdAnalysesStatus("error");
      return;
    }
    try {
      const res = await fetch("/api/hangar/cfd-analyses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const all: CFDAnalysisListEntry[] = await res.json();
      setCfdAnalyses(all.filter((a) => a.status === "spec_ready"));
      setCfdAnalysesStatus("idle");
    } catch {
      setCfdAnalysesStatus("error");
    }
  }

  useEffect(() => {
    if (currentUserEmail) fetchCfdAnalyses();
  }, [currentUserEmail]);

  // "Your spec-ready structural analyses" — same pattern, reusing
  // /api/hangar/structurals (Bay 07's own list route).
  async function fetchStructurals() {
    setStructuralsStatus("loading");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setStructuralsStatus("error");
      return;
    }
    try {
      const res = await fetch("/api/hangar/structurals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const all: StructuralListEntry[] = await res.json();
      setStructurals(all.filter((s) => s.status === "spec_ready"));
      setStructuralsStatus("idle");
    } catch {
      setStructuralsStatus("error");
    }
  }

  useEffect(() => {
    if (currentUserEmail) fetchStructurals();
  }, [currentUserEmail]);

  // "Your optimizations" — refetched whenever an optimization reaches
  // spec_ready, same refresh-trigger pattern as every other bay's own list.
  async function fetchOptimizations() {
    setOptimizationsStatus("loading");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setOptimizationsStatus("error");
      return;
    }
    try {
      const res = await fetch("/api/hangar/optimizations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setOptimizations(await res.json());
      setOptimizationsStatus("idle");
    } catch {
      setOptimizationsStatus("error");
    }
  }

  useEffect(() => {
    if (currentUserEmail) fetchOptimizations();
  }, [currentUserEmail, flow.status]);

  function resetFlow() {
    setFlow(INITIAL_FLOW_STATE);
    setSelectedCfd(null);
    setSelectedStructuralInput(null);
  }

  function selectCfd(a: CFDAnalysisListEntry) {
    setFlow(INITIAL_FLOW_STATE);
    setSelectedOptimization(null);
    setSelectedCfd(a);
    setPlanExpanded(true);
  }

  function selectStructuralInput(s: StructuralListEntry) {
    setFlow(INITIAL_FLOW_STATE);
    setSelectedOptimization(null);
    setSelectedStructuralInput(s);
    setPlanExpanded(true);
  }

  async function generateOptimization() {
    if (!selectedCfd || !selectedStructuralInput) return;
    setFlow({ status: "running", result: null, errorMessage: null });
    const outcome = await callStageApi<OptimizationResult>(
      "/api/hangar/process-optimization/trade-off-optimization",
      { cfdAnalysisId: selectedCfd.cfdAnalysisId, structuralId: selectedStructuralInput.structuralId },
    );
    if (!outcome.ok) {
      setFlow({ status: "error", result: null, errorMessage: outcome.error });
      return;
    }
    setFlow({ status: "complete", result: outcome.data, errorMessage: null });
  }

  if (!ready) return null;

  const isIdle = flow.status === "idle";
  const bothSelected = selectedCfd !== null && selectedStructuralInput !== null;

  return (
    <div className="hgr-o">
      <style>{HGR_OPTIMIZATION_CSS}</style>

      <nav>
        <div className="hgr-o-wrap">
          <div className="hgr-o-crumbs">
            <Link to="/">TorqWings</Link>
            <span className="hgr-o-sep">/</span>
            <Link to="/the-hangar">The Hangar</Link>
            <span className="hgr-o-sep">/</span>
            <span className="hgr-o-cur">Bay 08 — Optimization Agent</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {currentUserEmail && (
              <span
                className="hgr-o-mono"
                style={{ fontSize: 12.5, color: "var(--hgr-o-paper-dim)" }}
              >
                Welcome, {currentUserEmail}
              </span>
            )}
            <Link to="/the-hangar/welcome" className="hgr-o-exit">
              ← Back to Hangar
            </Link>
            <Link to="/the-hangar" className="hgr-o-exit">
              Exit site
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <div className="hgr-o-hero">
          <div className="hgr-o-doors">
            <div className="hgr-o-door hgr-o-door-left" />
            <div className="hgr-o-door hgr-o-door-right" />
          </div>
          <div className="hgr-o-wrap">
            <div className="hgr-o-status-row">
              <span className="hgr-o-badge hgr-o-badge-bay">BAY 08 OF 15</span>
            </div>
            <div className="hgr-o-hero-row">
              <h1>Optimization Agent</h1>
              <p className="hgr-o-lead">
                Takes a <b>spec-ready CFD result</b> from Bay 06 and a{" "}
                <b>spec-ready structural result</b> from Bay 07 and reasons about the design's
                weight/drag/cost/safety trade-off position — objective scores, a trade-off
                narrative, and directional recommendations, not a real multi-objective search.
              </p>
            </div>
          </div>
        </div>

        <section id="run-optimization">
          <div className="hgr-o-wrap">
            <div className="hgr-o-kicker">Run an optimization pass</div>
            <h2 className="hgr-o-sec-title">
              Combine a CFD result and a structural result into a trade-off assessment.
            </h2>
            <p className="hgr-o-sec-sub">
              Runs one real Claude Sonnet 5 call to reason about the current design's position on
              the weight/drag/cost/safety trade-off space, then a deterministic confidence pass.
              There's no real optimizer (Optuna/PyGMO) yet — there's exactly one design candidate
              here, not a population to search over — so this is Claude reasoning about trade-offs
              for the one design you give it, not a claim of having searched multiple candidates.
              Risk flags are advisory only — nothing here is blocked by them.
            </p>

            {cfdAnalysesStatus === "error" && <ListFetchError onRetry={fetchCfdAnalyses} />}

            {cfdAnalysesStatus !== "error" &&
              cfdAnalyses &&
              cfdAnalyses.length > 0 &&
              !selectedOptimization && (
                <ListPanel
                  title={`Your spec-ready CFD analyses (${cfdAnalyses.length})`}
                  expanded={cfdExpanded}
                  onToggleExpanded={() => setCfdExpanded((v) => !v)}
                >
                  {cfdAnalyses.map((a) => (
                    <button
                      key={a.cfdAnalysisId}
                      type="button"
                      className={`hgr-o-list-row${selectedCfd?.cfdAnalysisId === a.cfdAnalysisId ? " hgr-o-list-row-selected" : ""}`}
                      onClick={() => selectCfd(a)}
                    >
                      <span className="hgr-o-list-row-code">{a.cfdCode}</span>
                      <span className="hgr-o-list-row-type">
                        {a.forces ? `Cl ${a.forces.cl}, Cd ${a.forces.cd}` : "—"}
                      </span>
                      <MockSourceBadge show={a.sourceWasMock === true} compact />
                      <span className="hgr-o-list-row-confidence">
                        {a.confidenceScore !== null
                          ? `${Math.round(a.confidenceScore * 100)}%`
                          : "—"}
                      </span>
                      <span className="hgr-o-list-row-date">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </ListPanel>
              )}

            {cfdAnalysesStatus !== "error" && cfdAnalyses && cfdAnalyses.length === 0 && (
              <p className="hgr-o-empty-hint">
                No spec-ready CFD analyses yet — generate one in{" "}
                <Link to="/the-hangar/cfd-analysis">CFD Agent</Link> first, then come back here.
              </p>
            )}

            {structuralsStatus === "error" && <ListFetchError onRetry={fetchStructurals} />}

            {structuralsStatus !== "error" &&
              structurals &&
              structurals.length > 0 &&
              !selectedOptimization && (
                <ListPanel
                  title={`Your spec-ready structural analyses (${structurals.length})`}
                  expanded={structuralsExpanded}
                  onToggleExpanded={() => setStructuralsExpanded((v) => !v)}
                >
                  {structurals.map((s) => (
                    <button
                      key={s.structuralId}
                      type="button"
                      className={`hgr-o-list-row${selectedStructuralInput?.structuralId === s.structuralId ? " hgr-o-list-row-selected" : ""}`}
                      onClick={() => selectStructuralInput(s)}
                    >
                      <span className="hgr-o-list-row-code">{s.structuralCode}</span>
                      <span className="hgr-o-list-row-type">
                        {s.safetyFactor !== null ? `SF ${s.safetyFactor}` : "—"}
                      </span>
                      <MockSourceBadge show={s.sourceWasMock === true} compact />
                      <span className="hgr-o-list-row-confidence">
                        {s.confidenceScore !== null
                          ? `${Math.round(s.confidenceScore * 100)}%`
                          : "—"}
                      </span>
                      <span className="hgr-o-list-row-date">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </ListPanel>
              )}

            {structuralsStatus !== "error" && structurals && structurals.length === 0 && (
              <p className="hgr-o-empty-hint">
                No spec-ready structural analyses yet — generate one in{" "}
                <Link to="/the-hangar/structural">Structural Agent</Link> first, then come back
                here.
              </p>
            )}

            {optimizationsStatus === "error" && <ListFetchError onRetry={fetchOptimizations} />}

            {optimizationsStatus !== "error" &&
              optimizations &&
              optimizations.length > 0 &&
              !selectedOptimization && (
                <ListPanel
                  title={`Your optimizations (${optimizations.length})`}
                  expanded={optimizationsExpanded}
                  onToggleExpanded={() => setOptimizationsExpanded((v) => !v)}
                >
                  {optimizations.map((o) => (
                    <button
                      key={o.optimizationId}
                      type="button"
                      className="hgr-o-list-row"
                      onClick={() => setSelectedOptimization(o)}
                    >
                      <span className="hgr-o-list-row-code">{o.optimizationCode}</span>
                      <span className="hgr-o-list-row-type">
                        {o.overallOptimizationScore !== null
                          ? `Score ${Math.round(o.overallOptimizationScore * 100)}%`
                          : "—"}
                      </span>
                      <span className={`hgr-o-list-row-status hgr-o-list-row-status-${o.status}`}>
                        {OPTIMIZATION_STATUS_LABEL[o.status] ?? o.status}
                      </span>
                      <MockSourceBadge show={o.sourceWasMock === true} compact />
                      <span className="hgr-o-list-row-confidence">
                        {o.confidenceScore !== null
                          ? `${Math.round(o.confidenceScore * 100)}%`
                          : "—"}
                      </span>
                      <span className="hgr-o-list-row-date">
                        {new Date(o.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </ListPanel>
              )}

            {selectedOptimization ? (
              <PastOptimizationDetail
                optimization={selectedOptimization}
                onBack={() => setSelectedOptimization(null)}
              />
            ) : (
              <div className={isIdle ? "hgr-o-collapsible" : undefined}>
                {isIdle && (
                  <button
                    type="button"
                    className="hgr-o-collapsible-title"
                    onClick={() => setPlanExpanded((v) => !v)}
                    aria-expanded={planExpanded}
                  >
                    <span>Run an optimization pass</span>
                    <span className={`hgr-o-arrow${planExpanded ? " hgr-o-arrow-open" : ""}`}>
                      ▸
                    </span>
                  </button>
                )}
                {(!isIdle || planExpanded) && (
                  <div className={isIdle ? "hgr-o-collapsible-body" : undefined}>
                    {flow.status !== "complete" && (
                      <div className="hgr-o-process-grid">
                        <div>
                          {bothSelected ? (
                            <div className="hgr-o-selected-spec">
                              <span className="hgr-o-selected-spec-label">Optimizing</span>
                              <p>
                                <b>{selectedCfd!.cfdCode}</b> (CFD) +{" "}
                                <b>{selectedStructuralInput!.structuralCode}</b> (Structural)
                              </p>
                              {flow.status !== "running" && (
                                <button
                                  type="button"
                                  className="hgr-o-btn hgr-o-btn-amber"
                                  onClick={generateOptimization}
                                >
                                  Run Optimization →
                                </button>
                              )}
                            </div>
                          ) : (
                            <p className="hgr-o-status-idle">
                              Select one spec-ready CFD analysis and one spec-ready structural
                              analysis above to begin — both are required (this is the first bay
                              with two upstream inputs).{" "}
                              {selectedCfd && !selectedStructuralInput && (
                                <>CFD analysis picked — still need a structural analysis.</>
                              )}
                              {!selectedCfd && selectedStructuralInput && (
                                <>Structural analysis picked — still need a CFD analysis.</>
                              )}
                            </p>
                          )}
                          {flow.status === "error" && (
                            <StageErrorCard
                              title="Couldn't complete Optimization."
                              message={flow.errorMessage}
                              onRetry={generateOptimization}
                            />
                          )}
                        </div>

                        {/* No multi-item stage tracker here, deliberately —
                            see the file header comment. Just the one real
                            stage's name and a single spinner. */}
                        <div className="hgr-o-status-panel">
                          <div className="hgr-o-status-panel-title">Optimization</div>
                          {flow.status === "running" ? (
                            <div className="hgr-o-status-step hgr-o-status-step-active">
                              <span className="hgr-o-status-icon">
                                <span className="hgr-o-status-spinner" />
                              </span>
                              <span className="hgr-o-status-text">Processing…</span>
                            </div>
                          ) : flow.status === "error" ? (
                            <p className="hgr-o-status-idle">
                              Stopped — see the error below, then retry.
                            </p>
                          ) : (
                            <p className="hgr-o-status-idle">
                              Select both inputs, then run to begin.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {flow.status === "complete" && flow.result && (
                      <OptimizationResultView result={flow.result} onStartNew={resetFlow} />
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
    <div className="hgr-o-collapsible" style={{ marginBottom: 20 }}>
      <button
        type="button"
        className="hgr-o-collapsible-title"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
      >
        <span>{title}</span>
        <span className={`hgr-o-arrow${expanded ? " hgr-o-arrow-open" : ""}`}>▸</span>
      </button>
      {expanded && <div className="hgr-o-list">{children}</div>}
    </div>
  );
}

function ListFetchError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="hgr-o-list-fetch-error">
      <p>Couldn't load this list — check your connection and try again.</p>
      <button type="button" className="hgr-o-btn hgr-o-btn-ghost" onClick={onRetry}>
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
    <div className="hgr-o-error">
      <b>{title}</b>
      <p>{message}</p>
      <button type="button" className="hgr-o-btn hgr-o-btn-ghost" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

// Same durable-badge convention as every prior bay's MockSourceBadge —
// unlike Bay 06/07, this bay's own source_was_mock is OR-composed from
// THREE sources (CFD's, structural's, and this bay's own generation call —
// see optimizationAgentPipeline.ts), but the badge itself doesn't need to
// distinguish which; "was this ever touched by mock data" is a single
// boolean either way.
function MockSourceBadge({ show, compact }: { show: boolean; compact?: boolean }) {
  if (!show) return null;
  return (
    <span className={`hgr-o-mock-badge${compact ? " hgr-o-mock-badge-compact" : ""}`}>
      ⚠ Touched by mock/fallback data upstream
    </span>
  );
}

function ObjectiveScoresFields({ scores }: { scores: ObjectiveScores }) {
  return (
    <div className="hgr-o-dash-fields">
      <DashField label="Weight" value={`${Math.round(scores.weight * 100)}%`} />
      <DashField label="Drag" value={`${Math.round(scores.drag * 100)}%`} />
      <DashField label="Cost" value={`${Math.round(scores.cost * 100)}%`} />
      <DashField label="Safety" value={`${Math.round(scores.safety * 100)}%`} />
    </div>
  );
}

function RecommendedAdjustmentsList({
  adjustments,
}: {
  adjustments: RecommendedAdjustment[];
}) {
  if (adjustments.length === 0) {
    return <p className="hgr-o-dash-empty">No adjustments were recommended.</p>;
  }
  return (
    <ul className="hgr-o-adjustments">
      {adjustments.map((a, i) => (
        <li key={i}>
          <span className={`hgr-o-adjustment-tag hgr-o-adjustment-tag-${a.direction}`}>
            {a.direction}
          </span>{" "}
          <b>{a.parameter}</b> — {a.rationale}
        </li>
      ))}
    </ul>
  );
}

function DashField({ label, value }: { label: string; value: string }) {
  return (
    <div className="hgr-o-dash-field">
      <div className="hgr-o-dash-field-label">{label}</div>
      <div className="hgr-o-dash-field-value">{value}</div>
    </div>
  );
}

// Advisory only, never blocking — OptimizationAgent.md's Open Questions
// section leaves "gate-then-score eligibility for risk_flags" unresolved,
// same open question every prior bay carried forward for its own flags.
function RiskFlagsList({ riskFlags }: { riskFlags: string[] }) {
  if (riskFlags.length === 0) {
    return <p className="hgr-o-dash-empty">No risk flags.</p>;
  }
  return (
    <div className="hgr-o-risk-flags">
      <ul>
        {riskFlags.map((flag, i) => (
          <li key={i}>{flag}</li>
        ))}
      </ul>
    </div>
  );
}

// Live result view, shown immediately after the stage completes. No
// Save-as-final / Edit-and-regenerate — no finalize stage exists, same
// reasoning as every prior bay's own result view.
function OptimizationResultView({
  result,
  onStartNew,
}: {
  result: OptimizationResult;
  onStartNew: () => void;
}) {
  return (
    <div className="hgr-o-dash">
      <div className="hgr-o-dash-header">
        <div>
          <div className="hgr-o-dash-badge">Spec Ready</div>
          <h3>{result.optimizationCode}</h3>
          <MockSourceBadge show={result.sourceWasMock} />
        </div>
        <div className="hgr-o-dash-confidence">
          <div className="hgr-o-dash-confidence-num">
            {Math.round(result.confidenceScore * 100)}%
          </div>
          <div className="hgr-o-dash-confidence-label">Confidence</div>
          <Link
            to="/the-hangar/bernoulli"
            search={{ source: "optimization", missionId: "", sourceId: result.optimizationId }}
            className="hgr-o-dash-bernoulli-link"
            title="Sanity-check this trade-off's origin mission spec against conservation laws and aerospace empiricals."
          >
            Ask Bernoulli →
          </Link>
        </div>
      </div>

      <div className="hgr-o-dash-section">
        <h4>Objective Scores</h4>
        <ObjectiveScoresFields scores={result.objectiveScores} />
      </div>

      <div className="hgr-o-dash-section">
        <h4>Trade-off Analysis</h4>
        <p className="hgr-o-dash-rationale">{result.tradeOffAnalysis}</p>
      </div>

      <div className="hgr-o-dash-section">
        <h4>Recommended Adjustments ({result.recommendedAdjustments.length})</h4>
        <RecommendedAdjustmentsList adjustments={result.recommendedAdjustments} />
      </div>

      <div className="hgr-o-dash-section">
        <h4>Overall Optimization Score</h4>
        <DashField
          label="Score"
          value={`${Math.round(result.overallOptimizationScore * 100)}%`}
        />
      </div>

      <div className="hgr-o-dash-section">
        <h4>Risk Flags ({result.riskFlags.length})</h4>
        <RiskFlagsList riskFlags={result.riskFlags} />
      </div>

      <div className="hgr-o-dash-section">
        <h4>Reasoning Summary</h4>
        <p className="hgr-o-dash-rationale">{result.reasoningSummary}</p>
      </div>

      <div className="hgr-o-dash-actions">
        <button
          type="button"
          className="hgr-o-btn hgr-o-btn-ghost"
          disabled
          title="Bay 09 not yet built"
        >
          Continue to Validation Agent →
        </button>
        <button type="button" className="hgr-o-btn hgr-o-btn-amber" onClick={onStartNew}>
          Start a new optimization
        </button>
      </div>
    </div>
  );
}

// Read-only view of a past optimization, opened from "Your optimizations"
// — reuses the same field components so a historical optimization looks
// the same as one just generated. No actions besides going back, same
// reasoning as every prior bay's own past-detail view.
function PastOptimizationDetail({
  optimization,
  onBack,
}: {
  optimization: OptimizationListEntry;
  onBack: () => void;
}) {
  const hasSpec = optimization.objectiveScores !== null;
  return (
    <div className="hgr-o-dash">
      <div className="hgr-o-dash-header">
        <div>
          <div className="hgr-o-dash-badge">
            {OPTIMIZATION_STATUS_LABEL[optimization.status] ?? optimization.status}
          </div>
          <h3>{optimization.optimizationCode}</h3>
          <MockSourceBadge show={optimization.sourceWasMock === true} />
        </div>
        {optimization.confidenceScore !== null && (
          <div className="hgr-o-dash-confidence">
            <div className="hgr-o-dash-confidence-num">
              {Math.round(optimization.confidenceScore * 100)}%
            </div>
            <div className="hgr-o-dash-confidence-label">Confidence</div>
            {hasSpec && (
              <Link
                to="/the-hangar/bernoulli"
                search={{ source: "optimization", missionId: "", sourceId: optimization.optimizationId }}
                className="hgr-o-dash-bernoulli-link"
                title="Sanity-check this trade-off's origin mission spec against conservation laws and aerospace empiricals."
              >
                Ask Bernoulli →
              </Link>
            )}
          </div>
        )}
      </div>
      {hasSpec ? (
        <>
          <div className="hgr-o-dash-section">
            <h4>Objective Scores</h4>
            <ObjectiveScoresFields scores={optimization.objectiveScores!} />
          </div>
          <div className="hgr-o-dash-section">
            <h4>Trade-off Analysis</h4>
            <p className="hgr-o-dash-rationale">{optimization.tradeOffAnalysis}</p>
          </div>
          <div className="hgr-o-dash-section">
            <h4>Recommended Adjustments ({optimization.recommendedAdjustments?.length ?? 0})</h4>
            <RecommendedAdjustmentsList adjustments={optimization.recommendedAdjustments ?? []} />
          </div>
          <div className="hgr-o-dash-section">
            <h4>Overall Optimization Score</h4>
            <DashField
              label="Score"
              value={
                optimization.overallOptimizationScore !== null
                  ? `${Math.round(optimization.overallOptimizationScore * 100)}%`
                  : "—"
              }
            />
          </div>
          <div className="hgr-o-dash-section">
            <h4>Risk Flags ({optimization.riskFlags?.length ?? 0})</h4>
            <RiskFlagsList riskFlags={optimization.riskFlags ?? []} />
          </div>
          <div className="hgr-o-dash-section">
            <h4>Reasoning Summary</h4>
            <p className="hgr-o-dash-rationale">{optimization.reasoningSummary}</p>
          </div>
        </>
      ) : (
        <div className="hgr-o-dash-section">
          <p className="hgr-o-dash-empty">
            No spec was generated for this optimization — its status is "
            {OPTIMIZATION_STATUS_LABEL[optimization.status] ?? optimization.status}".
          </p>
        </div>
      )}
      <div className="hgr-o-dash-actions">
        <button type="button" className="hgr-o-btn hgr-o-btn-ghost" onClick={onBack}>
          ← Back to Your optimizations
        </button>
      </div>
    </div>
  );
}

const HGR_OPTIMIZATION_CSS = `
.hgr-o{
  --hgr-o-navy-deep:#08131F; --hgr-o-navy-panel:#0F2136;
  --hgr-o-blue-line:#3E7CA6; --hgr-o-blue-bright:#6FB4E0;
  --hgr-o-amber:#E8A33D; --hgr-o-amber-bright:#F6C374;
  --hgr-o-paper:#ECEFF3; --hgr-o-paper-dim:#8FA5BB;
  --hgr-o-green:#5FBF8F; --hgr-o-red:#E0715A;
  --hgr-o-grid:rgba(111,180,224,0.08); --hgr-o-hairline:rgba(111,180,224,0.20);

  background:var(--hgr-o-navy-deep); color:var(--hgr-o-paper); font-family:'IBM Plex Sans', sans-serif;
  background-image:linear-gradient(var(--hgr-o-grid) 1px, transparent 1px), linear-gradient(90deg, var(--hgr-o-grid) 1px, transparent 1px);
  background-size:44px 44px;
  min-height:100vh;
}
.hgr-o *{ box-sizing:border-box; }
.hgr-o h1,.hgr-o h2,.hgr-o h3{ font-family:'Space Grotesk', sans-serif; font-weight:600; letter-spacing:-0.01em; margin:0; }
.hgr-o-mono{ font-family:'IBM Plex Mono', monospace; }
.hgr-o-wrap{ max-width:1180px; margin:0 auto; padding:0 32px; }
.hgr-o a{ color:inherit; }

.hgr-o nav{ border-bottom:1px solid var(--hgr-o-hairline); position:sticky; top:0; background:rgba(8,19,31,0.9); backdrop-filter:blur(8px); z-index:20; }
.hgr-o nav .hgr-o-wrap{ display:flex; align-items:center; justify-content:space-between; height:68px; }
.hgr-o-crumbs{ font-size:14px; color:var(--hgr-o-paper-dim); display:flex; align-items:center; gap:8px; }
.hgr-o-crumbs a{ text-decoration:none; color:var(--hgr-o-paper-dim); }
.hgr-o-crumbs a:hover{ color:var(--hgr-o-blue-bright); }
.hgr-o-sep{ color:var(--hgr-o-blue-line); }
.hgr-o-cur{ color:var(--hgr-o-paper); font-weight:500; }
.hgr-o-exit{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-o-paper-dim); text-decoration:none; border:1px solid var(--hgr-o-hairline); padding:8px 15px; border-radius:2px; }
.hgr-o-exit:hover{ color:var(--hgr-o-paper); border-color:var(--hgr-o-blue-bright); }

.hgr-o main{ padding-bottom:100px; }
.hgr-o-hero{ padding:56px 0 20px; border-bottom:1px solid var(--hgr-o-hairline); position:relative; overflow:hidden; }
.hgr-o-doors{ position:absolute; inset:0; z-index:5; display:flex; pointer-events:none; }
.hgr-o-door{ flex:1; background: repeating-linear-gradient(90deg, #0C1E30 0 78px, #08131F 78px 80px); position:relative; }
.hgr-o-door::after{ content:""; position:absolute; top:0; bottom:0; width:2px; background:var(--hgr-o-blue-line); opacity:.5; }
.hgr-o-door-left{ animation: hgr-o-openLeft 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
.hgr-o-door-right{ animation: hgr-o-openRight 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
.hgr-o-door-left::after{ right:0; }
.hgr-o-door-right::after{ left:0; }
@keyframes hgr-o-openLeft{ from{ transform:translateX(0);} to{ transform:translateX(-100%);} }
@keyframes hgr-o-openRight{ from{ transform:translateX(0);} to{ transform:translateX(100%);} }
@media (prefers-reduced-motion: reduce){ .hgr-o-doors{ display:none; } }
.hgr-o-status-row{ display:flex; align-items:center; gap:12px; margin-bottom:22px; flex-wrap:wrap; }
.hgr-o-badge{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; letter-spacing:.1em; text-transform:uppercase; padding:6px 13px; border-radius:2px; display:inline-flex; align-items:center; gap:8px; }
.hgr-o-badge-bay{ color:var(--hgr-o-paper-dim); border:1px solid var(--hgr-o-hairline); }
.hgr-o-hero-row{ display:flex; align-items:center; gap:48px; flex-wrap:wrap; }
@media(max-width:760px){ .hgr-o-hero-row{ flex-direction:column; align-items:flex-start; gap:16px; } }
.hgr-o-hero h1{ font-size:clamp(34px,5vw,58px); margin:0; flex-shrink:0; }
.hgr-o-hero .hgr-o-lead{ color:var(--hgr-o-paper-dim); font-size:15.5px; max-width:520px; line-height:1.6; margin:0; flex:1; min-width:280px; }
.hgr-o-hero .hgr-o-lead b{ color:var(--hgr-o-paper); font-weight:600; }

.hgr-o section{ padding:60px 0; }
#run-optimization{ padding-top:32px; }
.hgr-o-kicker{ font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--hgr-o-amber); margin-bottom:12px; }
.hgr-o-sec-title{ font-size:clamp(22px,2.6vw,30px); margin-bottom:10px; }
.hgr-o-sec-sub{ color:var(--hgr-o-paper-dim); font-size:14.5px; max-width:640px; margin-bottom:36px; }
.hgr-o-empty-hint{ color:var(--hgr-o-paper-dim); font-size:13.5px; margin-bottom:24px; }
.hgr-o-empty-hint a{ color:var(--hgr-o-blue-bright); }

.hgr-o-btn{ font-family:'IBM Plex Mono',monospace; font-size:13px; padding:12px 22px; border-radius:2px; display:inline-flex; align-items:center; gap:8px; text-decoration:none; border:1px solid transparent; cursor:pointer; background:none; }
.hgr-o-btn-ghost{ border:1px solid var(--hgr-o-hairline); color:var(--hgr-o-paper-dim); }
.hgr-o-btn-ghost:hover{ color:var(--hgr-o-paper); border-color:var(--hgr-o-blue-bright); }
.hgr-o-btn-amber{ background:var(--hgr-o-amber); color:var(--hgr-o-navy-deep); font-weight:600; }
.hgr-o-btn-amber:hover{ background:var(--hgr-o-amber-bright); }
.hgr-o-btn:disabled{ opacity:.4; cursor:not-allowed; }
.hgr-o-btn:disabled:hover{ color:var(--hgr-o-paper-dim); border-color:var(--hgr-o-hairline); }

/* ── Collapsible panels ── */
.hgr-o-collapsible{ border:1px solid var(--hgr-o-hairline); background:var(--hgr-o-navy-panel); border-radius:2px; margin-bottom:32px; }
.hgr-o-collapsible-title{ display:flex; align-items:center; justify-content:space-between; width:100%; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-o-paper-dim); padding:14px 18px; border:none; background:none; cursor:pointer; }
.hgr-o-collapsible-title:hover{ color:var(--hgr-o-paper); }
.hgr-o-arrow{ display:inline-block; font-size:11px; transition:transform .15s; }
.hgr-o-arrow-open{ transform:rotate(90deg); }
.hgr-o-list{ max-height:260px; overflow-y:auto; border-top:1px solid var(--hgr-o-hairline); }
.hgr-o-list-row{ display:grid; grid-template-columns:1.2fr 1.6fr auto 0.7fr 1fr; align-items:center; gap:10px; width:100%; padding:12px 18px; border:none; border-bottom:1px dashed var(--hgr-o-hairline); background:none; cursor:pointer; text-align:left; font-family:'IBM Plex Sans',sans-serif; transition:background .15s; }
.hgr-o-list-row:last-child{ border-bottom:none; }
.hgr-o-list-row:hover{ background:rgba(111,180,224,.07); }
.hgr-o-list-row-selected{ background:rgba(232,163,61,.09); border-left:2px solid var(--hgr-o-amber); }
@media(max-width:820px){ .hgr-o-list-row{ grid-template-columns:1fr 1fr; row-gap:4px; } }
.hgr-o-list-row-code{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-o-blue-bright); }
.hgr-o-list-row-type{ font-size:13px; color:var(--hgr-o-paper); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hgr-o-list-row-status{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.05em; text-transform:uppercase; color:var(--hgr-o-paper-dim); border:1px solid var(--hgr-o-hairline); padding:3px 8px; border-radius:2px; justify-self:start; white-space:nowrap; }
.hgr-o-list-row-status-spec_ready{ color:var(--hgr-o-blue-bright); border-color:rgba(111,180,224,.4); }
.hgr-o-list-row-status-finalized{ color:var(--hgr-o-amber-bright); border-color:rgba(232,163,61,.4); }
.hgr-o-list-row-status-error{ color:var(--hgr-o-amber); border-color:rgba(232,163,61,.4); }
.hgr-o-list-row-confidence{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-o-paper-dim); }
.hgr-o-list-row-date{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-o-paper-dim); text-align:right; }

/* ── List-fetch error ── */
.hgr-o-list-fetch-error{ display:flex; align-items:center; justify-content:space-between; gap:16px; padding:14px 18px; margin-bottom:20px; border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; }
.hgr-o-list-fetch-error p{ margin:0; color:var(--hgr-o-paper-dim); font-size:13.5px; }

/* ── Process grid + selected-spec / status panel ── */
.hgr-o-process-grid{ display:grid; grid-template-columns:1fr 320px; gap:32px; align-items:start; }
@media(max-width:820px){ .hgr-o-process-grid{ grid-template-columns:1fr; } }
.hgr-o-selected-spec{ max-width:640px; padding:14px 16px; border:1px solid rgba(111,180,224,.3); border-left:3px solid var(--hgr-o-blue-bright); background:rgba(111,180,224,.09); border-radius:2px; margin-bottom:20px; }
.hgr-o-selected-spec-label{ display:block; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-o-blue-bright); margin-bottom:8px; }
.hgr-o-selected-spec p{ margin:0 0 14px; font-size:14px; color:var(--hgr-o-paper); line-height:1.6; }

.hgr-o-status-panel{ border:1px solid var(--hgr-o-hairline); background:var(--hgr-o-navy-panel); border-radius:2px; padding:20px; }
.hgr-o-status-panel-title{ font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-o-paper-dim); margin-bottom:16px; }
.hgr-o-status-idle{ color:var(--hgr-o-paper-dim); font-size:13px; line-height:1.6; margin:0; }
.hgr-o-status-step{ display:flex; align-items:flex-start; gap:10px; padding:9px 0; }
.hgr-o-status-icon{ width:18px; height:18px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
.hgr-o-status-spinner{ width:13px; height:13px; border-radius:50%; border:2px solid var(--hgr-o-hairline); border-top-color:var(--hgr-o-amber); animation:hgr-o-spin 0.8s linear infinite; }
.hgr-o-status-text{ font-size:12.5px; line-height:1.5; color:var(--hgr-o-paper-dim); }
.hgr-o-status-step-active .hgr-o-status-text{ color:var(--hgr-o-paper); }

/* ── Mock source badge (durable, matches every prior bay's convention) ── */
.hgr-o-mock-badge{ display:inline-flex; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.03em; color:var(--hgr-o-amber-bright); border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); padding:4px 9px; border-radius:2px; margin-top:8px; }
.hgr-o-mock-badge-compact{ margin-top:0; font-size:9.5px; padding:2px 7px; justify-self:start; }

/* ── Error ── */
@keyframes hgr-o-spin{ to{ transform:rotate(360deg); } }
.hgr-o-error{ border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; padding:20px 22px; max-width:640px; margin-top:20px; }
.hgr-o-error b{ color:var(--hgr-o-amber-bright); display:block; margin-bottom:6px; font-size:14px; }
.hgr-o-error p{ color:var(--hgr-o-paper-dim); font-size:13.5px; margin:0 0 16px; line-height:1.6; }

/* ── Dashboard / result views ── */
.hgr-o-dash{ border:1px solid var(--hgr-o-hairline); background:var(--hgr-o-navy-panel); }
.hgr-o-dash-header{ display:flex; align-items:flex-start; justify-content:space-between; gap:24px; padding:26px 28px; border-bottom:1px solid var(--hgr-o-hairline); flex-wrap:wrap; }
.hgr-o-dash-badge{ display:inline-block; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-o-blue-bright); border:1px solid rgba(111,180,224,.4); padding:4px 10px; border-radius:2px; margin-bottom:10px; }
.hgr-o-dash-header h3{ font-size:20px; margin-bottom:6px; }
.hgr-o-dash-confidence{ text-align:center; flex-shrink:0; }
.hgr-o-dash-confidence-num{ font-family:'Space Grotesk',sans-serif; font-size:32px; font-weight:700; color:var(--hgr-o-amber-bright); line-height:1; }
.hgr-o-dash-confidence-label{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-o-paper-dim); }
.hgr-o-dash-bernoulli-link{
  display:inline-block; margin-top:10px; font-family:'IBM Plex Mono',monospace; font-size:11px;
  color:var(--hgr-o-blue-bright); text-decoration:none; border:1px solid var(--hgr-o-hairline);
  border-radius:2px; padding:5px 10px; white-space:nowrap;
}
.hgr-o-dash-bernoulli-link:hover{ border-color:var(--hgr-o-blue-bright); color:var(--hgr-o-paper); }
.hgr-o-dash-section{ padding:24px 28px; border-bottom:1px solid var(--hgr-o-hairline); }
.hgr-o-dash-section:last-of-type{ border-bottom:none; }
.hgr-o-dash-section h4{ font-family:'Space Grotesk',sans-serif; font-size:14.5px; font-weight:600; margin-bottom:16px; }
.hgr-o-dash-empty{ color:var(--hgr-o-paper-dim); font-size:13px; margin:0; }
.hgr-o-dash-rationale{ color:var(--hgr-o-paper); font-size:14px; line-height:1.7; margin:0; }
.hgr-o-dash-fields{ display:grid; grid-template-columns:repeat(4,1fr); gap:20px; }
@media(max-width:700px){ .hgr-o-dash-fields{ grid-template-columns:1fr 1fr; } }
.hgr-o-dash-field-label{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--hgr-o-paper-dim); margin-bottom:6px; }
.hgr-o-dash-field-value{ font-size:14px; }
.hgr-o-dash-actions{ display:flex; gap:12px; flex-wrap:wrap; padding:24px 28px; }

/* ── Recommended adjustments ── */
.hgr-o-adjustments{ margin:0; padding-left:18px; color:var(--hgr-o-paper); font-size:13px; line-height:1.9; }
.hgr-o-adjustment-tag{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.04em; text-transform:uppercase; }
.hgr-o-adjustment-tag-increase{ color:var(--hgr-o-green); }
.hgr-o-adjustment-tag-decrease{ color:var(--hgr-o-red); }

/* ── Risk flags (advisory, non-blocking) ── */
.hgr-o-risk-flags{ border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; padding:14px 16px; }
.hgr-o-risk-flags ul{ margin:0; padding-left:18px; color:var(--hgr-o-amber-bright); font-size:13px; line-height:1.7; }
`;
