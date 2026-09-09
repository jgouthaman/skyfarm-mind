import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useHangarSession } from "@/lib/the-hangar/session";
import { supabase } from "@/integrations/supabase/client";
import type { ValidationListEntry } from "@/lib/the-hangar/validationAgentPipeline";
import type {
  ManufacturingResult,
  ManufacturingListEntry,
} from "@/lib/the-hangar/manufacturingAgentPipeline";
import type { DFMIssue, BuildPlanStep, BOMItem } from "@/lib/the-hangar/manufacturingGeneration";

// -----------------------------------------------------------------------
// The Hangar -- Bay 11 (Manufacturing Agent) detail page, phase 1. New,
// self-contained page (no shared imports with any other bay page, matching
// the welcome page's own "fully isolated" convention).
//
// Single upstream picker: a spec-ready validation result from Bay 09.
// Bay 11 is a SIBLING of Bays 10, 12, 13, not a link in a chain -- all
// four fan in from Bay 09 independently (ManufacturingAgent.md's own
// header note). Everything else mirrors the-hangar.materials.tsx's shape
// -- deliberately NOT a multi-item gated-stage tracker (this bay has
// exactly one real stage today, folding ManufacturingAgent.md Sections
// 11.1-11.3 into a single call -- see manufacturingAgentPipeline.ts's own
// header comment).
//
// source_was_mock is surfaced durably (live result, list row, past-
// manufacturing view) via MockSourceBadge, matching every prior bay's own
// convention. DFM issues are rendered as visible, non-blocking advisory
// warnings, same as every prior bay's own risk/issue lists.
// -----------------------------------------------------------------------

export const Route = createFileRoute("/the-hangar/manufacturing")({
  component: TheHangarManufacturing,
});

interface FlowState {
  status: "idle" | "running" | "complete" | "error";
  result: ManufacturingResult | null;
  errorMessage: string | null;
}

const INITIAL_FLOW_STATE: FlowState = { status: "idle", result: null, errorMessage: null };

const MANUFACTURING_STATUS_LABEL: Record<string, string> = {
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

function TheHangarManufacturing() {
  const ready = useHangarSession();

  const [flow, setFlow] = useState<FlowState>(INITIAL_FLOW_STATE);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  const [validations, setValidations] = useState<ValidationListEntry[] | null>(null);
  const [validationsStatus, setValidationsStatus] = useState<"idle" | "loading" | "error">("idle");
  const [validationsExpanded, setValidationsExpanded] = useState(false);

  const [manufacturingsList, setManufacturingsList] = useState<ManufacturingListEntry[] | null>(
    null,
  );
  const [manufacturingsStatus, setManufacturingsStatus] = useState<"idle" | "loading" | "error">(
    "idle",
  );
  const [manufacturingsExpanded, setManufacturingsExpanded] = useState(false);

  const [selectedSourceValidation, setSelectedSourceValidation] =
    useState<ValidationListEntry | null>(null);
  const [selectedManufacturing, setSelectedManufacturing] =
    useState<ManufacturingListEntry | null>(null);
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

  async function fetchManufacturings() {
    setManufacturingsStatus("loading");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setManufacturingsStatus("error");
      return;
    }
    try {
      const res = await fetch("/api/hangar/manufacturings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setManufacturingsList(await res.json());
      setManufacturingsStatus("idle");
    } catch {
      setManufacturingsStatus("error");
    }
  }

  useEffect(() => {
    if (currentUserEmail) fetchManufacturings();
  }, [currentUserEmail, flow.status]);

  function resetFlow() {
    setFlow(INITIAL_FLOW_STATE);
    setSelectedSourceValidation(null);
  }

  function selectSourceValidation(v: ValidationListEntry) {
    setFlow(INITIAL_FLOW_STATE);
    setSelectedManufacturing(null);
    setSelectedSourceValidation(v);
    setPlanExpanded(true);
  }

  async function generateManufacturing() {
    if (!selectedSourceValidation) return;
    setFlow({ status: "running", result: null, errorMessage: null });
    const outcome = await callStageApi<ManufacturingResult>(
      "/api/hangar/process-manufacturing/manufacturability-review",
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
    <div className="hgr-mf">
      <style>{HGR_MANUFACTURING_CSS}</style>

      <nav>
        <div className="hgr-mf-wrap">
          <div className="hgr-mf-crumbs">
            <Link to="/">TorqWings</Link>
            <span className="hgr-mf-sep">/</span>
            <Link to="/the-hangar">The Hangar</Link>
            <span className="hgr-mf-sep">/</span>
            <span className="hgr-mf-cur">Bay 11 -- Manufacturing Agent</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {currentUserEmail && (
              <span
                className="hgr-mf-mono"
                style={{ fontSize: 12.5, color: "var(--hgr-mf-paper-dim)" }}
              >
                Welcome, {currentUserEmail}
              </span>
            )}
            <Link to="/the-hangar/welcome" className="hgr-mf-exit">
              ← Back to Hangar
            </Link>
            <Link to="/the-hangar" className="hgr-mf-exit">
              Exit site
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <div className="hgr-mf-hero">
          <div className="hgr-mf-doors">
            <div className="hgr-mf-door hgr-mf-door-left" />
            <div className="hgr-mf-door hgr-mf-door-right" />
          </div>
          <div className="hgr-mf-wrap">
            <div className="hgr-mf-status-row">
              <span className="hgr-mf-badge hgr-mf-badge-bay">BAY 11 OF 15</span>
            </div>
            <div className="hgr-mf-hero-row">
              <h1>Manufacturing Agent</h1>
              <p className="hgr-mf-lead">
                Takes a <b>spec-ready validation result</b> from Bay 09 and reasons about
                manufacturability -- a DFM report, a build plan, and a bill of materials, not a
                real DFM tool run.
              </p>
            </div>
          </div>
        </div>

        <section id="run-manufacturing">
          <div className="hgr-mf-wrap">
            <div className="hgr-mf-kicker">Run a manufacturability review</div>
            <h2 className="hgr-mf-sec-title">
              Assess build readiness for a validated design.
            </h2>
            <p className="hgr-mf-sec-sub">
              Runs one real Claude Sonnet 5 call to reason about likely manufacturability
              concerns, then a deterministic confidence pass. There's no real DFM rule engine or
              cost-modeling tool yet -- so this is Claude reasoning qualitatively about
              manufacturability for the one design you give it, not a claim of a real DFM
              simulation. DFM issues are advisory only -- nothing here is blocked by them.
            </p>

            {validationsStatus === "error" && <ListFetchError onRetry={fetchValidations} />}

            {validationsStatus !== "error" &&
              validations &&
              validations.length > 0 &&
              !selectedManufacturing && (
                <ListPanel
                  title={`Your spec-ready validations (${validations.length})`}
                  expanded={validationsExpanded}
                  onToggleExpanded={() => setValidationsExpanded((v) => !v)}
                >
                  {validations.map((v) => (
                    <button
                      key={v.validationId}
                      type="button"
                      className={`hgr-mf-list-row${selectedSourceValidation?.validationId === v.validationId ? " hgr-mf-list-row-selected" : ""}`}
                      onClick={() => selectSourceValidation(v)}
                    >
                      <span className="hgr-mf-list-row-code">{v.validationCode}</span>
                      <span className="hgr-mf-list-row-type">
                        {v.verdict !== null ? VERDICT_LABEL[v.verdict] ?? v.verdict : "—"}
                      </span>
                      <MockSourceBadge show={v.sourceWasMock === true} compact />
                      <span className="hgr-mf-list-row-confidence">
                        {v.confidenceScore !== null
                          ? `${Math.round(v.confidenceScore * 100)}%`
                          : "—"}
                      </span>
                      <span className="hgr-mf-list-row-date">
                        {new Date(v.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </ListPanel>
              )}

            {validationsStatus !== "error" && validations && validations.length === 0 && (
              <p className="hgr-mf-empty-hint">
                No spec-ready validations yet -- generate one in{" "}
                <Link to="/the-hangar/validation">Validation Agent</Link> first, then come back
                here.
              </p>
            )}

            {manufacturingsStatus === "error" && <ListFetchError onRetry={fetchManufacturings} />}

            {manufacturingsStatus !== "error" &&
              manufacturingsList &&
              manufacturingsList.length > 0 &&
              !selectedManufacturing && (
                <ListPanel
                  title={`Your manufacturing reviews (${manufacturingsList.length})`}
                  expanded={manufacturingsExpanded}
                  onToggleExpanded={() => setManufacturingsExpanded((v) => !v)}
                >
                  {manufacturingsList.map((m) => (
                    <button
                      key={m.manufacturingId}
                      type="button"
                      className="hgr-mf-list-row"
                      onClick={() => setSelectedManufacturing(m)}
                    >
                      <span className="hgr-mf-list-row-code">{m.manufacturingCode}</span>
                      <span className="hgr-mf-list-row-type">
                        {m.dfmReport !== null ? `${m.dfmReport.length} DFM issue(s)` : "—"}
                      </span>
                      <span className={`hgr-mf-list-row-status hgr-mf-list-row-status-${m.status}`}>
                        {MANUFACTURING_STATUS_LABEL[m.status] ?? m.status}
                      </span>
                      <MockSourceBadge show={m.sourceWasMock === true} compact />
                      <span className="hgr-mf-list-row-confidence">
                        {m.confidenceScore !== null
                          ? `${Math.round(m.confidenceScore * 100)}%`
                          : "—"}
                      </span>
                      <span className="hgr-mf-list-row-date">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </ListPanel>
              )}

            {selectedManufacturing ? (
              <PastManufacturingDetail
                manufacturing={selectedManufacturing}
                onBack={() => setSelectedManufacturing(null)}
              />
            ) : (
              <div className={isIdle ? "hgr-mf-collapsible" : undefined}>
                {isIdle && (
                  <button
                    type="button"
                    className="hgr-mf-collapsible-title"
                    onClick={() => setPlanExpanded((v) => !v)}
                    aria-expanded={planExpanded}
                  >
                    <span>Run a manufacturability review</span>
                    <span className={`hgr-mf-arrow${planExpanded ? " hgr-mf-arrow-open" : ""}`}>
                      ▸
                    </span>
                  </button>
                )}
                {(!isIdle || planExpanded) && (
                  <div className={isIdle ? "hgr-mf-collapsible-body" : undefined}>
                    {flow.status !== "complete" && (
                      <div className="hgr-mf-process-grid">
                        <div>
                          {selectedSourceValidation ? (
                            <div className="hgr-mf-selected-spec">
                              <span className="hgr-mf-selected-spec-label">Reviewing</span>
                              <p>
                                <b>{selectedSourceValidation.validationCode}</b> (Validation)
                              </p>
                              {flow.status !== "running" && (
                                <button
                                  type="button"
                                  className="hgr-mf-btn hgr-mf-btn-amber"
                                  onClick={generateManufacturing}
                                >
                                  Run Manufacturability Review →
                                </button>
                              )}
                            </div>
                          ) : (
                            <p className="hgr-mf-status-idle">
                              Select one spec-ready validation result above to begin.
                            </p>
                          )}
                          {flow.status === "error" && (
                            <StageErrorCard
                              title="Couldn't complete Manufacturability Review."
                              message={flow.errorMessage}
                              onRetry={generateManufacturing}
                            />
                          )}
                        </div>

                        <div className="hgr-mf-status-panel">
                          <div className="hgr-mf-status-panel-title">Manufacturability Review</div>
                          {flow.status === "running" ? (
                            <div className="hgr-mf-status-step hgr-mf-status-step-active">
                              <span className="hgr-mf-status-icon">
                                <span className="hgr-mf-status-spinner" />
                              </span>
                              <span className="hgr-mf-status-text">Processing…</span>
                            </div>
                          ) : flow.status === "error" ? (
                            <p className="hgr-mf-status-idle">
                              Stopped -- see the error below, then retry.
                            </p>
                          ) : (
                            <p className="hgr-mf-status-idle">
                              Select a validation result, then run to begin.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {flow.status === "complete" && flow.result && (
                      <ManufacturingResultView result={flow.result} onStartNew={resetFlow} />
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
    <div className="hgr-mf-collapsible" style={{ marginBottom: 20 }}>
      <button
        type="button"
        className="hgr-mf-collapsible-title"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
      >
        <span>{title}</span>
        <span className={`hgr-mf-arrow${expanded ? " hgr-mf-arrow-open" : ""}`}>▸</span>
      </button>
      {expanded && <div className="hgr-mf-list">{children}</div>}
    </div>
  );
}

function ListFetchError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="hgr-mf-list-fetch-error">
      <p>Couldn't load this list -- check your connection and try again.</p>
      <button type="button" className="hgr-mf-btn hgr-mf-btn-ghost" onClick={onRetry}>
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
    <div className="hgr-mf-error">
      <b>{title}</b>
      <p>{message}</p>
      <button type="button" className="hgr-mf-btn hgr-mf-btn-ghost" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

function MockSourceBadge({ show, compact }: { show: boolean; compact?: boolean }) {
  if (!show) return null;
  return (
    <span className={`hgr-mf-mock-badge${compact ? " hgr-mf-mock-badge-compact" : ""}`}>
      ⚠ Touched by mock/fallback data upstream
    </span>
  );
}

function DFMReportList({ issues }: { issues: DFMIssue[] }) {
  if (issues.length === 0) {
    return <p className="hgr-mf-dash-empty">No DFM issues found.</p>;
  }
  return (
    <ul className="hgr-mf-dfm">
      {issues.map((d, i) => (
        <li key={i}>
          <span className={`hgr-mf-severity-tag hgr-mf-severity-tag-${d.severity}`}>
            {d.severity}
          </span>{" "}
          <b>{d.issue}</b> -- {d.fixReference}
        </li>
      ))}
    </ul>
  );
}

function BuildPlanList({ steps }: { steps: BuildPlanStep[] }) {
  if (steps.length === 0) {
    return <p className="hgr-mf-dash-empty">No build plan steps were generated.</p>;
  }
  return (
    <ol className="hgr-mf-build-plan">
      {steps.map((s, i) => (
        <li key={i}>
          <b>{s.step}</b>: {s.detail}
        </li>
      ))}
    </ol>
  );
}

function BOMList({ items }: { items: BOMItem[] }) {
  if (items.length === 0) {
    return <p className="hgr-mf-dash-empty">No bill of materials was generated.</p>;
  }
  return (
    <ul className="hgr-mf-bom">
      {items.map((b, i) => (
        <li key={i}>
          <b>{b.component}</b> × {b.quantity} -- {b.notes}
        </li>
      ))}
    </ul>
  );
}

function ManufacturingResultView({
  result,
  onStartNew,
}: {
  result: ManufacturingResult;
  onStartNew: () => void;
}) {
  return (
    <div className="hgr-mf-dash">
      <div className="hgr-mf-dash-header">
        <div>
          <div className="hgr-mf-dash-badge">Spec Ready</div>
          <h3>{result.manufacturingCode}</h3>
          <MockSourceBadge show={result.sourceWasMock} />
        </div>
        <div className="hgr-mf-dash-confidence">
          <div className="hgr-mf-dash-confidence-num">
            {Math.round(result.confidenceScore * 100)}%
          </div>
          <div className="hgr-mf-dash-confidence-label">Confidence</div>
        </div>
      </div>

      <div className="hgr-mf-dash-section">
        <h4>DFM Report ({result.dfmReport.length})</h4>
        <DFMReportList issues={result.dfmReport} />
      </div>

      <div className="hgr-mf-dash-section">
        <h4>Build Plan ({result.buildPlan.length})</h4>
        <BuildPlanList steps={result.buildPlan} />
      </div>

      <div className="hgr-mf-dash-section">
        <h4>Bill of Materials ({result.billOfMaterials.length})</h4>
        <BOMList items={result.billOfMaterials} />
      </div>

      <div className="hgr-mf-dash-section">
        <h4>Reasoning Summary</h4>
        <p className="hgr-mf-dash-rationale">{result.reasoningSummary}</p>
      </div>

      <div className="hgr-mf-dash-actions">
        <button type="button" className="hgr-mf-btn hgr-mf-btn-amber" onClick={onStartNew}>
          Start a new manufacturability review
        </button>
      </div>
    </div>
  );
}

function PastManufacturingDetail({
  manufacturing,
  onBack,
}: {
  manufacturing: ManufacturingListEntry;
  onBack: () => void;
}) {
  const hasSpec = manufacturing.dfmReport !== null;
  return (
    <div className="hgr-mf-dash">
      <div className="hgr-mf-dash-header">
        <div>
          <div className="hgr-mf-dash-badge">
            {MANUFACTURING_STATUS_LABEL[manufacturing.status] ?? manufacturing.status}
          </div>
          <h3>{manufacturing.manufacturingCode}</h3>
          <MockSourceBadge show={manufacturing.sourceWasMock === true} />
        </div>
        {manufacturing.confidenceScore !== null && (
          <div className="hgr-mf-dash-confidence">
            <div className="hgr-mf-dash-confidence-num">
              {Math.round(manufacturing.confidenceScore * 100)}%
            </div>
            <div className="hgr-mf-dash-confidence-label">Confidence</div>
          </div>
        )}
      </div>
      {hasSpec ? (
        <>
          <div className="hgr-mf-dash-section">
            <h4>DFM Report ({manufacturing.dfmReport?.length ?? 0})</h4>
            <DFMReportList issues={manufacturing.dfmReport ?? []} />
          </div>
          <div className="hgr-mf-dash-section">
            <h4>Build Plan ({manufacturing.buildPlan?.length ?? 0})</h4>
            <BuildPlanList steps={manufacturing.buildPlan ?? []} />
          </div>
          <div className="hgr-mf-dash-section">
            <h4>Bill of Materials ({manufacturing.billOfMaterials?.length ?? 0})</h4>
            <BOMList items={manufacturing.billOfMaterials ?? []} />
          </div>
          <div className="hgr-mf-dash-section">
            <h4>Reasoning Summary</h4>
            <p className="hgr-mf-dash-rationale">{manufacturing.reasoningSummary}</p>
          </div>
        </>
      ) : (
        <div className="hgr-mf-dash-section">
          <p className="hgr-mf-dash-empty">
            No spec was generated for this manufacturing review -- its status is "
            {MANUFACTURING_STATUS_LABEL[manufacturing.status] ?? manufacturing.status}".
          </p>
        </div>
      )}
      <div className="hgr-mf-dash-actions">
        <button type="button" className="hgr-mf-btn hgr-mf-btn-ghost" onClick={onBack}>
          ← Back to Your manufacturing reviews
        </button>
      </div>
    </div>
  );
}

const HGR_MANUFACTURING_CSS = `
.hgr-mf{
  --hgr-mf-navy-deep:#08131F; --hgr-mf-navy-panel:#0F2136;
  --hgr-mf-blue-line:#3E7CA6; --hgr-mf-blue-bright:#6FB4E0;
  --hgr-mf-amber:#E8A33D; --hgr-mf-amber-bright:#F6C374;
  --hgr-mf-paper:#ECEFF3; --hgr-mf-paper-dim:#8FA5BB;
  --hgr-mf-green:#5FBF8F; --hgr-mf-red:#E0715A;
  --hgr-mf-grid:rgba(111,180,224,0.08); --hgr-mf-hairline:rgba(111,180,224,0.20);

  background:var(--hgr-mf-navy-deep); color:var(--hgr-mf-paper); font-family:'IBM Plex Sans', sans-serif;
  background-image:linear-gradient(var(--hgr-mf-grid) 1px, transparent 1px), linear-gradient(90deg, var(--hgr-mf-grid) 1px, transparent 1px);
  background-size:44px 44px;
  min-height:100vh;
}
.hgr-mf *{ box-sizing:border-box; }
.hgr-mf h1,.hgr-mf h2,.hgr-mf h3{ font-family:'Space Grotesk', sans-serif; font-weight:600; letter-spacing:-0.01em; margin:0; }
.hgr-mf-mono{ font-family:'IBM Plex Mono', monospace; }
.hgr-mf-wrap{ max-width:1180px; margin:0 auto; padding:0 32px; }
.hgr-mf a{ color:inherit; }

.hgr-mf nav{ border-bottom:1px solid var(--hgr-mf-hairline); position:sticky; top:0; background:rgba(8,19,31,0.9); backdrop-filter:blur(8px); z-index:20; }
.hgr-mf nav .hgr-mf-wrap{ display:flex; align-items:center; justify-content:space-between; height:68px; }
.hgr-mf-crumbs{ font-size:14px; color:var(--hgr-mf-paper-dim); display:flex; align-items:center; gap:8px; }
.hgr-mf-crumbs a{ text-decoration:none; color:var(--hgr-mf-paper-dim); }
.hgr-mf-crumbs a:hover{ color:var(--hgr-mf-blue-bright); }
.hgr-mf-sep{ color:var(--hgr-mf-blue-line); }
.hgr-mf-cur{ color:var(--hgr-mf-paper); font-weight:500; }
.hgr-mf-exit{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-mf-paper-dim); text-decoration:none; border:1px solid var(--hgr-mf-hairline); padding:8px 15px; border-radius:2px; }
.hgr-mf-exit:hover{ color:var(--hgr-mf-paper); border-color:var(--hgr-mf-blue-bright); }

.hgr-mf main{ padding-bottom:100px; }
.hgr-mf-hero{ padding:56px 0 20px; border-bottom:1px solid var(--hgr-mf-hairline); position:relative; overflow:hidden; }
.hgr-mf-doors{ position:absolute; inset:0; z-index:5; display:flex; pointer-events:none; }
.hgr-mf-door{ flex:1; background: repeating-linear-gradient(90deg, #0C1E30 0 78px, #08131F 78px 80px); position:relative; }
.hgr-mf-door::after{ content:""; position:absolute; top:0; bottom:0; width:2px; background:var(--hgr-mf-blue-line); opacity:.5; }
.hgr-mf-door-left{ animation: hgr-mf-openLeft 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
.hgr-mf-door-right{ animation: hgr-mf-openRight 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
.hgr-mf-door-left::after{ right:0; }
.hgr-mf-door-right::after{ left:0; }
@keyframes hgr-mf-openLeft{ from{ transform:translateX(0);} to{ transform:translateX(-100%);} }
@keyframes hgr-mf-openRight{ from{ transform:translateX(0);} to{ transform:translateX(100%);} }
@media (prefers-reduced-motion: reduce){ .hgr-mf-doors{ display:none; } }
.hgr-mf-status-row{ display:flex; align-items:center; gap:12px; margin-bottom:22px; flex-wrap:wrap; }
.hgr-mf-badge{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; letter-spacing:.1em; text-transform:uppercase; padding:6px 13px; border-radius:2px; display:inline-flex; align-items:center; gap:8px; }
.hgr-mf-badge-bay{ color:var(--hgr-mf-paper-dim); border:1px solid var(--hgr-mf-hairline); }
.hgr-mf-hero-row{ display:flex; align-items:center; gap:48px; flex-wrap:wrap; }
@media(max-width:760px){ .hgr-mf-hero-row{ flex-direction:column; align-items:flex-start; gap:16px; } }
.hgr-mf-hero h1{ font-size:clamp(34px,5vw,58px); margin:0; flex-shrink:0; }
.hgr-mf-hero .hgr-mf-lead{ color:var(--hgr-mf-paper-dim); font-size:15.5px; max-width:520px; line-height:1.6; margin:0; flex:1; min-width:280px; }
.hgr-mf-hero .hgr-mf-lead b{ color:var(--hgr-mf-paper); font-weight:600; }

.hgr-mf section{ padding:60px 0; }
#run-manufacturing{ padding-top:32px; }
.hgr-mf-kicker{ font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--hgr-mf-amber); margin-bottom:12px; }
.hgr-mf-sec-title{ font-size:clamp(22px,2.6vw,30px); margin-bottom:10px; }
.hgr-mf-sec-sub{ color:var(--hgr-mf-paper-dim); font-size:14.5px; max-width:640px; margin-bottom:36px; }
.hgr-mf-empty-hint{ color:var(--hgr-mf-paper-dim); font-size:13.5px; margin-bottom:24px; }
.hgr-mf-empty-hint a{ color:var(--hgr-mf-blue-bright); }

.hgr-mf-btn{ font-family:'IBM Plex Mono',monospace; font-size:13px; padding:12px 22px; border-radius:2px; display:inline-flex; align-items:center; gap:8px; text-decoration:none; border:1px solid transparent; cursor:pointer; background:none; }
.hgr-mf-btn-ghost{ border:1px solid var(--hgr-mf-hairline); color:var(--hgr-mf-paper-dim); }
.hgr-mf-btn-ghost:hover{ color:var(--hgr-mf-paper); border-color:var(--hgr-mf-blue-bright); }
.hgr-mf-btn-amber{ background:var(--hgr-mf-amber); color:var(--hgr-mf-navy-deep); font-weight:600; }
.hgr-mf-btn-amber:hover{ background:var(--hgr-mf-amber-bright); }
.hgr-mf-btn:disabled{ opacity:.4; cursor:not-allowed; }
.hgr-mf-btn:disabled:hover{ color:var(--hgr-mf-paper-dim); border-color:var(--hgr-mf-hairline); }

/* -- Collapsible panels -- */
.hgr-mf-collapsible{ border:1px solid var(--hgr-mf-hairline); background:var(--hgr-mf-navy-panel); border-radius:2px; margin-bottom:32px; }
.hgr-mf-collapsible-title{ display:flex; align-items:center; justify-content:space-between; width:100%; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-mf-paper-dim); padding:14px 18px; border:none; background:none; cursor:pointer; }
.hgr-mf-collapsible-title:hover{ color:var(--hgr-mf-paper); }
.hgr-mf-arrow{ display:inline-block; font-size:11px; transition:transform .15s; }
.hgr-mf-arrow-open{ transform:rotate(90deg); }
.hgr-mf-list{ max-height:260px; overflow-y:auto; border-top:1px solid var(--hgr-mf-hairline); }
.hgr-mf-list-row{ display:grid; grid-template-columns:1.2fr 1.6fr auto 0.7fr 1fr; align-items:center; gap:10px; width:100%; padding:12px 18px; border:none; border-bottom:1px dashed var(--hgr-mf-hairline); background:none; cursor:pointer; text-align:left; font-family:'IBM Plex Sans',sans-serif; transition:background .15s; }
.hgr-mf-list-row:last-child{ border-bottom:none; }
.hgr-mf-list-row:hover{ background:rgba(111,180,224,.07); }
.hgr-mf-list-row-selected{ background:rgba(232,163,61,.09); border-left:2px solid var(--hgr-mf-amber); }
@media(max-width:820px){ .hgr-mf-list-row{ grid-template-columns:1fr 1fr; row-gap:4px; } }
.hgr-mf-list-row-code{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-mf-blue-bright); }
.hgr-mf-list-row-type{ font-size:13px; color:var(--hgr-mf-paper); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hgr-mf-list-row-status{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.05em; text-transform:uppercase; color:var(--hgr-mf-paper-dim); border:1px solid var(--hgr-mf-hairline); padding:3px 8px; border-radius:2px; justify-self:start; white-space:nowrap; }
.hgr-mf-list-row-status-spec_ready{ color:var(--hgr-mf-blue-bright); border-color:rgba(111,180,224,.4); }
.hgr-mf-list-row-status-finalized{ color:var(--hgr-mf-amber-bright); border-color:rgba(232,163,61,.4); }
.hgr-mf-list-row-status-error{ color:var(--hgr-mf-amber); border-color:rgba(232,163,61,.4); }
.hgr-mf-list-row-confidence{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-mf-paper-dim); }
.hgr-mf-list-row-date{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-mf-paper-dim); text-align:right; }

/* -- List-fetch error -- */
.hgr-mf-list-fetch-error{ display:flex; align-items:center; justify-content:space-between; gap:16px; padding:14px 18px; margin-bottom:20px; border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; }
.hgr-mf-list-fetch-error p{ margin:0; color:var(--hgr-mf-paper-dim); font-size:13.5px; }

/* -- Process grid + selected-spec / status panel -- */
.hgr-mf-process-grid{ display:grid; grid-template-columns:1fr 320px; gap:32px; align-items:start; }
@media(max-width:820px){ .hgr-mf-process-grid{ grid-template-columns:1fr; } }
.hgr-mf-selected-spec{ max-width:640px; padding:14px 16px; border:1px solid rgba(111,180,224,.3); border-left:3px solid var(--hgr-mf-blue-bright); background:rgba(111,180,224,.09); border-radius:2px; margin-bottom:20px; }
.hgr-mf-selected-spec-label{ display:block; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-mf-blue-bright); margin-bottom:8px; }
.hgr-mf-selected-spec p{ margin:0 0 14px; font-size:14px; color:var(--hgr-mf-paper); line-height:1.6; }

.hgr-mf-status-panel{ border:1px solid var(--hgr-mf-hairline); background:var(--hgr-mf-navy-panel); border-radius:2px; padding:20px; }
.hgr-mf-status-panel-title{ font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-mf-paper-dim); margin-bottom:16px; }
.hgr-mf-status-idle{ color:var(--hgr-mf-paper-dim); font-size:13px; line-height:1.6; margin:0; }
.hgr-mf-status-step{ display:flex; align-items:flex-start; gap:10px; padding:9px 0; }
.hgr-mf-status-icon{ width:18px; height:18px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
.hgr-mf-status-spinner{ width:13px; height:13px; border-radius:50%; border:2px solid var(--hgr-mf-hairline); border-top-color:var(--hgr-mf-amber); animation:hgr-mf-spin 0.8s linear infinite; }
.hgr-mf-status-text{ font-size:12.5px; line-height:1.5; color:var(--hgr-mf-paper-dim); }
.hgr-mf-status-step-active .hgr-mf-status-text{ color:var(--hgr-mf-paper); }

/* -- Mock source badge -- */
.hgr-mf-mock-badge{ display:inline-flex; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.03em; color:var(--hgr-mf-amber-bright); border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); padding:4px 9px; border-radius:2px; margin-top:8px; }
.hgr-mf-mock-badge-compact{ margin-top:0; font-size:9.5px; padding:2px 7px; justify-self:start; }

/* -- Error -- */
@keyframes hgr-mf-spin{ to{ transform:rotate(360deg); } }
.hgr-mf-error{ border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; padding:20px 22px; max-width:640px; margin-top:20px; }
.hgr-mf-error b{ color:var(--hgr-mf-amber-bright); display:block; margin-bottom:6px; font-size:14px; }
.hgr-mf-error p{ color:var(--hgr-mf-paper-dim); font-size:13.5px; margin:0 0 16px; line-height:1.6; }

/* -- Dashboard / result views -- */
.hgr-mf-dash{ border:1px solid var(--hgr-mf-hairline); background:var(--hgr-mf-navy-panel); }
.hgr-mf-dash-header{ display:flex; align-items:flex-start; justify-content:space-between; gap:24px; padding:26px 28px; border-bottom:1px solid var(--hgr-mf-hairline); flex-wrap:wrap; }
.hgr-mf-dash-badge{ display:inline-block; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-mf-blue-bright); border:1px solid rgba(111,180,224,.4); padding:4px 10px; border-radius:2px; margin-bottom:10px; }
.hgr-mf-dash-header h3{ font-size:20px; margin-bottom:6px; }
.hgr-mf-dash-confidence{ text-align:center; flex-shrink:0; }
.hgr-mf-dash-confidence-num{ font-family:'Space Grotesk',sans-serif; font-size:32px; font-weight:700; color:var(--hgr-mf-amber-bright); line-height:1; }
.hgr-mf-dash-confidence-label{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-mf-paper-dim); }
.hgr-mf-dash-section{ padding:24px 28px; border-bottom:1px solid var(--hgr-mf-hairline); }
.hgr-mf-dash-section:last-of-type{ border-bottom:none; }
.hgr-mf-dash-section h4{ font-family:'Space Grotesk',sans-serif; font-size:14.5px; font-weight:600; margin-bottom:16px; }
.hgr-mf-dash-empty{ color:var(--hgr-mf-paper-dim); font-size:13px; margin:0; }
.hgr-mf-dash-rationale{ color:var(--hgr-mf-paper); font-size:14px; line-height:1.7; margin:0; }
.hgr-mf-dash-actions{ display:flex; gap:12px; flex-wrap:wrap; padding:24px 28px; }

/* -- DFM / build plan / BOM lists -- */
.hgr-mf-dfm{ margin:0; padding-left:18px; color:var(--hgr-mf-paper); font-size:13px; line-height:1.9; }
.hgr-mf-severity-tag{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.04em; text-transform:uppercase; }
.hgr-mf-severity-tag-low{ color:var(--hgr-mf-green); }
.hgr-mf-severity-tag-medium{ color:var(--hgr-mf-amber-bright); }
.hgr-mf-severity-tag-high{ color:var(--hgr-mf-amber); }
.hgr-mf-severity-tag-critical{ color:var(--hgr-mf-red); }
.hgr-mf-build-plan{ margin:0; padding-left:18px; color:var(--hgr-mf-paper); font-size:13px; line-height:1.9; }
.hgr-mf-bom{ margin:0; padding-left:18px; color:var(--hgr-mf-paper); font-size:13px; line-height:1.9; }
`;
