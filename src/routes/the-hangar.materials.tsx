import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useHangarSession } from "@/lib/the-hangar/session";
import { supabase } from "@/integrations/supabase/client";
import type { ValidationListEntry } from "@/lib/the-hangar/validationAgentPipeline";
import type {
  MaterialsResult,
  MaterialsListEntry,
} from "@/lib/the-hangar/materialsAgentPipeline";
import type { MaterialRecommendation } from "@/lib/the-hangar/materialsGeneration";

// -----------------------------------------------------------------------
// The Hangar -- Bay 10 (Materials Agent) detail page, phase 1. New,
// self-contained page (no shared imports with any other bay page, matching
// the welcome page's own "fully isolated" convention -- see
// the-hangar.validation.tsx's own header comment for the precedent).
//
// Single upstream picker: a spec-ready validation result from Bay 09.
// Bay 10 is a SIBLING of Bays 11-13, not a link in a chain -- all four fan
// in from Bay 09 independently (MaterialsAgent.md's own header note).
// Everything else mirrors the-hangar.validation.tsx's shape -- deliberately
// NOT a multi-item gated-stage tracker (this bay has exactly one real
// stage today, folding MaterialsAgent.md Sections 10.1-10.3 into a single
// call -- see materialsAgentPipeline.ts's own header comment).
//
// source_was_mock is surfaced durably (live result, list row, past-
// materials view) via MockSourceBadge, matching every prior bay's own
// convention. sourcingRiskFlags are rendered as visible, non-blocking
// advisory warnings, same as every prior bay's own RiskFlagsList.
// -----------------------------------------------------------------------

export const Route = createFileRoute("/the-hangar/materials")({
  component: TheHangarMaterials,
});

interface FlowState {
  status: "idle" | "running" | "complete" | "error";
  result: MaterialsResult | null;
  errorMessage: string | null;
}

const INITIAL_FLOW_STATE: FlowState = { status: "idle", result: null, errorMessage: null };

const MATERIALS_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  processing: "Processing",
  spec_ready: "Spec Ready",
  finalized: "Finalized",
  error: "Error",
};

const VERDICT_LABEL: Record<string, string> = {
  PASS: "Pass",
  FAIL: "Fail",
  CONDITIONAL: "Conditional",
};

// Same fetch/auth/error-normalizing helper as every other bay page's
// callStageApi, duplicated rather than shared -- this page's own isolation
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
          : "Unexpected error -- check your connection and try again.",
    };
  }
}

function TheHangarMaterials() {
  const ready = useHangarSession();

  const [flow, setFlow] = useState<FlowState>(INITIAL_FLOW_STATE);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  const [validations, setValidations] = useState<ValidationListEntry[] | null>(null);
  const [validationsStatus, setValidationsStatus] = useState<"idle" | "loading" | "error">("idle");
  const [validationsExpanded, setValidationsExpanded] = useState(false);

  const [materialsList, setMaterialsList] = useState<MaterialsListEntry[] | null>(null);
  const [materialsStatus, setMaterialsStatus] = useState<"idle" | "loading" | "error">("idle");
  const [materialsExpanded, setMaterialsExpanded] = useState(false);

  const [selectedSourceValidation, setSelectedSourceValidation] =
    useState<ValidationListEntry | null>(null);
  const [selectedMaterials, setSelectedMaterials] = useState<MaterialsListEntry | null>(null);
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

  // "Your spec-ready validations" -- reuses /api/hangar/validations (Bay
  // 09's own list route, no status filter) and filters to spec_ready
  // client-side, same pattern the-hangar.validation.tsx used for Bay 08's
  // list.
  async function fetchValidations() {
    setValidationsStatus("loading");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setValidationsStatus("error");
      return;
    }
    try {
      const res = await fetch("/api/hangar/validations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const all: ValidationListEntry[] = await res.json();
      setValidations(all.filter((v) => v.status === "spec_ready"));
      setValidationsStatus("idle");
    } catch {
      setValidationsStatus("error");
    }
  }

  useEffect(() => {
    if (currentUserEmail) fetchValidations();
  }, [currentUserEmail]);

  // "Your materials" -- refetched whenever a materials result reaches
  // spec_ready, same refresh-trigger pattern as every other bay's own list.
  async function fetchMaterials() {
    setMaterialsStatus("loading");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setMaterialsStatus("error");
      return;
    }
    try {
      const res = await fetch("/api/hangar/materials", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMaterialsList(await res.json());
      setMaterialsStatus("idle");
    } catch {
      setMaterialsStatus("error");
    }
  }

  useEffect(() => {
    if (currentUserEmail) fetchMaterials();
  }, [currentUserEmail, flow.status]);

  function resetFlow() {
    setFlow(INITIAL_FLOW_STATE);
    setSelectedSourceValidation(null);
  }

  function selectSourceValidation(v: ValidationListEntry) {
    setFlow(INITIAL_FLOW_STATE);
    setSelectedMaterials(null);
    setSelectedSourceValidation(v);
    setPlanExpanded(true);
  }

  async function generateMaterials() {
    if (!selectedSourceValidation) return;
    setFlow({ status: "running", result: null, errorMessage: null });
    const outcome = await callStageApi<MaterialsResult>(
      "/api/hangar/process-materials/material-selection",
      { validationId: selectedSourceValidation.validationId },
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
    <div className="hgr-m">
      <style>{HGR_MATERIALS_CSS}</style>

      <nav>
        <div className="hgr-m-wrap">
          <div className="hgr-m-crumbs">
            <Link to="/">TorqWings</Link>
            <span className="hgr-m-sep">/</span>
            <Link to="/the-hangar">The Hangar</Link>
            <span className="hgr-m-sep">/</span>
            <span className="hgr-m-cur">Bay 10 -- Materials Agent</span>
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
              <span className="hgr-m-badge hgr-m-badge-bay">BAY 10 OF 15</span>
            </div>
            <div className="hgr-m-hero-row">
              <h1>Materials Agent</h1>
              <p className="hgr-m-lead">
                Takes a <b>spec-ready validation result</b> from Bay 09 and reasons about
                per-component material choices -- ranked recommendations, a justification
                narrative, and sourcing risk flags, not a sourced supplier catalog lookup.
              </p>
            </div>
          </div>
        </div>

        <section id="run-materials">
          <div className="hgr-m-wrap">
            <div className="hgr-m-kicker">Run a materials pass</div>
            <h2 className="hgr-m-sec-title">
              Select materials for a validated design's components.
            </h2>
            <p className="hgr-m-sec-sub">
              Runs one real Claude Sonnet 5 call to reason about likely component-level material
              choices, then a deterministic confidence pass. There's no live materials database or
              supplier catalog yet -- so this is Claude reasoning qualitatively about materials for
              the one design you give it, not a claim of a sourced catalog lookup. Sourcing risk
              flags are advisory only -- nothing here is blocked by them.
            </p>

            {validationsStatus === "error" && <ListFetchError onRetry={fetchValidations} />}

            {validationsStatus !== "error" &&
              validations &&
              validations.length > 0 &&
              !selectedMaterials && (
                <ListPanel
                  title={`Your spec-ready validations (${validations.length})`}
                  expanded={validationsExpanded}
                  onToggleExpanded={() => setValidationsExpanded((v) => !v)}
                >
                  {validations.map((v) => (
                    <button
                      key={v.validationId}
                      type="button"
                      className={`hgr-m-list-row${selectedSourceValidation?.validationId === v.validationId ? " hgr-m-list-row-selected" : ""}`}
                      onClick={() => selectSourceValidation(v)}
                    >
                      <span className="hgr-m-list-row-code">{v.validationCode}</span>
                      <span className="hgr-m-list-row-type">
                        {v.verdict !== null ? VERDICT_LABEL[v.verdict] ?? v.verdict : "—"}
                      </span>
                      <MockSourceBadge show={v.sourceWasMock === true} compact />
                      <span className="hgr-m-list-row-confidence">
                        {v.confidenceScore !== null
                          ? `${Math.round(v.confidenceScore * 100)}%`
                          : "—"}
                      </span>
                      <span className="hgr-m-list-row-date">
                        {new Date(v.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </ListPanel>
              )}

            {validationsStatus !== "error" && validations && validations.length === 0 && (
              <p className="hgr-m-empty-hint">
                No spec-ready validations yet -- generate one in{" "}
                <Link to="/the-hangar/validation">Validation Agent</Link> first, then come back
                here.
              </p>
            )}

            {materialsStatus === "error" && <ListFetchError onRetry={fetchMaterials} />}

            {materialsStatus !== "error" &&
              materialsList &&
              materialsList.length > 0 &&
              !selectedMaterials && (
                <ListPanel
                  title={`Your materials (${materialsList.length})`}
                  expanded={materialsExpanded}
                  onToggleExpanded={() => setMaterialsExpanded((v) => !v)}
                >
                  {materialsList.map((m) => (
                    <button
                      key={m.materialsId}
                      type="button"
                      className="hgr-m-list-row"
                      onClick={() => setSelectedMaterials(m)}
                    >
                      <span className="hgr-m-list-row-code">{m.materialsCode}</span>
                      <span className="hgr-m-list-row-type">
                        {m.recommendations !== null
                          ? `${m.recommendations.length} recommendation(s)`
                          : "—"}
                      </span>
                      <span className={`hgr-m-list-row-status hgr-m-list-row-status-${m.status}`}>
                        {MATERIALS_STATUS_LABEL[m.status] ?? m.status}
                      </span>
                      <MockSourceBadge show={m.sourceWasMock === true} compact />
                      <span className="hgr-m-list-row-confidence">
                        {m.confidenceScore !== null
                          ? `${Math.round(m.confidenceScore * 100)}%`
                          : "—"}
                      </span>
                      <span className="hgr-m-list-row-date">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </ListPanel>
              )}

            {selectedMaterials ? (
              <PastMaterialsDetail
                materials={selectedMaterials}
                onBack={() => setSelectedMaterials(null)}
              />
            ) : (
              <div className={isIdle ? "hgr-m-collapsible" : undefined}>
                {isIdle && (
                  <button
                    type="button"
                    className="hgr-m-collapsible-title"
                    onClick={() => setPlanExpanded((v) => !v)}
                    aria-expanded={planExpanded}
                  >
                    <span>Run a materials pass</span>
                    <span className={`hgr-m-arrow${planExpanded ? " hgr-m-arrow-open" : ""}`}>
                      ▸
                    </span>
                  </button>
                )}
                {(!isIdle || planExpanded) && (
                  <div className={isIdle ? "hgr-m-collapsible-body" : undefined}>
                    {flow.status !== "complete" && (
                      <div className="hgr-m-process-grid">
                        <div>
                          {selectedSourceValidation ? (
                            <div className="hgr-m-selected-spec">
                              <span className="hgr-m-selected-spec-label">Selecting materials for</span>
                              <p>
                                <b>{selectedSourceValidation.validationCode}</b> (Validation)
                              </p>
                              {flow.status !== "running" && (
                                <button
                                  type="button"
                                  className="hgr-m-btn hgr-m-btn-amber"
                                  onClick={generateMaterials}
                                >
                                  Run Materials Selection →
                                </button>
                              )}
                            </div>
                          ) : (
                            <p className="hgr-m-status-idle">
                              Select one spec-ready validation result above to begin.
                            </p>
                          )}
                          {flow.status === "error" && (
                            <StageErrorCard
                              title="Couldn't complete Materials Selection."
                              message={flow.errorMessage}
                              onRetry={generateMaterials}
                            />
                          )}
                        </div>

                        {/* No multi-item stage tracker here, deliberately --
                            see the file header comment. Just the one real
                            stage's name and a single spinner. */}
                        <div className="hgr-m-status-panel">
                          <div className="hgr-m-status-panel-title">Materials Selection</div>
                          {flow.status === "running" ? (
                            <div className="hgr-m-status-step hgr-m-status-step-active">
                              <span className="hgr-m-status-icon">
                                <span className="hgr-m-status-spinner" />
                              </span>
                              <span className="hgr-m-status-text">Processing…</span>
                            </div>
                          ) : flow.status === "error" ? (
                            <p className="hgr-m-status-idle">
                              Stopped -- see the error below, then retry.
                            </p>
                          ) : (
                            <p className="hgr-m-status-idle">
                              Select a validation result, then run to begin.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {flow.status === "complete" && flow.result && (
                      <MaterialsResultView result={flow.result} onStartNew={resetFlow} />
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
    <div className="hgr-m-collapsible" style={{ marginBottom: 20 }}>
      <button
        type="button"
        className="hgr-m-collapsible-title"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
      >
        <span>{title}</span>
        <span className={`hgr-m-arrow${expanded ? " hgr-m-arrow-open" : ""}`}>▸</span>
      </button>
      {expanded && <div className="hgr-m-list">{children}</div>}
    </div>
  );
}

function ListFetchError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="hgr-m-list-fetch-error">
      <p>Couldn't load this list -- check your connection and try again.</p>
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

// Same durable-badge convention as every prior bay's MockSourceBadge --
// this bay's own source_was_mock is OR-composed from TWO sources (the
// upstream validation's, and this bay's own generation call -- see
// materialsAgentPipeline.ts), but the badge itself doesn't need to
// distinguish which; "was this ever touched by mock data" is a single
// boolean either way.
function MockSourceBadge({ show, compact }: { show: boolean; compact?: boolean }) {
  if (!show) return null;
  return (
    <span className={`hgr-m-mock-badge${compact ? " hgr-m-mock-badge-compact" : ""}`}>
      ⚠ Touched by mock/fallback data upstream
    </span>
  );
}

function RecommendationsList({ recommendations }: { recommendations: MaterialRecommendation[] }) {
  if (recommendations.length === 0) {
    return <p className="hgr-m-dash-empty">No material recommendations were generated.</p>;
  }
  return (
    <ul className="hgr-m-recommendations">
      {recommendations.map((r, i) => (
        <li key={i}>
          <b>{r.component}</b>: {r.material} -- {r.justification}
        </li>
      ))}
    </ul>
  );
}

// Advisory only, never blocking -- MaterialsAgent.md leaves gate-then-score
// eligibility for sourcing risk flags unresolved, same open question every
// prior bay carried forward for its own flags.
function SourcingRiskFlagsList({ flags }: { flags: string[] }) {
  if (flags.length === 0) {
    return <p className="hgr-m-dash-empty">No sourcing risk flags.</p>;
  }
  return (
    <div className="hgr-m-risk-flags">
      <ul>
        {flags.map((flag, i) => (
          <li key={i}>{flag}</li>
        ))}
      </ul>
    </div>
  );
}

// Live result view, shown immediately after the stage completes. No
// Save-as-final / Edit-and-regenerate -- no finalize stage exists, same
// reasoning as every prior bay's own result view.
function MaterialsResultView({
  result,
  onStartNew,
}: {
  result: MaterialsResult;
  onStartNew: () => void;
}) {
  return (
    <div className="hgr-m-dash">
      <div className="hgr-m-dash-header">
        <div>
          <div className="hgr-m-dash-badge">Spec Ready</div>
          <h3>{result.materialsCode}</h3>
          <MockSourceBadge show={result.sourceWasMock} />
        </div>
        <div className="hgr-m-dash-confidence">
          <div className="hgr-m-dash-confidence-num">
            {Math.round(result.confidenceScore * 100)}%
          </div>
          <div className="hgr-m-dash-confidence-label">Confidence</div>
        </div>
      </div>

      <div className="hgr-m-dash-section">
        <h4>Material Recommendations ({result.recommendations.length})</h4>
        <RecommendationsList recommendations={result.recommendations} />
      </div>

      <div className="hgr-m-dash-section">
        <h4>Rationale</h4>
        <p className="hgr-m-dash-rationale">{result.rationale}</p>
      </div>

      <div className="hgr-m-dash-section">
        <h4>Sourcing Risk Flags ({result.sourcingRiskFlags.length})</h4>
        <SourcingRiskFlagsList flags={result.sourcingRiskFlags} />
      </div>

      <div className="hgr-m-dash-section">
        <h4>Reasoning Summary</h4>
        <p className="hgr-m-dash-rationale">{result.reasoningSummary}</p>
      </div>

      <div className="hgr-m-dash-actions">
        <button type="button" className="hgr-m-btn hgr-m-btn-amber" onClick={onStartNew}>
          Start a new materials selection
        </button>
      </div>
    </div>
  );
}

// Read-only view of a past materials result, opened from "Your materials"
// -- reuses the same field components so a historical result looks the
// same as one just generated. No actions besides going back, same
// reasoning as every prior bay's own past-detail view.
function PastMaterialsDetail({
  materials,
  onBack,
}: {
  materials: MaterialsListEntry;
  onBack: () => void;
}) {
  const hasSpec = materials.recommendations !== null;
  return (
    <div className="hgr-m-dash">
      <div className="hgr-m-dash-header">
        <div>
          <div className="hgr-m-dash-badge">
            {MATERIALS_STATUS_LABEL[materials.status] ?? materials.status}
          </div>
          <h3>{materials.materialsCode}</h3>
          <MockSourceBadge show={materials.sourceWasMock === true} />
        </div>
        {materials.confidenceScore !== null && (
          <div className="hgr-m-dash-confidence">
            <div className="hgr-m-dash-confidence-num">
              {Math.round(materials.confidenceScore * 100)}%
            </div>
            <div className="hgr-m-dash-confidence-label">Confidence</div>
          </div>
        )}
      </div>
      {hasSpec ? (
        <>
          <div className="hgr-m-dash-section">
            <h4>Material Recommendations ({materials.recommendations?.length ?? 0})</h4>
            <RecommendationsList recommendations={materials.recommendations ?? []} />
          </div>
          <div className="hgr-m-dash-section">
            <h4>Rationale</h4>
            <p className="hgr-m-dash-rationale">{materials.rationale}</p>
          </div>
          <div className="hgr-m-dash-section">
            <h4>Sourcing Risk Flags ({materials.sourcingRiskFlags?.length ?? 0})</h4>
            <SourcingRiskFlagsList flags={materials.sourcingRiskFlags ?? []} />
          </div>
          <div className="hgr-m-dash-section">
            <h4>Reasoning Summary</h4>
            <p className="hgr-m-dash-rationale">{materials.reasoningSummary}</p>
          </div>
        </>
      ) : (
        <div className="hgr-m-dash-section">
          <p className="hgr-m-dash-empty">
            No spec was generated for this materials result -- its status is "
            {MATERIALS_STATUS_LABEL[materials.status] ?? materials.status}".
          </p>
        </div>
      )}
      <div className="hgr-m-dash-actions">
        <button type="button" className="hgr-m-btn hgr-m-btn-ghost" onClick={onBack}>
          ← Back to Your materials
        </button>
      </div>
    </div>
  );
}

const HGR_MATERIALS_CSS = `
.hgr-m{
  --hgr-m-navy-deep:#08131F; --hgr-m-navy-panel:#0F2136;
  --hgr-m-blue-line:#3E7CA6; --hgr-m-blue-bright:#6FB4E0;
  --hgr-m-amber:#E8A33D; --hgr-m-amber-bright:#F6C374;
  --hgr-m-paper:#ECEFF3; --hgr-m-paper-dim:#8FA5BB;
  --hgr-m-green:#5FBF8F; --hgr-m-red:#E0715A;
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
.hgr-m-status-row{ display:flex; align-items:center; gap:12px; margin-bottom:22px; flex-wrap:wrap; }
.hgr-m-badge{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; letter-spacing:.1em; text-transform:uppercase; padding:6px 13px; border-radius:2px; display:inline-flex; align-items:center; gap:8px; }
.hgr-m-badge-bay{ color:var(--hgr-m-paper-dim); border:1px solid var(--hgr-m-hairline); }
.hgr-m-hero-row{ display:flex; align-items:center; gap:48px; flex-wrap:wrap; }
@media(max-width:760px){ .hgr-m-hero-row{ flex-direction:column; align-items:flex-start; gap:16px; } }
.hgr-m-hero h1{ font-size:clamp(34px,5vw,58px); margin:0; flex-shrink:0; }
.hgr-m-hero .hgr-m-lead{ color:var(--hgr-m-paper-dim); font-size:15.5px; max-width:520px; line-height:1.6; margin:0; flex:1; min-width:280px; }
.hgr-m-hero .hgr-m-lead b{ color:var(--hgr-m-paper); font-weight:600; }

.hgr-m section{ padding:60px 0; }
#run-materials{ padding-top:32px; }
.hgr-m-kicker{ font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--hgr-m-amber); margin-bottom:12px; }
.hgr-m-sec-title{ font-size:clamp(22px,2.6vw,30px); margin-bottom:10px; }
.hgr-m-sec-sub{ color:var(--hgr-m-paper-dim); font-size:14.5px; max-width:640px; margin-bottom:36px; }
.hgr-m-empty-hint{ color:var(--hgr-m-paper-dim); font-size:13.5px; margin-bottom:24px; }
.hgr-m-empty-hint a{ color:var(--hgr-m-blue-bright); }

.hgr-m-btn{ font-family:'IBM Plex Mono',monospace; font-size:13px; padding:12px 22px; border-radius:2px; display:inline-flex; align-items:center; gap:8px; text-decoration:none; border:1px solid transparent; cursor:pointer; background:none; }
.hgr-m-btn-ghost{ border:1px solid var(--hgr-m-hairline); color:var(--hgr-m-paper-dim); }
.hgr-m-btn-ghost:hover{ color:var(--hgr-m-paper); border-color:var(--hgr-m-blue-bright); }
.hgr-m-btn-amber{ background:var(--hgr-m-amber); color:var(--hgr-m-navy-deep); font-weight:600; }
.hgr-m-btn-amber:hover{ background:var(--hgr-m-amber-bright); }
.hgr-m-btn:disabled{ opacity:.4; cursor:not-allowed; }
.hgr-m-btn:disabled:hover{ color:var(--hgr-m-paper-dim); border-color:var(--hgr-m-hairline); }

/* -- Collapsible panels -- */
.hgr-m-collapsible{ border:1px solid var(--hgr-m-hairline); background:var(--hgr-m-navy-panel); border-radius:2px; margin-bottom:32px; }
.hgr-m-collapsible-title{ display:flex; align-items:center; justify-content:space-between; width:100%; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-m-paper-dim); padding:14px 18px; border:none; background:none; cursor:pointer; }
.hgr-m-collapsible-title:hover{ color:var(--hgr-m-paper); }
.hgr-m-arrow{ display:inline-block; font-size:11px; transition:transform .15s; }
.hgr-m-arrow-open{ transform:rotate(90deg); }
.hgr-m-list{ max-height:260px; overflow-y:auto; border-top:1px solid var(--hgr-m-hairline); }
.hgr-m-list-row{ display:grid; grid-template-columns:1.2fr 1.6fr auto 0.7fr 1fr; align-items:center; gap:10px; width:100%; padding:12px 18px; border:none; border-bottom:1px dashed var(--hgr-m-hairline); background:none; cursor:pointer; text-align:left; font-family:'IBM Plex Sans',sans-serif; transition:background .15s; }
.hgr-m-list-row:last-child{ border-bottom:none; }
.hgr-m-list-row:hover{ background:rgba(111,180,224,.07); }
.hgr-m-list-row-selected{ background:rgba(232,163,61,.09); border-left:2px solid var(--hgr-m-amber); }
@media(max-width:820px){ .hgr-m-list-row{ grid-template-columns:1fr 1fr; row-gap:4px; } }
.hgr-m-list-row-code{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-m-blue-bright); }
.hgr-m-list-row-type{ font-size:13px; color:var(--hgr-m-paper); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hgr-m-list-row-status{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.05em; text-transform:uppercase; color:var(--hgr-m-paper-dim); border:1px solid var(--hgr-m-hairline); padding:3px 8px; border-radius:2px; justify-self:start; white-space:nowrap; }
.hgr-m-list-row-status-spec_ready{ color:var(--hgr-m-blue-bright); border-color:rgba(111,180,224,.4); }
.hgr-m-list-row-status-finalized{ color:var(--hgr-m-amber-bright); border-color:rgba(232,163,61,.4); }
.hgr-m-list-row-status-error{ color:var(--hgr-m-amber); border-color:rgba(232,163,61,.4); }
.hgr-m-list-row-confidence{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-m-paper-dim); }
.hgr-m-list-row-date{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-m-paper-dim); text-align:right; }

/* -- List-fetch error -- */
.hgr-m-list-fetch-error{ display:flex; align-items:center; justify-content:space-between; gap:16px; padding:14px 18px; margin-bottom:20px; border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; }
.hgr-m-list-fetch-error p{ margin:0; color:var(--hgr-m-paper-dim); font-size:13.5px; }

/* -- Process grid + selected-spec / status panel -- */
.hgr-m-process-grid{ display:grid; grid-template-columns:1fr 320px; gap:32px; align-items:start; }
@media(max-width:820px){ .hgr-m-process-grid{ grid-template-columns:1fr; } }
.hgr-m-selected-spec{ max-width:640px; padding:14px 16px; border:1px solid rgba(111,180,224,.3); border-left:3px solid var(--hgr-m-blue-bright); background:rgba(111,180,224,.09); border-radius:2px; margin-bottom:20px; }
.hgr-m-selected-spec-label{ display:block; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-m-blue-bright); margin-bottom:8px; }
.hgr-m-selected-spec p{ margin:0 0 14px; font-size:14px; color:var(--hgr-m-paper); line-height:1.6; }

.hgr-m-status-panel{ border:1px solid var(--hgr-m-hairline); background:var(--hgr-m-navy-panel); border-radius:2px; padding:20px; }
.hgr-m-status-panel-title{ font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-m-paper-dim); margin-bottom:16px; }
.hgr-m-status-idle{ color:var(--hgr-m-paper-dim); font-size:13px; line-height:1.6; margin:0; }
.hgr-m-status-step{ display:flex; align-items:flex-start; gap:10px; padding:9px 0; }
.hgr-m-status-icon{ width:18px; height:18px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
.hgr-m-status-spinner{ width:13px; height:13px; border-radius:50%; border:2px solid var(--hgr-m-hairline); border-top-color:var(--hgr-m-amber); animation:hgr-m-spin 0.8s linear infinite; }
.hgr-m-status-text{ font-size:12.5px; line-height:1.5; color:var(--hgr-m-paper-dim); }
.hgr-m-status-step-active .hgr-m-status-text{ color:var(--hgr-m-paper); }

/* -- Mock source badge (durable, matches every prior bay's convention) -- */
.hgr-m-mock-badge{ display:inline-flex; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.03em; color:var(--hgr-m-amber-bright); border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); padding:4px 9px; border-radius:2px; margin-top:8px; }
.hgr-m-mock-badge-compact{ margin-top:0; font-size:9.5px; padding:2px 7px; justify-self:start; }

/* -- Error -- */
@keyframes hgr-m-spin{ to{ transform:rotate(360deg); } }
.hgr-m-error{ border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; padding:20px 22px; max-width:640px; margin-top:20px; }
.hgr-m-error b{ color:var(--hgr-m-amber-bright); display:block; margin-bottom:6px; font-size:14px; }
.hgr-m-error p{ color:var(--hgr-m-paper-dim); font-size:13.5px; margin:0 0 16px; line-height:1.6; }

/* -- Dashboard / result views -- */
.hgr-m-dash{ border:1px solid var(--hgr-m-hairline); background:var(--hgr-m-navy-panel); }
.hgr-m-dash-header{ display:flex; align-items:flex-start; justify-content:space-between; gap:24px; padding:26px 28px; border-bottom:1px solid var(--hgr-m-hairline); flex-wrap:wrap; }
.hgr-m-dash-badge{ display:inline-block; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-m-blue-bright); border:1px solid rgba(111,180,224,.4); padding:4px 10px; border-radius:2px; margin-bottom:10px; }
.hgr-m-dash-header h3{ font-size:20px; margin-bottom:6px; }
.hgr-m-dash-confidence{ text-align:center; flex-shrink:0; }
.hgr-m-dash-confidence-num{ font-family:'Space Grotesk',sans-serif; font-size:32px; font-weight:700; color:var(--hgr-m-amber-bright); line-height:1; }
.hgr-m-dash-confidence-label{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-m-paper-dim); }
.hgr-m-dash-section{ padding:24px 28px; border-bottom:1px solid var(--hgr-m-hairline); }
.hgr-m-dash-section:last-of-type{ border-bottom:none; }
.hgr-m-dash-section h4{ font-family:'Space Grotesk',sans-serif; font-size:14.5px; font-weight:600; margin-bottom:16px; }
.hgr-m-dash-empty{ color:var(--hgr-m-paper-dim); font-size:13px; margin:0; }
.hgr-m-dash-rationale{ color:var(--hgr-m-paper); font-size:14px; line-height:1.7; margin:0; }
.hgr-m-dash-actions{ display:flex; gap:12px; flex-wrap:wrap; padding:24px 28px; }

/* -- Recommendations -- */
.hgr-m-recommendations{ margin:0; padding-left:18px; color:var(--hgr-m-paper); font-size:13px; line-height:1.9; }

/* -- Sourcing risk flags (advisory, non-blocking) -- */
.hgr-m-risk-flags{ border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; padding:14px 16px; }
.hgr-m-risk-flags ul{ margin:0; padding-left:18px; color:var(--hgr-m-amber-bright); font-size:13px; line-height:1.7; }
`;
