import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useHangarSession } from "@/lib/the-hangar/session";
import { supabase } from "@/integrations/supabase/client";
import type { ValidationListEntry } from "@/lib/the-hangar/validationAgentPipeline";
import type {
  DocumentationResult,
  DocumentationListEntry,
} from "@/lib/the-hangar/documentationAgentPipeline";
import type { SLREntry } from "@/lib/the-hangar/documentationGeneration";

// -----------------------------------------------------------------------
// The Hangar -- Bay 13 (Documentation Agent) detail page, phase 1. New,
// self-contained page (no shared imports with any other bay page, matching
// the welcome page's own "fully isolated" convention).
//
// Single upstream picker: a spec-ready validation result from Bay 09.
// Bay 13 is a SIBLING of Bays 10, 11, 12, not a link in a chain -- all
// four fan in from Bay 09 independently (DocumentationAgent.md's own
// header note, including its disclosed scope decision to summarize only
// Bay 09's own result rather than reading every upstream bay directly).
// Everything else mirrors the-hangar.certification.tsx's shape --
// deliberately NOT a multi-item gated-stage tracker (this bay has exactly
// one real stage today, folding DocumentationAgent.md Sections 13.1-13.3
// into a single call -- see documentationAgentPipeline.ts's own header
// comment).
//
// source_was_mock is surfaced durably (live result, list row, past-
// documentation view) via MockSourceBadge, matching every prior bay's own
// convention. Unlike every prior downstream bay, this page has no
// verdict-based gating messaging -- a FAIL result still documents
// successfully, per DocumentationAgent.md's own DOC-002 note.
// -----------------------------------------------------------------------

export const Route = createFileRoute("/the-hangar/documentation")({
  component: TheHangarDocumentation,
});

interface FlowState {
  status: "idle" | "running" | "complete" | "error";
  result: DocumentationResult | null;
  errorMessage: string | null;
}

const INITIAL_FLOW_STATE: FlowState = { status: "idle", result: null, errorMessage: null };

const DOCUMENTATION_STATUS_LABEL: Record<string, string> = {
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

function TheHangarDocumentation() {
  const ready = useHangarSession();

  const [flow, setFlow] = useState<FlowState>(INITIAL_FLOW_STATE);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  const [validations, setValidations] = useState<ValidationListEntry[] | null>(null);
  const [validationsStatus, setValidationsStatus] = useState<"idle" | "loading" | "error">("idle");
  const [validationsExpanded, setValidationsExpanded] = useState(false);

  const [documentationsList, setDocumentationsList] = useState<DocumentationListEntry[] | null>(
    null,
  );
  const [documentationsStatus, setDocumentationsStatus] = useState<"idle" | "loading" | "error">(
    "idle",
  );
  const [documentationsExpanded, setDocumentationsExpanded] = useState(false);

  const [selectedSourceValidation, setSelectedSourceValidation] =
    useState<ValidationListEntry | null>(null);
  const [selectedDocumentation, setSelectedDocumentation] =
    useState<DocumentationListEntry | null>(null);
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

  async function fetchDocumentations() {
    setDocumentationsStatus("loading");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setDocumentationsStatus("error");
      return;
    }
    try {
      const res = await fetch("/api/hangar/documentations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDocumentationsList(await res.json());
      setDocumentationsStatus("idle");
    } catch {
      setDocumentationsStatus("error");
    }
  }

  useEffect(() => {
    if (currentUserEmail) fetchDocumentations();
  }, [currentUserEmail, flow.status]);

  function resetFlow() {
    setFlow(INITIAL_FLOW_STATE);
    setSelectedSourceValidation(null);
  }

  function selectSourceValidation(v: ValidationListEntry) {
    setFlow(INITIAL_FLOW_STATE);
    setSelectedDocumentation(null);
    setSelectedSourceValidation(v);
    setPlanExpanded(true);
  }

  async function generateDocumentation() {
    if (!selectedSourceValidation) return;
    setFlow({ status: "running", result: null, errorMessage: null });
    const outcome = await callStageApi<DocumentationResult>(
      "/api/hangar/process-documentation/content-compilation",
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
    <div className="hgr-d">
      <style>{HGR_DOCUMENTATION_CSS}</style>

      <nav>
        <div className="hgr-d-wrap">
          <div className="hgr-d-crumbs">
            <Link to="/">TorqWings</Link>
            <span className="hgr-d-sep">/</span>
            <Link to="/the-hangar">The Hangar</Link>
            <span className="hgr-d-sep">/</span>
            <span className="hgr-d-cur">Bay 13 -- Documentation Agent</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {currentUserEmail && (
              <span
                className="hgr-d-mono"
                style={{ fontSize: 12.5, color: "var(--hgr-d-paper-dim)" }}
              >
                Welcome, {currentUserEmail}
              </span>
            )}
            <Link to="/the-hangar/welcome" className="hgr-d-exit">
              ← Back to Hangar
            </Link>
            <Link to="/the-hangar" className="hgr-d-exit">
              Exit site
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <div className="hgr-d-hero">
          <div className="hgr-d-doors">
            <div className="hgr-d-door hgr-d-door-left" />
            <div className="hgr-d-door hgr-d-door-right" />
          </div>
          <div className="hgr-d-wrap">
            <div className="hgr-d-status-row">
              <span className="hgr-d-badge hgr-d-badge-bay">BAY 13 OF 15</span>
            </div>
            <div className="hgr-d-hero-row">
              <h1>Documentation Agent</h1>
              <p className="hgr-d-lead">
                Takes a <b>spec-ready validation result</b> from Bay 09 and compiles it into a
                report package -- a narrative summary, a structured logic record, and
                completeness flags. A FAIL result still gets documented honestly.
              </p>
            </div>
          </div>
        </div>

        <section id="run-documentation">
          <div className="hgr-d-wrap">
            <div className="hgr-d-kicker">Run a documentation pass</div>
            <h2 className="hgr-d-sec-title">
              Compile a report for a validated design.
            </h2>
            <p className="hgr-d-sec-sub">
              Runs one real Claude Sonnet 5 call to compile a summary report and structured logic
              record from Bay 09's result, then a deterministic confidence pass. There's no real
              template engine or drawing-generation tool yet, and this Phase 1 build summarizes
              only Bay 09's own result -- not a direct read of every upstream bay's data.
            </p>

            {validationsStatus === "error" && <ListFetchError onRetry={fetchValidations} />}

            {validationsStatus !== "error" &&
              validations &&
              validations.length > 0 &&
              !selectedDocumentation && (
                <ListPanel
                  title={`Your spec-ready validations (${validations.length})`}
                  expanded={validationsExpanded}
                  onToggleExpanded={() => setValidationsExpanded((v) => !v)}
                >
                  {validations.map((v) => (
                    <button
                      key={v.validationId}
                      type="button"
                      className={`hgr-d-list-row${selectedSourceValidation?.validationId === v.validationId ? " hgr-d-list-row-selected" : ""}`}
                      onClick={() => selectSourceValidation(v)}
                    >
                      <span className="hgr-d-list-row-code">{v.validationCode}</span>
                      <span className="hgr-d-list-row-type">
                        {v.verdict !== null ? VERDICT_LABEL[v.verdict] ?? v.verdict : "—"}
                      </span>
                      <MockSourceBadge show={v.sourceWasMock === true} compact />
                      <span className="hgr-d-list-row-confidence">
                        {v.confidenceScore !== null
                          ? `${Math.round(v.confidenceScore * 100)}%`
                          : "—"}
                      </span>
                      <span className="hgr-d-list-row-date">
                        {new Date(v.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </ListPanel>
              )}

            {validationsStatus !== "error" && validations && validations.length === 0 && (
              <p className="hgr-d-empty-hint">
                No spec-ready validations yet -- generate one in{" "}
                <Link to="/the-hangar/validation">Validation Agent</Link> first, then come back
                here.
              </p>
            )}

            {documentationsStatus === "error" && <ListFetchError onRetry={fetchDocumentations} />}

            {documentationsStatus !== "error" &&
              documentationsList &&
              documentationsList.length > 0 &&
              !selectedDocumentation && (
                <ListPanel
                  title={`Your documentation reports (${documentationsList.length})`}
                  expanded={documentationsExpanded}
                  onToggleExpanded={() => setDocumentationsExpanded((v) => !v)}
                >
                  {documentationsList.map((d) => (
                    <button
                      key={d.documentationId}
                      type="button"
                      className="hgr-d-list-row"
                      onClick={() => setSelectedDocumentation(d)}
                    >
                      <span className="hgr-d-list-row-code">{d.documentationCode}</span>
                      <span className="hgr-d-list-row-type">
                        {d.slr !== null ? `${d.slr.length} SLR entr${d.slr.length === 1 ? "y" : "ies"}` : "—"}
                      </span>
                      <span className={`hgr-d-list-row-status hgr-d-list-row-status-${d.status}`}>
                        {DOCUMENTATION_STATUS_LABEL[d.status] ?? d.status}
                      </span>
                      <MockSourceBadge show={d.sourceWasMock === true} compact />
                      <span className="hgr-d-list-row-confidence">
                        {d.confidenceScore !== null
                          ? `${Math.round(d.confidenceScore * 100)}%`
                          : "—"}
                      </span>
                      <span className="hgr-d-list-row-date">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </ListPanel>
              )}

            {selectedDocumentation ? (
              <PastDocumentationDetail
                documentation={selectedDocumentation}
                onBack={() => setSelectedDocumentation(null)}
              />
            ) : (
              <div className={isIdle ? "hgr-d-collapsible" : undefined}>
                {isIdle && (
                  <button
                    type="button"
                    className="hgr-d-collapsible-title"
                    onClick={() => setPlanExpanded((v) => !v)}
                    aria-expanded={planExpanded}
                  >
                    <span>Run a documentation pass</span>
                    <span className={`hgr-d-arrow${planExpanded ? " hgr-d-arrow-open" : ""}`}>
                      ▸
                    </span>
                  </button>
                )}
                {(!isIdle || planExpanded) && (
                  <div className={isIdle ? "hgr-d-collapsible-body" : undefined}>
                    {flow.status !== "complete" && (
                      <div className="hgr-d-process-grid">
                        <div>
                          {selectedSourceValidation ? (
                            <div className="hgr-d-selected-spec">
                              <span className="hgr-d-selected-spec-label">Documenting</span>
                              <p>
                                <b>{selectedSourceValidation.validationCode}</b> (Validation)
                              </p>
                              {flow.status !== "running" && (
                                <button
                                  type="button"
                                  className="hgr-d-btn hgr-d-btn-amber"
                                  onClick={generateDocumentation}
                                >
                                  Run Documentation Compilation →
                                </button>
                              )}
                            </div>
                          ) : (
                            <p className="hgr-d-status-idle">
                              Select one spec-ready validation result above to begin.
                            </p>
                          )}
                          {flow.status === "error" && (
                            <StageErrorCard
                              title="Couldn't complete Documentation Compilation."
                              message={flow.errorMessage}
                              onRetry={generateDocumentation}
                            />
                          )}
                        </div>

                        <div className="hgr-d-status-panel">
                          <div className="hgr-d-status-panel-title">Documentation Compilation</div>
                          {flow.status === "running" ? (
                            <div className="hgr-d-status-step hgr-d-status-step-active">
                              <span className="hgr-d-status-icon">
                                <span className="hgr-d-status-spinner" />
                              </span>
                              <span className="hgr-d-status-text">Processing…</span>
                            </div>
                          ) : flow.status === "error" ? (
                            <p className="hgr-d-status-idle">
                              Stopped -- see the error below, then retry.
                            </p>
                          ) : (
                            <p className="hgr-d-status-idle">
                              Select a validation result, then run to begin.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {flow.status === "complete" && flow.result && (
                      <DocumentationResultView result={flow.result} onStartNew={resetFlow} />
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
    <div className="hgr-d-collapsible" style={{ marginBottom: 20 }}>
      <button
        type="button"
        className="hgr-d-collapsible-title"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
      >
        <span>{title}</span>
        <span className={`hgr-d-arrow${expanded ? " hgr-d-arrow-open" : ""}`}>▸</span>
      </button>
      {expanded && <div className="hgr-d-list">{children}</div>}
    </div>
  );
}

function ListFetchError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="hgr-d-list-fetch-error">
      <p>Couldn't load this list -- check your connection and try again.</p>
      <button type="button" className="hgr-d-btn hgr-d-btn-ghost" onClick={onRetry}>
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
    <div className="hgr-d-error">
      <b>{title}</b>
      <p>{message}</p>
      <button type="button" className="hgr-d-btn hgr-d-btn-ghost" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

function MockSourceBadge({ show, compact }: { show: boolean; compact?: boolean }) {
  if (!show) return null;
  return (
    <span className={`hgr-d-mock-badge${compact ? " hgr-d-mock-badge-compact" : ""}`}>
      ⚠ Touched by mock/fallback data upstream
    </span>
  );
}

function SLRList({ slr }: { slr: SLREntry[] }) {
  if (slr.length === 0) {
    return <p className="hgr-d-dash-empty">No structured logic record entries.</p>;
  }
  return (
    <ol className="hgr-d-slr">
      {slr.map((s, i) => (
        <li key={i}>
          <b>{s.decision}</b>: {s.rationale}
        </li>
      ))}
    </ol>
  );
}

function CompletenessFlagsList({ flags }: { flags: string[] }) {
  if (flags.length === 0) {
    return <p className="hgr-d-dash-empty">No completeness flags.</p>;
  }
  return (
    <div className="hgr-d-completeness">
      <ul>
        {flags.map((flag, i) => (
          <li key={i}>{flag}</li>
        ))}
      </ul>
    </div>
  );
}

function DocumentationResultView({
  result,
  onStartNew,
}: {
  result: DocumentationResult;
  onStartNew: () => void;
}) {
  return (
    <div className="hgr-d-dash">
      <div className="hgr-d-dash-header">
        <div>
          <div className="hgr-d-dash-badge">Spec Ready</div>
          <h3>{result.documentationCode}</h3>
          <MockSourceBadge show={result.sourceWasMock} />
        </div>
        <div className="hgr-d-dash-confidence">
          <div className="hgr-d-dash-confidence-num">
            {Math.round(result.confidenceScore * 100)}%
          </div>
          <div className="hgr-d-dash-confidence-label">Confidence</div>
        </div>
      </div>

      <div className="hgr-d-dash-section">
        <h4>Report</h4>
        <p className="hgr-d-dash-rationale">{result.report}</p>
      </div>

      <div className="hgr-d-dash-section">
        <h4>Structured Logic Record ({result.slr.length})</h4>
        <SLRList slr={result.slr} />
      </div>

      <div className="hgr-d-dash-section">
        <h4>Completeness Flags ({result.completenessFlags.length})</h4>
        <CompletenessFlagsList flags={result.completenessFlags} />
      </div>

      <div className="hgr-d-dash-section">
        <h4>Reasoning Summary</h4>
        <p className="hgr-d-dash-rationale">{result.reasoningSummary}</p>
      </div>

      <div className="hgr-d-dash-actions">
        <button type="button" className="hgr-d-btn hgr-d-btn-amber" onClick={onStartNew}>
          Start a new documentation pass
        </button>
      </div>
    </div>
  );
}

function PastDocumentationDetail({
  documentation,
  onBack,
}: {
  documentation: DocumentationListEntry;
  onBack: () => void;
}) {
  const hasSpec = documentation.report !== null;
  return (
    <div className="hgr-d-dash">
      <div className="hgr-d-dash-header">
        <div>
          <div className="hgr-d-dash-badge">
            {DOCUMENTATION_STATUS_LABEL[documentation.status] ?? documentation.status}
          </div>
          <h3>{documentation.documentationCode}</h3>
          <MockSourceBadge show={documentation.sourceWasMock === true} />
        </div>
        {documentation.confidenceScore !== null && (
          <div className="hgr-d-dash-confidence">
            <div className="hgr-d-dash-confidence-num">
              {Math.round(documentation.confidenceScore * 100)}%
            </div>
            <div className="hgr-d-dash-confidence-label">Confidence</div>
          </div>
        )}
      </div>
      {hasSpec ? (
        <>
          <div className="hgr-d-dash-section">
            <h4>Report</h4>
            <p className="hgr-d-dash-rationale">{documentation.report}</p>
          </div>
          <div className="hgr-d-dash-section">
            <h4>Structured Logic Record ({documentation.slr?.length ?? 0})</h4>
            <SLRList slr={documentation.slr ?? []} />
          </div>
          <div className="hgr-d-dash-section">
            <h4>Completeness Flags ({documentation.completenessFlags?.length ?? 0})</h4>
            <CompletenessFlagsList flags={documentation.completenessFlags ?? []} />
          </div>
          <div className="hgr-d-dash-section">
            <h4>Reasoning Summary</h4>
            <p className="hgr-d-dash-rationale">{documentation.reasoningSummary}</p>
          </div>
        </>
      ) : (
        <div className="hgr-d-dash-section">
          <p className="hgr-d-dash-empty">
            No spec was generated for this documentation report -- its status is "
            {DOCUMENTATION_STATUS_LABEL[documentation.status] ?? documentation.status}".
          </p>
        </div>
      )}
      <div className="hgr-d-dash-actions">
        <button type="button" className="hgr-d-btn hgr-d-btn-ghost" onClick={onBack}>
          ← Back to Your documentation reports
        </button>
      </div>
    </div>
  );
}

const HGR_DOCUMENTATION_CSS = `
.hgr-d{
  --hgr-d-navy-deep:#08131F; --hgr-d-navy-panel:#0F2136;
  --hgr-d-blue-line:#3E7CA6; --hgr-d-blue-bright:#6FB4E0;
  --hgr-d-amber:#E8A33D; --hgr-d-amber-bright:#F6C374;
  --hgr-d-paper:#ECEFF3; --hgr-d-paper-dim:#8FA5BB;
  --hgr-d-green:#5FBF8F; --hgr-d-red:#E0715A;
  --hgr-d-grid:rgba(111,180,224,0.08); --hgr-d-hairline:rgba(111,180,224,0.20);

  background:var(--hgr-d-navy-deep); color:var(--hgr-d-paper); font-family:'IBM Plex Sans', sans-serif;
  background-image:linear-gradient(var(--hgr-d-grid) 1px, transparent 1px), linear-gradient(90deg, var(--hgr-d-grid) 1px, transparent 1px);
  background-size:44px 44px;
  min-height:100vh;
}
.hgr-d *{ box-sizing:border-box; }
.hgr-d h1,.hgr-d h2,.hgr-d h3{ font-family:'Space Grotesk', sans-serif; font-weight:600; letter-spacing:-0.01em; margin:0; }
.hgr-d-mono{ font-family:'IBM Plex Mono', monospace; }
.hgr-d-wrap{ max-width:1180px; margin:0 auto; padding:0 32px; }
.hgr-d a{ color:inherit; }

.hgr-d nav{ border-bottom:1px solid var(--hgr-d-hairline); position:sticky; top:0; background:rgba(8,19,31,0.9); backdrop-filter:blur(8px); z-index:20; }
.hgr-d nav .hgr-d-wrap{ display:flex; align-items:center; justify-content:space-between; height:68px; }
.hgr-d-crumbs{ font-size:14px; color:var(--hgr-d-paper-dim); display:flex; align-items:center; gap:8px; }
.hgr-d-crumbs a{ text-decoration:none; color:var(--hgr-d-paper-dim); }
.hgr-d-crumbs a:hover{ color:var(--hgr-d-blue-bright); }
.hgr-d-sep{ color:var(--hgr-d-blue-line); }
.hgr-d-cur{ color:var(--hgr-d-paper); font-weight:500; }
.hgr-d-exit{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-d-paper-dim); text-decoration:none; border:1px solid var(--hgr-d-hairline); padding:8px 15px; border-radius:2px; }
.hgr-d-exit:hover{ color:var(--hgr-d-paper); border-color:var(--hgr-d-blue-bright); }

.hgr-d main{ padding-bottom:100px; }
.hgr-d-hero{ padding:56px 0 20px; border-bottom:1px solid var(--hgr-d-hairline); position:relative; overflow:hidden; }
.hgr-d-doors{ position:absolute; inset:0; z-index:5; display:flex; pointer-events:none; }
.hgr-d-door{ flex:1; background: repeating-linear-gradient(90deg, #0C1E30 0 78px, #08131F 78px 80px); position:relative; }
.hgr-d-door::after{ content:""; position:absolute; top:0; bottom:0; width:2px; background:var(--hgr-d-blue-line); opacity:.5; }
.hgr-d-door-left{ animation: hgr-d-openLeft 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
.hgr-d-door-right{ animation: hgr-d-openRight 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
.hgr-d-door-left::after{ right:0; }
.hgr-d-door-right::after{ left:0; }
@keyframes hgr-d-openLeft{ from{ transform:translateX(0);} to{ transform:translateX(-100%);} }
@keyframes hgr-d-openRight{ from{ transform:translateX(0);} to{ transform:translateX(100%);} }
@media (prefers-reduced-motion: reduce){ .hgr-d-doors{ display:none; } }
.hgr-d-status-row{ display:flex; align-items:center; gap:12px; margin-bottom:22px; flex-wrap:wrap; }
.hgr-d-badge{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; letter-spacing:.1em; text-transform:uppercase; padding:6px 13px; border-radius:2px; display:inline-flex; align-items:center; gap:8px; }
.hgr-d-badge-bay{ color:var(--hgr-d-paper-dim); border:1px solid var(--hgr-d-hairline); }
.hgr-d-hero-row{ display:flex; align-items:center; gap:48px; flex-wrap:wrap; }
@media(max-width:760px){ .hgr-d-hero-row{ flex-direction:column; align-items:flex-start; gap:16px; } }
.hgr-d-hero h1{ font-size:clamp(34px,5vw,58px); margin:0; flex-shrink:0; }
.hgr-d-hero .hgr-d-lead{ color:var(--hgr-d-paper-dim); font-size:15.5px; max-width:520px; line-height:1.6; margin:0; flex:1; min-width:280px; }
.hgr-d-hero .hgr-d-lead b{ color:var(--hgr-d-paper); font-weight:600; }

.hgr-d section{ padding:60px 0; }
#run-documentation{ padding-top:32px; }
.hgr-d-kicker{ font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--hgr-d-amber); margin-bottom:12px; }
.hgr-d-sec-title{ font-size:clamp(22px,2.6vw,30px); margin-bottom:10px; }
.hgr-d-sec-sub{ color:var(--hgr-d-paper-dim); font-size:14.5px; max-width:640px; margin-bottom:36px; }
.hgr-d-empty-hint{ color:var(--hgr-d-paper-dim); font-size:13.5px; margin-bottom:24px; }
.hgr-d-empty-hint a{ color:var(--hgr-d-blue-bright); }

.hgr-d-btn{ font-family:'IBM Plex Mono',monospace; font-size:13px; padding:12px 22px; border-radius:2px; display:inline-flex; align-items:center; gap:8px; text-decoration:none; border:1px solid transparent; cursor:pointer; background:none; }
.hgr-d-btn-ghost{ border:1px solid var(--hgr-d-hairline); color:var(--hgr-d-paper-dim); }
.hgr-d-btn-ghost:hover{ color:var(--hgr-d-paper); border-color:var(--hgr-d-blue-bright); }
.hgr-d-btn-amber{ background:var(--hgr-d-amber); color:var(--hgr-d-navy-deep); font-weight:600; }
.hgr-d-btn-amber:hover{ background:var(--hgr-d-amber-bright); }
.hgr-d-btn:disabled{ opacity:.4; cursor:not-allowed; }
.hgr-d-btn:disabled:hover{ color:var(--hgr-d-paper-dim); border-color:var(--hgr-d-hairline); }

/* -- Collapsible panels -- */
.hgr-d-collapsible{ border:1px solid var(--hgr-d-hairline); background:var(--hgr-d-navy-panel); border-radius:2px; margin-bottom:32px; }
.hgr-d-collapsible-title{ display:flex; align-items:center; justify-content:space-between; width:100%; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-d-paper-dim); padding:14px 18px; border:none; background:none; cursor:pointer; }
.hgr-d-collapsible-title:hover{ color:var(--hgr-d-paper); }
.hgr-d-arrow{ display:inline-block; font-size:11px; transition:transform .15s; }
.hgr-d-arrow-open{ transform:rotate(90deg); }
.hgr-d-list{ max-height:260px; overflow-y:auto; border-top:1px solid var(--hgr-d-hairline); }
.hgr-d-list-row{ display:grid; grid-template-columns:1.2fr 1.6fr auto 0.7fr 1fr; align-items:center; gap:10px; width:100%; padding:12px 18px; border:none; border-bottom:1px dashed var(--hgr-d-hairline); background:none; cursor:pointer; text-align:left; font-family:'IBM Plex Sans',sans-serif; transition:background .15s; }
.hgr-d-list-row:last-child{ border-bottom:none; }
.hgr-d-list-row:hover{ background:rgba(111,180,224,.07); }
.hgr-d-list-row-selected{ background:rgba(232,163,61,.09); border-left:2px solid var(--hgr-d-amber); }
@media(max-width:820px){ .hgr-d-list-row{ grid-template-columns:1fr 1fr; row-gap:4px; } }
.hgr-d-list-row-code{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-d-blue-bright); }
.hgr-d-list-row-type{ font-size:13px; color:var(--hgr-d-paper); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hgr-d-list-row-status{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.05em; text-transform:uppercase; color:var(--hgr-d-paper-dim); border:1px solid var(--hgr-d-hairline); padding:3px 8px; border-radius:2px; justify-self:start; white-space:nowrap; }
.hgr-d-list-row-status-spec_ready{ color:var(--hgr-d-blue-bright); border-color:rgba(111,180,224,.4); }
.hgr-d-list-row-status-finalized{ color:var(--hgr-d-amber-bright); border-color:rgba(232,163,61,.4); }
.hgr-d-list-row-status-error{ color:var(--hgr-d-amber); border-color:rgba(232,163,61,.4); }
.hgr-d-list-row-confidence{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-d-paper-dim); }
.hgr-d-list-row-date{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-d-paper-dim); text-align:right; }

/* -- List-fetch error -- */
.hgr-d-list-fetch-error{ display:flex; align-items:center; justify-content:space-between; gap:16px; padding:14px 18px; margin-bottom:20px; border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; }
.hgr-d-list-fetch-error p{ margin:0; color:var(--hgr-d-paper-dim); font-size:13.5px; }

/* -- Process grid + selected-spec / status panel -- */
.hgr-d-process-grid{ display:grid; grid-template-columns:1fr 320px; gap:32px; align-items:start; }
@media(max-width:820px){ .hgr-d-process-grid{ grid-template-columns:1fr; } }
.hgr-d-selected-spec{ max-width:640px; padding:14px 16px; border:1px solid rgba(111,180,224,.3); border-left:3px solid var(--hgr-d-blue-bright); background:rgba(111,180,224,.09); border-radius:2px; margin-bottom:20px; }
.hgr-d-selected-spec-label{ display:block; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-d-blue-bright); margin-bottom:8px; }
.hgr-d-selected-spec p{ margin:0 0 14px; font-size:14px; color:var(--hgr-d-paper); line-height:1.6; }

.hgr-d-status-panel{ border:1px solid var(--hgr-d-hairline); background:var(--hgr-d-navy-panel); border-radius:2px; padding:20px; }
.hgr-d-status-panel-title{ font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-d-paper-dim); margin-bottom:16px; }
.hgr-d-status-idle{ color:var(--hgr-d-paper-dim); font-size:13px; line-height:1.6; margin:0; }
.hgr-d-status-step{ display:flex; align-items:flex-start; gap:10px; padding:9px 0; }
.hgr-d-status-icon{ width:18px; height:18px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
.hgr-d-status-spinner{ width:13px; height:13px; border-radius:50%; border:2px solid var(--hgr-d-hairline); border-top-color:var(--hgr-d-amber); animation:hgr-d-spin 0.8s linear infinite; }
.hgr-d-status-text{ font-size:12.5px; line-height:1.5; color:var(--hgr-d-paper-dim); }
.hgr-d-status-step-active .hgr-d-status-text{ color:var(--hgr-d-paper); }

/* -- Mock source badge -- */
.hgr-d-mock-badge{ display:inline-flex; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.03em; color:var(--hgr-d-amber-bright); border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); padding:4px 9px; border-radius:2px; margin-top:8px; }
.hgr-d-mock-badge-compact{ margin-top:0; font-size:9.5px; padding:2px 7px; justify-self:start; }

/* -- Error -- */
@keyframes hgr-d-spin{ to{ transform:rotate(360deg); } }
.hgr-d-error{ border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; padding:20px 22px; max-width:640px; margin-top:20px; }
.hgr-d-error b{ color:var(--hgr-d-amber-bright); display:block; margin-bottom:6px; font-size:14px; }
.hgr-d-error p{ color:var(--hgr-d-paper-dim); font-size:13.5px; margin:0 0 16px; line-height:1.6; }

/* -- Dashboard / result views -- */
.hgr-d-dash{ border:1px solid var(--hgr-d-hairline); background:var(--hgr-d-navy-panel); }
.hgr-d-dash-header{ display:flex; align-items:flex-start; justify-content:space-between; gap:24px; padding:26px 28px; border-bottom:1px solid var(--hgr-d-hairline); flex-wrap:wrap; }
.hgr-d-dash-badge{ display:inline-block; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-d-blue-bright); border:1px solid rgba(111,180,224,.4); padding:4px 10px; border-radius:2px; margin-bottom:10px; }
.hgr-d-dash-header h3{ font-size:20px; margin-bottom:6px; }
.hgr-d-dash-confidence{ text-align:center; flex-shrink:0; }
.hgr-d-dash-confidence-num{ font-family:'Space Grotesk',sans-serif; font-size:32px; font-weight:700; color:var(--hgr-d-amber-bright); line-height:1; }
.hgr-d-dash-confidence-label{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-d-paper-dim); }
.hgr-d-dash-section{ padding:24px 28px; border-bottom:1px solid var(--hgr-d-hairline); }
.hgr-d-dash-section:last-of-type{ border-bottom:none; }
.hgr-d-dash-section h4{ font-family:'Space Grotesk',sans-serif; font-size:14.5px; font-weight:600; margin-bottom:16px; }
.hgr-d-dash-empty{ color:var(--hgr-d-paper-dim); font-size:13px; margin:0; }
.hgr-d-dash-rationale{ color:var(--hgr-d-paper); font-size:14px; line-height:1.7; margin:0; }
.hgr-d-dash-actions{ display:flex; gap:12px; flex-wrap:wrap; padding:24px 28px; }

/* -- SLR / completeness flags -- */
.hgr-d-slr{ margin:0; padding-left:18px; color:var(--hgr-d-paper); font-size:13px; line-height:1.9; }
.hgr-d-completeness{ border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; padding:14px 16px; }
.hgr-d-completeness ul{ margin:0; padding-left:18px; color:var(--hgr-d-amber-bright); font-size:13px; line-height:1.7; }
`;
