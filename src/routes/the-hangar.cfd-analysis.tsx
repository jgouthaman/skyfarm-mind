import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useHangarSession } from "@/lib/the-hangar/session";
import { supabase } from "@/integrations/supabase/client";
import type { CADDesignListEntry } from "@/lib/the-hangar/cadDesignAgentPipeline";
import type {
  CFDAnalysisResult,
  CFDAnalysisListEntry,
} from "@/lib/the-hangar/cfdAnalysisAgentPipeline";
import type {
  CFDForces,
  CFDCoefficients,
  CFDFlowFields,
} from "@/lib/the-hangar/cfdAnalysisGeneration";

// ─────────────────────────────────────────────────────────────────────────
// The Hangar — Bay 06 (CFD Agent) detail page, Phase 1. New, self-contained
// page (no shared imports with any other bay page), matching every prior
// bay page's own isolation convention.
//
// Deliberately NOT a multi-item gated-stage tracker — same reasoning as
// Bay 03/04: this bay has exactly one real stage today (Output Generation,
// CFDAgent.md Section 3.3 — 3.1/3.2 are folded into that one call's prompt,
// see cfdAnalysisAgentPipeline.ts's header comment). Single
// spinner-or-idle-text pattern, no tracker header.
//
// Unlike Bay 04/05's MockSourceBadge (conditional — only shown when the
// upstream/generation was actually mock), this bay's badge is
// unconditional: CFDAgent.md Section 1 mandates source_was_mock: true on
// EVERY Phase 1 result regardless of whether the underlying LLM call
// itself succeeded (no real solver ever runs in Phase 1). So Phase1Badge
// below always renders, in the same three places Section 8 calls for
// (result view, list row, detail view) — it's a permanent disclosure about
// this bay's current phase, not a fallback indicator.
//
// No custom CFD-settings input form this pass (solver type / turbulence
// model / boundary conditions) — CFDAgent.md Section 2 lists these as
// "User input / defaults," and no prior bay page built a bespoke
// parameter form for its own optional inputs either (Bay 05's own "Job
// Configuration" input is stubbed the same way). Defaults (null) are sent;
// a settings form is a natural follow-up, not built here.
// ─────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/the-hangar/cfd-analysis")({
  component: TheHangarCFDAnalysis,
});

interface FlowState {
  status: "idle" | "running" | "complete" | "error";
  result: CFDAnalysisResult | null;
  errorMessage: string | null;
}

const INITIAL_FLOW_STATE: FlowState = { status: "idle", result: null, errorMessage: null };

const CFD_ANALYSIS_STATUS_LABEL: Record<string, string> = {
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

function TheHangarCFDAnalysis() {
  const ready = useHangarSession();

  const [flow, setFlow] = useState<FlowState>(INITIAL_FLOW_STATE);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [specReadyDesigns, setSpecReadyDesigns] = useState<CADDesignListEntry[] | null>(null);
  const [specReadyDesignsStatus, setSpecReadyDesignsStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [designsExpanded, setDesignsExpanded] = useState(false);
  const [cfdAnalyses, setCFDAnalyses] = useState<CFDAnalysisListEntry[] | null>(null);
  const [cfdAnalysesStatus, setCFDAnalysesStatus] = useState<"idle" | "loading" | "error">("idle");
  const [cfdAnalysesExpanded, setCFDAnalysesExpanded] = useState(false);
  const [selectedCADDesign, setSelectedCADDesign] = useState<CADDesignListEntry | null>(null);
  const [selectedCFDAnalysis, setSelectedCFDAnalysis] = useState<CFDAnalysisListEntry | null>(null);
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

  // "Your spec-ready CAD designs" — reuses /api/hangar/cad-designs (CAD
  // Agent's own list route, no status filter) and filters to spec_ready
  // client-side, same pattern Bay 04 used filtering aircraft designs.
  async function fetchSpecReadyDesigns() {
    setSpecReadyDesignsStatus("loading");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setSpecReadyDesignsStatus("error");
      return;
    }
    try {
      const res = await fetch("/api/hangar/cad-designs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const all: CADDesignListEntry[] = await res.json();
      setSpecReadyDesigns(all.filter((d) => d.status === "spec_ready"));
      setSpecReadyDesignsStatus("idle");
    } catch {
      setSpecReadyDesignsStatus("error");
    }
  }

  useEffect(() => {
    if (currentUserEmail) fetchSpecReadyDesigns();
  }, [currentUserEmail]);

  // "Your CFD analyses" — refetched whenever an analysis reaches
  // spec_ready, same refresh-trigger pattern as every other bay's own list.
  async function fetchCFDAnalyses() {
    setCFDAnalysesStatus("loading");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setCFDAnalysesStatus("error");
      return;
    }
    try {
      const res = await fetch("/api/hangar/cfd-analyses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCFDAnalyses(await res.json());
      setCFDAnalysesStatus("idle");
    } catch {
      setCFDAnalysesStatus("error");
    }
  }

  useEffect(() => {
    if (currentUserEmail) fetchCFDAnalyses();
  }, [currentUserEmail, flow.status]);

  function resetFlow() {
    setFlow(INITIAL_FLOW_STATE);
    setSelectedCADDesign(null);
    setSelectedCFDAnalysis(null);
  }

  function selectCADDesign(d: CADDesignListEntry) {
    resetFlow();
    setSelectedCADDesign(d);
    setPlanExpanded(true);
  }

  async function generateCFDAnalysis() {
    if (!selectedCADDesign) return;
    setFlow({ status: "running", result: null, errorMessage: null });
    const outcome = await callStageApi<CFDAnalysisResult>(
      "/api/hangar/process-cfd-analysis/output-generation",
      {
        cadDesignId: selectedCADDesign.cadDesignId,
      },
    );
    if (!outcome.ok) {
      setFlow({ status: "error", result: null, errorMessage: outcome.error });
      return;
    }
    setFlow({ status: "complete", result: outcome.data, errorMessage: null });
  }

  if (!ready) return null;

  const isIdle = flow.status === "idle";

  return (
    <div className="hgr-f">
      <style>{HGR_CFD_ANALYSIS_CSS}</style>

      <nav>
        <div className="hgr-f-wrap">
          <div className="hgr-f-crumbs">
            <Link to="/">TorqWings</Link>
            <span className="hgr-f-sep">/</span>
            <Link to="/the-hangar">The Hangar</Link>
            <span className="hgr-f-sep">/</span>
            <span className="hgr-f-cur">Bay 06 — CFD Agent</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {currentUserEmail && (
              <span
                className="hgr-f-mono"
                style={{ fontSize: 12.5, color: "var(--hgr-f-paper-dim)" }}
              >
                Welcome, {currentUserEmail}
              </span>
            )}
            <Link to="/the-hangar/welcome" className="hgr-f-exit">
              ← Back to Hangar
            </Link>
            <Link to="/the-hangar" className="hgr-f-exit">
              Exit site
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <div className="hgr-f-hero">
          <div className="hgr-f-doors">
            <div className="hgr-f-door hgr-f-door-left" />
            <div className="hgr-f-door hgr-f-door-right" />
          </div>
          <div className="hgr-f-wrap">
            <div className="hgr-f-status-row">
              <span className="hgr-f-badge hgr-f-badge-bay">BAY 06 OF 15</span>
            </div>
            <div className="hgr-f-hero-row">
              <h1>CFD Agent</h1>
              <p className="hgr-f-lead">
                Takes a <b>spec-ready CAD design</b> from Bay 04 and reasons about plausible
                aerodynamic forces, coefficients, and flow behavior — Phase 1: no real solver
                (OpenFOAM/SU2/Fluent) runs yet.
              </p>
            </div>
          </div>
        </div>

        <section id="generate-cfd-analysis">
          <div className="hgr-f-wrap">
            <div className="hgr-f-kicker">Generate a CFD analysis</div>
            <h2 className="hgr-f-sec-title">Turn a spec-ready CAD design into a CFD estimate.</h2>
            <p className="hgr-f-sec-sub">
              Runs one real Claude Sonnet 5 call reasoning about mesh strategy, solver behavior, and
              force/coefficient estimates. There's no real CFD solver integration yet, so every
              result here is Phase 1 LLM reasoning, not a simulated engineering result.
            </p>

            {specReadyDesignsStatus === "error" && (
              <ListFetchError onRetry={fetchSpecReadyDesigns} />
            )}

            {specReadyDesignsStatus !== "error" &&
              specReadyDesigns &&
              specReadyDesigns.length > 0 &&
              !selectedCFDAnalysis && (
                <ListPanel
                  title={`Your spec-ready CAD designs (${specReadyDesigns.length})`}
                  expanded={designsExpanded}
                  onToggleExpanded={() => setDesignsExpanded((v) => !v)}
                >
                  {specReadyDesigns.map((d) => (
                    <button
                      key={d.cadDesignId}
                      type="button"
                      className="hgr-f-list-row"
                      onClick={() => selectCADDesign(d)}
                    >
                      <span className="hgr-f-list-row-code">{d.cadCode}</span>
                      <span className="hgr-f-list-row-type">
                        {d.bom ? `${d.bom.length} BOM entries` : "—"}
                      </span>
                      <span className="hgr-f-list-row-confidence">
                        {d.confidenceScore !== null
                          ? `${Math.round(d.confidenceScore * 100)}%`
                          : "—"}
                      </span>
                      <span className="hgr-f-list-row-date">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </ListPanel>
              )}

            {specReadyDesignsStatus !== "error" &&
              specReadyDesigns &&
              specReadyDesigns.length === 0 && (
                <p className="hgr-f-empty-hint">
                  No spec-ready CAD designs yet — generate one in{" "}
                  <Link to="/the-hangar/cad-design">CAD Agent</Link> first, then come back here to
                  run a CFD analysis against it.
                </p>
              )}

            {cfdAnalysesStatus === "error" && <ListFetchError onRetry={fetchCFDAnalyses} />}

            {cfdAnalysesStatus !== "error" &&
              cfdAnalyses &&
              cfdAnalyses.length > 0 &&
              !selectedCFDAnalysis && (
                <ListPanel
                  title={`Your CFD analyses (${cfdAnalyses.length})`}
                  expanded={cfdAnalysesExpanded}
                  onToggleExpanded={() => setCFDAnalysesExpanded((v) => !v)}
                >
                  {cfdAnalyses.map((a) => (
                    <button
                      key={a.cfdAnalysisId}
                      type="button"
                      className="hgr-f-list-row"
                      onClick={() => setSelectedCFDAnalysis(a)}
                    >
                      <span className="hgr-f-list-row-code">{a.cfdCode}</span>
                      <span className="hgr-f-list-row-type">
                        {a.forces ? `Cl ${a.forces.cl}, Cd ${a.forces.cd}` : "—"}
                      </span>
                      <span className={`hgr-f-list-row-status hgr-f-list-row-status-${a.status}`}>
                        {CFD_ANALYSIS_STATUS_LABEL[a.status] ?? a.status}
                      </span>
                      <Phase1Badge compact />
                      <span className="hgr-f-list-row-confidence">
                        {a.confidenceScore !== null
                          ? `${Math.round(a.confidenceScore * 100)}%`
                          : "—"}
                      </span>
                      <span className="hgr-f-list-row-date">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </ListPanel>
              )}

            {selectedCFDAnalysis ? (
              <PastCFDAnalysisDetail
                analysis={selectedCFDAnalysis}
                onBack={() => setSelectedCFDAnalysis(null)}
              />
            ) : (
              <div className={isIdle ? "hgr-f-collapsible" : undefined}>
                {isIdle && (
                  <button
                    type="button"
                    className="hgr-f-collapsible-title"
                    onClick={() => setPlanExpanded((v) => !v)}
                    aria-expanded={planExpanded}
                  >
                    <span>Generate a CFD analysis</span>
                    <span className={`hgr-f-arrow${planExpanded ? " hgr-f-arrow-open" : ""}`}>
                      ▸
                    </span>
                  </button>
                )}
                {(!isIdle || planExpanded) && (
                  <div className={isIdle ? "hgr-f-collapsible-body" : undefined}>
                    {flow.status !== "complete" && (
                      <div className="hgr-f-process-grid">
                        <div>
                          {selectedCADDesign ? (
                            <div className="hgr-f-selected-spec">
                              <span className="hgr-f-selected-spec-label">Generating from</span>
                              <p>
                                <b>{selectedCADDesign.cadCode}</b> —{" "}
                                {selectedCADDesign.bom
                                  ? `${selectedCADDesign.bom.length} BOM entries`
                                  : "—"}
                              </p>
                              {flow.status !== "running" && (
                                <button
                                  type="button"
                                  className="hgr-f-btn hgr-f-btn-amber"
                                  onClick={generateCFDAnalysis}
                                >
                                  Run CFD Analysis →
                                </button>
                              )}
                            </div>
                          ) : (
                            <p className="hgr-f-status-idle">
                              Select a spec-ready CAD design above to begin running a CFD analysis.
                            </p>
                          )}
                          {flow.status === "error" && (
                            <StageErrorCard
                              title="Couldn't complete Output Generation."
                              message={flow.errorMessage}
                              onRetry={generateCFDAnalysis}
                            />
                          )}
                        </div>

                        {/* No multi-item stage tracker here, deliberately —
                            see the file header comment. Just the one real
                            stage's name and a single spinner. */}
                        <div className="hgr-f-status-panel">
                          <div className="hgr-f-status-panel-title">Output Generation</div>
                          {flow.status === "running" ? (
                            <div className="hgr-f-status-step hgr-f-status-step-active">
                              <span className="hgr-f-status-icon">
                                <span className="hgr-f-status-spinner" />
                              </span>
                              <span className="hgr-f-status-text">Processing…</span>
                            </div>
                          ) : flow.status === "error" ? (
                            <p className="hgr-f-status-idle">
                              Stopped — see the error below, then retry.
                            </p>
                          ) : (
                            <p className="hgr-f-status-idle">
                              Select a spec-ready CAD design, then generate to begin.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {flow.status === "complete" && flow.result && (
                      <CFDResultView result={flow.result} onStartNew={resetFlow} />
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
    <div className="hgr-f-collapsible" style={{ marginBottom: 20 }}>
      <button
        type="button"
        className="hgr-f-collapsible-title"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
      >
        <span>{title}</span>
        <span className={`hgr-f-arrow${expanded ? " hgr-f-arrow-open" : ""}`}>▸</span>
      </button>
      {expanded && <div className="hgr-f-list">{children}</div>}
    </div>
  );
}

function ListFetchError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="hgr-f-list-fetch-error">
      <p>Couldn't load this list — check your connection and try again.</p>
      <button type="button" className="hgr-f-btn hgr-f-btn-ghost" onClick={onRetry}>
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
    <div className="hgr-f-error">
      <b>{title}</b>
      <p>{message}</p>
      <button type="button" className="hgr-f-btn hgr-f-btn-ghost" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

// Unconditional, unlike Bay 04/05's MockSourceBadge — see the file header
// comment. Shown in all three places CFDAgent.md Section 8 calls for
// (result view, list row, detail view) on every single analysis, since
// Phase 1 never runs a real solver regardless of whether the LLM call
// itself succeeded.
function Phase1Badge({ compact }: { compact?: boolean }) {
  return (
    <span className={`hgr-f-mock-badge${compact ? " hgr-f-mock-badge-compact" : ""}`}>
      ⚠ Phase 1 — LLM reasoning only, no real CFD solver run
    </span>
  );
}

function ForcesFields({ forces }: { forces: CFDForces }) {
  return (
    <div className="hgr-f-dash-fields">
      <DashField label="Cl (lift coefficient)" value={String(forces.cl)} />
      <DashField label="Cd (drag coefficient)" value={String(forces.cd)} />
    </div>
  );
}

function CoefficientsFields({ coefficients }: { coefficients: CFDCoefficients }) {
  return (
    <div className="hgr-f-dash-fields">
      <DashField label="Cm (moment coefficient)" value={String(coefficients.cm)} />
    </div>
  );
}

function DashField({ label, value }: { label: string; value: string }) {
  return (
    <div className="hgr-f-dash-field">
      <div className="hgr-f-dash-field-label">{label}</div>
      <div className="hgr-f-dash-field-value">{value}</div>
    </div>
  );
}

function FlowFieldSection({ flowFields }: { flowFields: CFDFlowFields }) {
  if (!flowFields.description) {
    return <p className="hgr-f-dash-empty">No flow field description was generated.</p>;
  }
  return <p className="hgr-f-dash-rationale">{flowFields.description}</p>;
}

// Live result view, shown immediately after the stage completes. No
// Save-as-final / Edit-and-regenerate — no finalize stage exists, same
// reasoning as Bay 03/04's own result views.
function CFDResultView({
  result,
  onStartNew,
}: {
  result: CFDAnalysisResult;
  onStartNew: () => void;
}) {
  return (
    <div className="hgr-f-dash">
      <div className="hgr-f-dash-header">
        <div>
          <div className="hgr-f-dash-badge">Spec Ready</div>
          <h3>{result.cfdCode}</h3>
          <Phase1Badge />
        </div>
        <div className="hgr-f-dash-confidence">
          <div className="hgr-f-dash-confidence-num">
            {Math.round(result.confidenceScore * 100)}%
          </div>
          <div className="hgr-f-dash-confidence-label">Confidence</div>
        </div>
      </div>

      <div className="hgr-f-dash-section">
        <h4>Forces</h4>
        <ForcesFields forces={result.forces} />
      </div>

      <div className="hgr-f-dash-section">
        <h4>Coefficients</h4>
        <CoefficientsFields coefficients={result.coefficients} />
      </div>

      <div className="hgr-f-dash-section">
        <h4>Flow Field</h4>
        <FlowFieldSection flowFields={result.flowFields} />
      </div>

      <div className="hgr-f-dash-section">
        <h4>Design Rationale</h4>
        <p className="hgr-f-dash-rationale">{result.designRationale}</p>
      </div>

      <div className="hgr-f-dash-actions">
        <button
          type="button"
          className="hgr-f-btn hgr-f-btn-ghost"
          disabled
          title="Bay 09 not yet built"
        >
          Continue to Optimization Agent →
        </button>
        <button type="button" className="hgr-f-btn hgr-f-btn-amber" onClick={onStartNew}>
          Start a new CFD analysis
        </button>
      </div>
    </div>
  );
}

// Read-only view of a past analysis, opened from "Your CFD analyses" —
// reuses the same field components so a historical analysis looks the same
// as one just generated. No actions besides going back.
function PastCFDAnalysisDetail({
  analysis,
  onBack,
}: {
  analysis: CFDAnalysisListEntry;
  onBack: () => void;
}) {
  const hasOutput = analysis.forces !== null;
  return (
    <div className="hgr-f-dash">
      <div className="hgr-f-dash-header">
        <div>
          <div className="hgr-f-dash-badge">
            {CFD_ANALYSIS_STATUS_LABEL[analysis.status] ?? analysis.status}
          </div>
          <h3>{analysis.cfdCode}</h3>
          <Phase1Badge />
        </div>
        {analysis.confidenceScore !== null && (
          <div className="hgr-f-dash-confidence">
            <div className="hgr-f-dash-confidence-num">
              {Math.round(analysis.confidenceScore * 100)}%
            </div>
            <div className="hgr-f-dash-confidence-label">Confidence</div>
          </div>
        )}
      </div>
      {hasOutput ? (
        <>
          <div className="hgr-f-dash-section">
            <h4>Forces</h4>
            <ForcesFields forces={analysis.forces!} />
          </div>
          <div className="hgr-f-dash-section">
            <h4>Coefficients</h4>
            <CoefficientsFields coefficients={analysis.coefficients!} />
          </div>
          <div className="hgr-f-dash-section">
            <h4>Flow Field</h4>
            <FlowFieldSection flowFields={analysis.flowFields!} />
          </div>
          <div className="hgr-f-dash-section">
            <h4>Design Rationale</h4>
            <p className="hgr-f-dash-rationale">{analysis.designRationale}</p>
          </div>
        </>
      ) : (
        <div className="hgr-f-dash-section">
          <p className="hgr-f-dash-empty">
            No output was generated for this analysis — its status is "
            {CFD_ANALYSIS_STATUS_LABEL[analysis.status] ?? analysis.status}".
          </p>
        </div>
      )}
      <div className="hgr-f-dash-actions">
        <button type="button" className="hgr-f-btn hgr-f-btn-ghost" onClick={onBack}>
          ← Back to Your CFD analyses
        </button>
      </div>
    </div>
  );
}

const HGR_CFD_ANALYSIS_CSS = `
.hgr-f{
  --hgr-f-navy-deep:#08131F; --hgr-f-navy-panel:#0F2136;
  --hgr-f-blue-line:#3E7CA6; --hgr-f-blue-bright:#6FB4E0;
  --hgr-f-amber:#E8A33D; --hgr-f-amber-bright:#F6C374;
  --hgr-f-paper:#ECEFF3; --hgr-f-paper-dim:#8FA5BB;
  --hgr-f-green:#5FBF8F; --hgr-f-red:#E0715A;
  --hgr-f-grid:rgba(111,180,224,0.08); --hgr-f-hairline:rgba(111,180,224,0.20);

  background:var(--hgr-f-navy-deep); color:var(--hgr-f-paper); font-family:'IBM Plex Sans', sans-serif;
  background-image:linear-gradient(var(--hgr-f-grid) 1px, transparent 1px), linear-gradient(90deg, var(--hgr-f-grid) 1px, transparent 1px);
  background-size:44px 44px;
  min-height:100vh;
}
.hgr-f *{ box-sizing:border-box; }
.hgr-f h1,.hgr-f h2,.hgr-f h3{ font-family:'Space Grotesk', sans-serif; font-weight:600; letter-spacing:-0.01em; margin:0; }
.hgr-f-mono{ font-family:'IBM Plex Mono', monospace; }
.hgr-f-wrap{ max-width:1180px; margin:0 auto; padding:0 32px; }
.hgr-f a{ color:inherit; }

.hgr-f nav{ border-bottom:1px solid var(--hgr-f-hairline); position:sticky; top:0; background:rgba(8,19,31,0.9); backdrop-filter:blur(8px); z-index:20; }
.hgr-f nav .hgr-f-wrap{ display:flex; align-items:center; justify-content:space-between; height:68px; }
.hgr-f-crumbs{ font-size:14px; color:var(--hgr-f-paper-dim); display:flex; align-items:center; gap:8px; }
.hgr-f-crumbs a{ text-decoration:none; color:var(--hgr-f-paper-dim); }
.hgr-f-crumbs a:hover{ color:var(--hgr-f-blue-bright); }
.hgr-f-sep{ color:var(--hgr-f-blue-line); }
.hgr-f-cur{ color:var(--hgr-f-paper); font-weight:500; }
.hgr-f-exit{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-f-paper-dim); text-decoration:none; border:1px solid var(--hgr-f-hairline); padding:8px 15px; border-radius:2px; }
.hgr-f-exit:hover{ color:var(--hgr-f-paper); border-color:var(--hgr-f-blue-bright); }

.hgr-f main{ padding-bottom:100px; }
.hgr-f-hero{ padding:56px 0 20px; border-bottom:1px solid var(--hgr-f-hairline); position:relative; overflow:hidden; }
.hgr-f-doors{ position:absolute; inset:0; z-index:5; display:flex; pointer-events:none; }
.hgr-f-door{ flex:1; background: repeating-linear-gradient(90deg, #0C1E30 0 78px, #08131F 78px 80px); position:relative; }
.hgr-f-door::after{ content:""; position:absolute; top:0; bottom:0; width:2px; background:var(--hgr-f-blue-line); opacity:.5; }
.hgr-f-door-left{ animation: hgr-f-openLeft 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
.hgr-f-door-right{ animation: hgr-f-openRight 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
.hgr-f-door-left::after{ right:0; }
.hgr-f-door-right::after{ left:0; }
@keyframes hgr-f-openLeft{ from{ transform:translateX(0);} to{ transform:translateX(-100%);} }
@keyframes hgr-f-openRight{ from{ transform:translateX(0);} to{ transform:translateX(100%);} }
@media (prefers-reduced-motion: reduce){ .hgr-f-doors{ display:none; } }
.hgr-f-status-row{ display:flex; align-items:center; gap:12px; margin-bottom:22px; flex-wrap:wrap; }
.hgr-f-badge{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; letter-spacing:.1em; text-transform:uppercase; padding:6px 13px; border-radius:2px; display:inline-flex; align-items:center; gap:8px; }
.hgr-f-badge-bay{ color:var(--hgr-f-paper-dim); border:1px solid var(--hgr-f-hairline); }
.hgr-f-hero-row{ display:flex; align-items:center; gap:48px; flex-wrap:wrap; }
@media(max-width:760px){ .hgr-f-hero-row{ flex-direction:column; align-items:flex-start; gap:16px; } }
.hgr-f-hero h1{ font-size:clamp(34px,5vw,58px); margin:0; flex-shrink:0; }
.hgr-f-hero .hgr-f-lead{ color:var(--hgr-f-paper-dim); font-size:15.5px; max-width:480px; line-height:1.6; margin:0; flex:1; min-width:280px; }
.hgr-f-hero .hgr-f-lead b{ color:var(--hgr-f-paper); font-weight:600; }

.hgr-f section{ padding:60px 0; }
#generate-cfd-analysis{ padding-top:32px; }
.hgr-f-kicker{ font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--hgr-f-amber); margin-bottom:12px; }
.hgr-f-sec-title{ font-size:clamp(22px,2.6vw,30px); margin-bottom:10px; }
.hgr-f-sec-sub{ color:var(--hgr-f-paper-dim); font-size:14.5px; max-width:640px; margin-bottom:36px; }
.hgr-f-empty-hint{ color:var(--hgr-f-paper-dim); font-size:13.5px; margin-bottom:24px; }
.hgr-f-empty-hint a{ color:var(--hgr-f-blue-bright); }

.hgr-f-btn{ font-family:'IBM Plex Mono',monospace; font-size:13px; padding:12px 22px; border-radius:2px; display:inline-flex; align-items:center; gap:8px; text-decoration:none; border:1px solid transparent; cursor:pointer; background:none; }
.hgr-f-btn-ghost{ border:1px solid var(--hgr-f-hairline); color:var(--hgr-f-paper-dim); }
.hgr-f-btn-ghost:hover{ color:var(--hgr-f-paper); border-color:var(--hgr-f-blue-bright); }
.hgr-f-btn-amber{ background:var(--hgr-f-amber); color:var(--hgr-f-navy-deep); font-weight:600; }
.hgr-f-btn-amber:hover{ background:var(--hgr-f-amber-bright); }
.hgr-f-btn:disabled{ opacity:.4; cursor:not-allowed; }
.hgr-f-btn:disabled:hover{ color:var(--hgr-f-paper-dim); border-color:var(--hgr-f-hairline); }

/* ── Collapsible panels ── */
.hgr-f-collapsible{ border:1px solid var(--hgr-f-hairline); background:var(--hgr-f-navy-panel); border-radius:2px; margin-bottom:32px; }
.hgr-f-collapsible-title{ display:flex; align-items:center; justify-content:space-between; width:100%; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-f-paper-dim); padding:14px 18px; border:none; background:none; cursor:pointer; }
.hgr-f-collapsible-title:hover{ color:var(--hgr-f-paper); }
.hgr-f-arrow{ display:inline-block; font-size:11px; transition:transform .15s; }
.hgr-f-arrow-open{ transform:rotate(90deg); }
.hgr-f-list{ max-height:260px; overflow-y:auto; border-top:1px solid var(--hgr-f-hairline); }
.hgr-f-list-row{ display:grid; grid-template-columns:1.2fr 1.6fr 0.7fr auto 0.7fr 1fr; align-items:center; gap:10px; width:100%; padding:12px 18px; border:none; border-bottom:1px dashed var(--hgr-f-hairline); background:none; cursor:pointer; text-align:left; font-family:'IBM Plex Sans',sans-serif; transition:background .15s; }
.hgr-f-list-row:last-child{ border-bottom:none; }
.hgr-f-list-row:hover{ background:rgba(111,180,224,.07); }
@media(max-width:820px){ .hgr-f-list-row{ grid-template-columns:1fr 1fr; row-gap:4px; } }
.hgr-f-list-row-code{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-f-blue-bright); }
.hgr-f-list-row-type{ font-size:13px; color:var(--hgr-f-paper); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hgr-f-list-row-status{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.05em; text-transform:uppercase; color:var(--hgr-f-paper-dim); border:1px solid var(--hgr-f-hairline); padding:3px 8px; border-radius:2px; justify-self:start; white-space:nowrap; }
.hgr-f-list-row-status-spec_ready{ color:var(--hgr-f-blue-bright); border-color:rgba(111,180,224,.4); }
.hgr-f-list-row-status-finalized{ color:var(--hgr-f-amber-bright); border-color:rgba(232,163,61,.4); }
.hgr-f-list-row-status-error{ color:var(--hgr-f-amber); border-color:rgba(232,163,61,.4); }
.hgr-f-list-row-confidence{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-f-paper-dim); }
.hgr-f-list-row-date{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-f-paper-dim); text-align:right; }

/* ── List-fetch error ── */
.hgr-f-list-fetch-error{ display:flex; align-items:center; justify-content:space-between; gap:16px; padding:14px 18px; margin-bottom:20px; border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; }
.hgr-f-list-fetch-error p{ margin:0; color:var(--hgr-f-paper-dim); font-size:13.5px; }

/* ── Process grid + selected-spec / status panel ── */
.hgr-f-process-grid{ display:grid; grid-template-columns:1fr 320px; gap:32px; align-items:start; }
@media(max-width:820px){ .hgr-f-process-grid{ grid-template-columns:1fr; } }
.hgr-f-selected-spec{ max-width:640px; padding:14px 16px; border:1px solid rgba(111,180,224,.3); border-left:3px solid var(--hgr-f-blue-bright); background:rgba(111,180,224,.09); border-radius:2px; margin-bottom:20px; }
.hgr-f-selected-spec-label{ display:block; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-f-blue-bright); margin-bottom:8px; }
.hgr-f-selected-spec p{ margin:0 0 14px; font-size:14px; color:var(--hgr-f-paper); line-height:1.6; }

.hgr-f-status-panel{ border:1px solid var(--hgr-f-hairline); background:var(--hgr-f-navy-panel); border-radius:2px; padding:20px; }
.hgr-f-status-panel-title{ font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-f-paper-dim); margin-bottom:16px; }
.hgr-f-status-idle{ color:var(--hgr-f-paper-dim); font-size:13px; line-height:1.6; margin:0; }
.hgr-f-status-step{ display:flex; align-items:flex-start; gap:10px; padding:9px 0; }
.hgr-f-status-icon{ width:18px; height:18px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
.hgr-f-status-spinner{ width:13px; height:13px; border-radius:50%; border:2px solid var(--hgr-f-hairline); border-top-color:var(--hgr-f-amber); animation:hgr-f-spin 0.8s linear infinite; }
.hgr-f-status-text{ font-size:12.5px; line-height:1.5; color:var(--hgr-f-paper-dim); }
.hgr-f-status-step-active .hgr-f-status-text{ color:var(--hgr-f-paper); }

/* ── Phase 1 badge (unconditional — see file header comment) ── */
.hgr-f-mock-badge{ display:inline-flex; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.03em; color:var(--hgr-f-amber-bright); border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); padding:4px 9px; border-radius:2px; margin-top:8px; }
.hgr-f-mock-badge-compact{ margin-top:0; font-size:9.5px; padding:2px 7px; justify-self:start; }

/* ── Error ── */
@keyframes hgr-f-spin{ to{ transform:rotate(360deg); } }
.hgr-f-error{ border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; padding:20px 22px; max-width:640px; margin-top:20px; }
.hgr-f-error b{ color:var(--hgr-f-amber-bright); display:block; margin-bottom:6px; font-size:14px; }
.hgr-f-error p{ color:var(--hgr-f-paper-dim); font-size:13.5px; margin:0 0 16px; line-height:1.6; }

/* ── Dashboard / result views ── */
.hgr-f-dash{ border:1px solid var(--hgr-f-hairline); background:var(--hgr-f-navy-panel); }
.hgr-f-dash-header{ display:flex; align-items:flex-start; justify-content:space-between; gap:24px; padding:26px 28px; border-bottom:1px solid var(--hgr-f-hairline); flex-wrap:wrap; }
.hgr-f-dash-badge{ display:inline-block; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-f-blue-bright); border:1px solid rgba(111,180,224,.4); padding:4px 10px; border-radius:2px; margin-bottom:10px; }
.hgr-f-dash-header h3{ font-size:20px; margin-bottom:6px; }
.hgr-f-dash-confidence{ text-align:center; flex-shrink:0; }
.hgr-f-dash-confidence-num{ font-family:'Space Grotesk',sans-serif; font-size:32px; font-weight:700; color:var(--hgr-f-amber-bright); line-height:1; }
.hgr-f-dash-confidence-label{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-f-paper-dim); }
.hgr-f-dash-section{ padding:24px 28px; border-bottom:1px solid var(--hgr-f-hairline); }
.hgr-f-dash-section:last-of-type{ border-bottom:none; }
.hgr-f-dash-section h4{ font-family:'Space Grotesk',sans-serif; font-size:14.5px; font-weight:600; margin-bottom:16px; }
.hgr-f-dash-empty{ color:var(--hgr-f-paper-dim); font-size:13px; margin:0; }
.hgr-f-dash-rationale{ color:var(--hgr-f-paper); font-size:14px; line-height:1.7; margin:0; }
.hgr-f-dash-fields{ display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
@media(max-width:700px){ .hgr-f-dash-fields{ grid-template-columns:1fr 1fr; } }
.hgr-f-dash-field-label{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--hgr-f-paper-dim); margin-bottom:6px; }
.hgr-f-dash-field-value{ font-size:14px; }
`;
