import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useHangarSession } from "@/lib/the-hangar/session";
import { supabase } from "@/integrations/supabase/client";
import type { OptimizationListEntry } from "@/lib/the-hangar/optimizationAgentPipeline";
import type {
  ValidationResult,
  ValidationListEntry,
} from "@/lib/the-hangar/validationAgentPipeline";
import type { ComplianceMatrixEntry, NonConformance } from "@/lib/the-hangar/validationGeneration";

// -----------------------------------------------------------------------
// The Hangar -- Bay 09 (Validation Agent) detail page, phase 1. New,
// self-contained page (no shared imports with any other bay page, matching
// the welcome page's own "fully isolated" convention -- see
// the-hangar.optimization.tsx's own header comment for the precedent).
//
// Unlike Bay 08's two-picker page, Bay 09 has exactly ONE upstream picker:
// a spec-ready optimization result from Bay 08. There's no second list to
// pick from -- structural safety margins and mission constraints are
// carried through automatically via the optimization's own upstream
// chain, not separately selected here (ValidationAgent.md Section 1).
// Everything else mirrors the-hangar.optimization.tsx's shape --
// deliberately NOT a multi-item gated-stage tracker (this bay has exactly
// one real stage today, folding ValidationAgent.md Sections 9.1-9.3 into a
// single call -- see validationAgentPipeline.ts's own header comment).
//
// source_was_mock is surfaced durably (live result, list row, past-
// validation view) via MockSourceBadge, matching every prior bay's own
// convention. risk_flags are rendered as visible, non-blocking advisory
// warnings, same as every prior bay's own RiskFlagsList.
// -----------------------------------------------------------------------

export const Route = createFileRoute("/the-hangar/validation")({
  component: TheHangarValidation,
});

interface FlowState {
  status: "idle" | "running" | "complete" | "error";
  result: ValidationResult | null;
  errorMessage: string | null;
}

const INITIAL_FLOW_STATE: FlowState = { status: "idle", result: null, errorMessage: null };

const VALIDATION_STATUS_LABEL: Record<string, string> = {
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

function TheHangarValidation() {
  const ready = useHangarSession();

  const [flow, setFlow] = useState<FlowState>(INITIAL_FLOW_STATE);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  const [optimizations, setOptimizations] = useState<OptimizationListEntry[] | null>(null);
  const [optimizationsStatus, setOptimizationsStatus] = useState<"idle" | "loading" | "error">(
    "idle",
  );
  const [optimizationsExpanded, setOptimizationsExpanded] = useState(false);

  const [validations, setValidations] = useState<ValidationListEntry[] | null>(null);
  const [validationsStatus, setValidationsStatus] = useState<"idle" | "loading" | "error">("idle");
  const [validationsExpanded, setValidationsExpanded] = useState(false);

  const [selectedSourceOptimization, setSelectedSourceOptimization] =
    useState<OptimizationListEntry | null>(null);
  const [selectedValidation, setSelectedValidation] = useState<ValidationListEntry | null>(null);
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

  // "Your spec-ready optimizations" -- reuses /api/hangar/optimizations
  // (Bay 08's own list route, no status filter) and filters to spec_ready
  // client-side, same pattern the-hangar.optimization.tsx used for Bay
  // 06/07's lists.
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
      const all: OptimizationListEntry[] = await res.json();
      setOptimizations(all.filter((o) => o.status === "spec_ready"));
      setOptimizationsStatus("idle");
    } catch {
      setOptimizationsStatus("error");
    }
  }

  useEffect(() => {
    if (currentUserEmail) fetchOptimizations();
  }, [currentUserEmail]);

  // "Your validations" -- refetched whenever a validation reaches
  // spec_ready, same refresh-trigger pattern as every other bay's own list.
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
      setValidations(await res.json());
      setValidationsStatus("idle");
    } catch {
      setValidationsStatus("error");
    }
  }

  useEffect(() => {
    if (currentUserEmail) fetchValidations();
  }, [currentUserEmail, flow.status]);

  function resetFlow() {
    setFlow(INITIAL_FLOW_STATE);
    setSelectedSourceOptimization(null);
  }

  function selectSourceOptimization(o: OptimizationListEntry) {
    setFlow(INITIAL_FLOW_STATE);
    setSelectedValidation(null);
    setSelectedSourceOptimization(o);
    setPlanExpanded(true);
  }

  async function generateValidation() {
    if (!selectedSourceOptimization) return;
    setFlow({ status: "running", result: null, errorMessage: null });
    const outcome = await callStageApi<ValidationResult>(
      "/api/hangar/process-validation/compliance-validation",
      { optimizationId: selectedSourceOptimization.optimizationId },
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
    <div className="hgr-v">
      <style>{HGR_VALIDATION_CSS}</style>

      <nav>
        <div className="hgr-v-wrap">
          <div className="hgr-v-crumbs">
            <Link to="/">TorqWings</Link>
            <span className="hgr-v-sep">/</span>
            <Link to="/the-hangar">The Hangar</Link>
            <span className="hgr-v-sep">/</span>
            <span className="hgr-v-cur">Bay 09 -- Validation Agent</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {currentUserEmail && (
              <span
                className="hgr-v-mono"
                style={{ fontSize: 12.5, color: "var(--hgr-v-paper-dim)" }}
              >
                Welcome, {currentUserEmail}
              </span>
            )}
            <Link to="/the-hangar/welcome" className="hgr-v-exit">
              ← Back to Hangar
            </Link>
            <Link to="/the-hangar" className="hgr-v-exit">
              Exit site
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <div className="hgr-v-hero">
          <div className="hgr-v-doors">
            <div className="hgr-v-door hgr-v-door-left" />
            <div className="hgr-v-door hgr-v-door-right" />
          </div>
          <div className="hgr-v-wrap">
            <div className="hgr-v-status-row">
              <span className="hgr-v-badge hgr-v-badge-bay">BAY 09 OF 15</span>
            </div>
            <div className="hgr-v-hero-row">
              <h1>Validation Agent</h1>
              <p className="hgr-v-lead">
                Takes a <b>spec-ready optimization result</b> from Bay 08 and reasons about the
                design's likely regulatory compliance -- a compliance matrix, non-conformances if
                any, a verdict, and a weighted readiness score, not a certified compliance audit.
              </p>
            </div>
          </div>
        </div>

        <section id="run-validation">
          <div className="hgr-v-wrap">
            <div className="hgr-v-kicker">Run a validation pass</div>
            <h2 className="hgr-v-sec-title">
              Check an optimization result's design against applicable standards.
            </h2>
            <p className="hgr-v-sec-sub">
              Runs one real Claude Sonnet 5 call to reason about the current design's likely
              regulatory compliance, then a deterministic confidence pass. There's no live
              FAR/EASA/MIL/ISO clause database yet -- so this is Claude reasoning qualitatively
              about compliance for the one design you give it, not a claim of a certified
              compliance audit. Risk flags are advisory only -- nothing here is blocked by them.
            </p>

            {optimizationsStatus === "error" && <ListFetchError onRetry={fetchOptimizations} />}

            {optimizationsStatus !== "error" &&
              optimizations &&
              optimizations.length > 0 &&
              !selectedValidation && (
                <ListPanel
                  title={`Your spec-ready optimizations (${optimizations.length})`}
                  expanded={optimizationsExpanded}
                  onToggleExpanded={() => setOptimizationsExpanded((v) => !v)}
                >
                  {optimizations.map((o) => (
                    <button
                      key={o.optimizationId}
                      type="button"
                      className={`hgr-v-list-row${selectedSourceOptimization?.optimizationId === o.optimizationId ? " hgr-v-list-row-selected" : ""}`}
                      onClick={() => selectSourceOptimization(o)}
                    >
                      <span className="hgr-v-list-row-code">{o.optimizationCode}</span>
                      <span className="hgr-v-list-row-type">
                        {o.overallOptimizationScore !== null
                          ? `Score ${Math.round(o.overallOptimizationScore * 100)}%`
                          : "—"}
                      </span>
                      <MockSourceBadge show={o.sourceWasMock === true} compact />
                      <span className="hgr-v-list-row-confidence">
                        {o.confidenceScore !== null
                          ? `${Math.round(o.confidenceScore * 100)}%`
                          : "—"}
                      </span>
                      <span className="hgr-v-list-row-date">
                        {new Date(o.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </ListPanel>
              )}

            {optimizationsStatus !== "error" && optimizations && optimizations.length === 0 && (
              <p className="hgr-v-empty-hint">
                No spec-ready optimizations yet -- generate one in{" "}
                <Link to="/the-hangar/optimization">Optimization Agent</Link> first, then come
                back here.
              </p>
            )}

            {validationsStatus === "error" && <ListFetchError onRetry={fetchValidations} />}

            {validationsStatus !== "error" &&
              validations &&
              validations.length > 0 &&
              !selectedValidation && (
                <ListPanel
                  title={`Your validations (${validations.length})`}
                  expanded={validationsExpanded}
                  onToggleExpanded={() => setValidationsExpanded((v) => !v)}
                >
                  {validations.map((v) => (
                    <button
                      key={v.validationId}
                      type="button"
                      className="hgr-v-list-row"
                      onClick={() => setSelectedValidation(v)}
                    >
                      <span className="hgr-v-list-row-code">{v.validationCode}</span>
                      <span className="hgr-v-list-row-type">
                        {v.verdict !== null ? VERDICT_LABEL[v.verdict] ?? v.verdict : "—"}
                      </span>
                      <span className={`hgr-v-list-row-status hgr-v-list-row-status-${v.status}`}>
                        {VALIDATION_STATUS_LABEL[v.status] ?? v.status}
                      </span>
                      <MockSourceBadge show={v.sourceWasMock === true} compact />
                      <span className="hgr-v-list-row-confidence">
                        {v.confidenceScore !== null
                          ? `${Math.round(v.confidenceScore * 100)}%`
                          : "—"}
                      </span>
                      <span className="hgr-v-list-row-date">
                        {new Date(v.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </ListPanel>
              )}

            {selectedValidation ? (
              <PastValidationDetail
                validation={selectedValidation}
                onBack={() => setSelectedValidation(null)}
              />
            ) : (
              <div className={isIdle ? "hgr-v-collapsible" : undefined}>
                {isIdle && (
                  <button
                    type="button"
                    className="hgr-v-collapsible-title"
                    onClick={() => setPlanExpanded((v) => !v)}
                    aria-expanded={planExpanded}
                  >
                    <span>Run a validation pass</span>
                    <span className={`hgr-v-arrow${planExpanded ? " hgr-v-arrow-open" : ""}`}>
                      ▸
                    </span>
                  </button>
                )}
                {(!isIdle || planExpanded) && (
                  <div className={isIdle ? "hgr-v-collapsible-body" : undefined}>
                    {flow.status !== "complete" && (
                      <div className="hgr-v-process-grid">
                        <div>
                          {selectedSourceOptimization ? (
                            <div className="hgr-v-selected-spec">
                              <span className="hgr-v-selected-spec-label">Validating</span>
                              <p>
                                <b>{selectedSourceOptimization.optimizationCode}</b> (Optimization)
                              </p>
                              {flow.status !== "running" && (
                                <button
                                  type="button"
                                  className="hgr-v-btn hgr-v-btn-amber"
                                  onClick={generateValidation}
                                >
                                  Run Validation →
                                </button>
                              )}
                            </div>
                          ) : (
                            <p className="hgr-v-status-idle">
                              Select one spec-ready optimization result above to begin.
                            </p>
                          )}
                          {flow.status === "error" && (
                            <StageErrorCard
                              title="Couldn't complete Validation."
                              message={flow.errorMessage}
                              onRetry={generateValidation}
                            />
                          )}
                        </div>

                        {/* No multi-item stage tracker here, deliberately --
                            see the file header comment. Just the one real
                            stage's name and a single spinner. */}
                        <div className="hgr-v-status-panel">
                          <div className="hgr-v-status-panel-title">Validation</div>
                          {flow.status === "running" ? (
                            <div className="hgr-v-status-step hgr-v-status-step-active">
                              <span className="hgr-v-status-icon">
                                <span className="hgr-v-status-spinner" />
                              </span>
                              <span className="hgr-v-status-text">Processing…</span>
                            </div>
                          ) : flow.status === "error" ? (
                            <p className="hgr-v-status-idle">
                              Stopped -- see the error below, then retry.
                            </p>
                          ) : (
                            <p className="hgr-v-status-idle">
                              Select an optimization result, then run to begin.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {flow.status === "complete" && flow.result && (
                      <ValidationResultView result={flow.result} onStartNew={resetFlow} />
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
    <div className="hgr-v-collapsible" style={{ marginBottom: 20 }}>
      <button
        type="button"
        className="hgr-v-collapsible-title"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
      >
        <span>{title}</span>
        <span className={`hgr-v-arrow${expanded ? " hgr-v-arrow-open" : ""}`}>▸</span>
      </button>
      {expanded && <div className="hgr-v-list">{children}</div>}
    </div>
  );
}

function ListFetchError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="hgr-v-list-fetch-error">
      <p>Couldn't load this list -- check your connection and try again.</p>
      <button type="button" className="hgr-v-btn hgr-v-btn-ghost" onClick={onRetry}>
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
    <div className="hgr-v-error">
      <b>{title}</b>
      <p>{message}</p>
      <button type="button" className="hgr-v-btn hgr-v-btn-ghost" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

// Same durable-badge convention as every prior bay's MockSourceBadge --
// this bay's own source_was_mock is OR-composed from TWO sources (the
// upstream optimization's, and this bay's own generation call -- see
// validationAgentPipeline.ts), but the badge itself doesn't need to
// distinguish which; "was this ever touched by mock data" is a single
// boolean either way.
function MockSourceBadge({ show, compact }: { show: boolean; compact?: boolean }) {
  if (!show) return null;
  return (
    <span className={`hgr-v-mock-badge${compact ? " hgr-v-mock-badge-compact" : ""}`}>
      ⚠ Touched by mock/fallback data upstream
    </span>
  );
}

function VerdictBadge({ verdict }: { verdict: "PASS" | "FAIL" | "CONDITIONAL" }) {
  return (
    <span className={`hgr-v-verdict-badge hgr-v-verdict-badge-${verdict.toLowerCase()}`}>
      {VERDICT_LABEL[verdict] ?? verdict}
    </span>
  );
}

function ComplianceMatrixTable({ matrix }: { matrix: ComplianceMatrixEntry[] }) {
  if (matrix.length === 0) {
    return <p className="hgr-v-dash-empty">No applicable standards were evaluated.</p>;
  }
  return (
    <ul className="hgr-v-matrix">
      {matrix.map((m, i) => (
        <li key={i}>
          <span className={`hgr-v-matrix-tag hgr-v-matrix-tag-${m.status}`}>{m.status}</span>{" "}
          <b>{m.standard}</b> -- {m.notes}
        </li>
      ))}
    </ul>
  );
}

function NonConformancesList({ nonConformances }: { nonConformances: NonConformance[] }) {
  if (nonConformances.length === 0) {
    return <p className="hgr-v-dash-empty">No non-conformances found.</p>;
  }
  return (
    <ul className="hgr-v-non-conformances">
      {nonConformances.map((n, i) => (
        <li key={i}>
          <span className={`hgr-v-severity-tag hgr-v-severity-tag-${n.severity}`}>
            {n.severity}
          </span>{" "}
          <b>{n.issue}</b> -- {n.fixReference}
        </li>
      ))}
    </ul>
  );
}

function DashField({ label, value }: { label: string; value: string }) {
  return (
    <div className="hgr-v-dash-field">
      <div className="hgr-v-dash-field-label">{label}</div>
      <div className="hgr-v-dash-field-value">{value}</div>
    </div>
  );
}

// Advisory only, never blocking -- ValidationAgent.md leaves "gate-then-
// score eligibility for risk_flags" unresolved, same open question every
// prior bay carried forward for its own flags.
function RiskFlagsList({ riskFlags }: { riskFlags: string[] }) {
  if (riskFlags.length === 0) {
    return <p className="hgr-v-dash-empty">No risk flags.</p>;
  }
  return (
    <div className="hgr-v-risk-flags">
      <ul>
        {riskFlags.map((flag, i) => (
          <li key={i}>{flag}</li>
        ))}
      </ul>
    </div>
  );
}

// Live result view, shown immediately after the stage completes. No
// Save-as-final / Edit-and-regenerate -- no finalize stage exists, same
// reasoning as every prior bay's own result view.
function ValidationResultView({
  result,
  onStartNew,
}: {
  result: ValidationResult;
  onStartNew: () => void;
}) {
  return (
    <div className="hgr-v-dash">
      <div className="hgr-v-dash-header">
        <div>
          <div className="hgr-v-dash-badge">Spec Ready</div>
          <h3>{result.validationCode}</h3>
          <VerdictBadge verdict={result.verdict} />
          <MockSourceBadge show={result.sourceWasMock} />
        </div>
        <div className="hgr-v-dash-confidence">
          <div className="hgr-v-dash-confidence-num">
            {Math.round(result.confidenceScore * 100)}%
          </div>
          <div className="hgr-v-dash-confidence-label">Confidence</div>
        </div>
      </div>

      <div className="hgr-v-dash-section">
        <h4>Compliance Matrix</h4>
        <ComplianceMatrixTable matrix={result.complianceMatrix} />
      </div>

      <div className="hgr-v-dash-section">
        <h4>Non-Conformances ({result.nonConformances.length})</h4>
        <NonConformancesList nonConformances={result.nonConformances} />
      </div>

      <div className="hgr-v-dash-section">
        <h4>Readiness Score</h4>
        <DashField label="Score" value={`${Math.round(result.readinessScore * 100)}%`} />
      </div>

      <div className="hgr-v-dash-section">
        <h4>Risk Flags ({result.riskFlags.length})</h4>
        <RiskFlagsList riskFlags={result.riskFlags} />
      </div>

      <div className="hgr-v-dash-section">
        <h4>Reasoning Summary</h4>
        <p className="hgr-v-dash-rationale">{result.reasoningSummary}</p>
      </div>

      <div className="hgr-v-dash-actions">
        <button
          type="button"
          className="hgr-v-btn hgr-v-btn-ghost"
          disabled
          title="Bay 10 not yet built"
        >
          Continue to Bay 10 →
        </button>
        <button type="button" className="hgr-v-btn hgr-v-btn-amber" onClick={onStartNew}>
          Start a new validation
        </button>
      </div>
    </div>
  );
}

// Read-only view of a past validation, opened from "Your validations" --
// reuses the same field components so a historical validation looks the
// same as one just generated. No actions besides going back, same
// reasoning as every prior bay's own past-detail view.
function PastValidationDetail({
  validation,
  onBack,
}: {
  validation: ValidationListEntry;
  onBack: () => void;
}) {
  const hasSpec = validation.verdict !== null;
  return (
    <div className="hgr-v-dash">
      <div className="hgr-v-dash-header">
        <div>
          <div className="hgr-v-dash-badge">
            {VALIDATION_STATUS_LABEL[validation.status] ?? validation.status}
          </div>
          <h3>{validation.validationCode}</h3>
          {validation.verdict !== null && <VerdictBadge verdict={validation.verdict} />}
          <MockSourceBadge show={validation.sourceWasMock === true} />
        </div>
        {validation.confidenceScore !== null && (
          <div className="hgr-v-dash-confidence">
            <div className="hgr-v-dash-confidence-num">
              {Math.round(validation.confidenceScore * 100)}%
            </div>
            <div className="hgr-v-dash-confidence-label">Confidence</div>
          </div>
        )}
      </div>
      {hasSpec ? (
        <>
          <div className="hgr-v-dash-section">
            <h4>Compliance Matrix</h4>
            <ComplianceMatrixTable matrix={validation.complianceMatrix ?? []} />
          </div>
          <div className="hgr-v-dash-section">
            <h4>Non-Conformances ({validation.nonConformances?.length ?? 0})</h4>
            <NonConformancesList nonConformances={validation.nonConformances ?? []} />
          </div>
          <div className="hgr-v-dash-section">
            <h4>Readiness Score</h4>
            <DashField
              label="Score"
              value={
                validation.readinessScore !== null
                  ? `${Math.round(validation.readinessScore * 100)}%`
                  : "—"
              }
            />
          </div>
          <div className="hgr-v-dash-section">
            <h4>Risk Flags ({validation.riskFlags?.length ?? 0})</h4>
            <RiskFlagsList riskFlags={validation.riskFlags ?? []} />
          </div>
          <div className="hgr-v-dash-section">
            <h4>Reasoning Summary</h4>
            <p className="hgr-v-dash-rationale">{validation.reasoningSummary}</p>
          </div>
        </>
      ) : (
        <div className="hgr-v-dash-section">
          <p className="hgr-v-dash-empty">
            No spec was generated for this validation -- its status is "
            {VALIDATION_STATUS_LABEL[validation.status] ?? validation.status}".
          </p>
        </div>
      )}
      <div className="hgr-v-dash-actions">
        <button type="button" className="hgr-v-btn hgr-v-btn-ghost" onClick={onBack}>
          ← Back to Your validations
        </button>
      </div>
    </div>
  );
}

const HGR_VALIDATION_CSS = `
.hgr-v{
  --hgr-v-navy-deep:#08131F; --hgr-v-navy-panel:#0F2136;
  --hgr-v-blue-line:#3E7CA6; --hgr-v-blue-bright:#6FB4E0;
  --hgr-v-amber:#E8A33D; --hgr-v-amber-bright:#F6C374;
  --hgr-v-paper:#ECEFF3; --hgr-v-paper-dim:#8FA5BB;
  --hgr-v-green:#5FBF8F; --hgr-v-red:#E0715A;
  --hgr-v-grid:rgba(111,180,224,0.08); --hgr-v-hairline:rgba(111,180,224,0.20);

  background:var(--hgr-v-navy-deep); color:var(--hgr-v-paper); font-family:'IBM Plex Sans', sans-serif;
  background-image:linear-gradient(var(--hgr-v-grid) 1px, transparent 1px), linear-gradient(90deg, var(--hgr-v-grid) 1px, transparent 1px);
  background-size:44px 44px;
  min-height:100vh;
}
.hgr-v *{ box-sizing:border-box; }
.hgr-v h1,.hgr-v h2,.hgr-v h3{ font-family:'Space Grotesk', sans-serif; font-weight:600; letter-spacing:-0.01em; margin:0; }
.hgr-v-mono{ font-family:'IBM Plex Mono', monospace; }
.hgr-v-wrap{ max-width:1180px; margin:0 auto; padding:0 32px; }
.hgr-v a{ color:inherit; }

.hgr-v nav{ border-bottom:1px solid var(--hgr-v-hairline); position:sticky; top:0; background:rgba(8,19,31,0.9); backdrop-filter:blur(8px); z-index:20; }
.hgr-v nav .hgr-v-wrap{ display:flex; align-items:center; justify-content:space-between; height:68px; }
.hgr-v-crumbs{ font-size:14px; color:var(--hgr-v-paper-dim); display:flex; align-items:center; gap:8px; }
.hgr-v-crumbs a{ text-decoration:none; color:var(--hgr-v-paper-dim); }
.hgr-v-crumbs a:hover{ color:var(--hgr-v-blue-bright); }
.hgr-v-sep{ color:var(--hgr-v-blue-line); }
.hgr-v-cur{ color:var(--hgr-v-paper); font-weight:500; }
.hgr-v-exit{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-v-paper-dim); text-decoration:none; border:1px solid var(--hgr-v-hairline); padding:8px 15px; border-radius:2px; }
.hgr-v-exit:hover{ color:var(--hgr-v-paper); border-color:var(--hgr-v-blue-bright); }

.hgr-v main{ padding-bottom:100px; }
.hgr-v-hero{ padding:56px 0 20px; border-bottom:1px solid var(--hgr-v-hairline); position:relative; overflow:hidden; }
.hgr-v-doors{ position:absolute; inset:0; z-index:5; display:flex; pointer-events:none; }
.hgr-v-door{ flex:1; background: repeating-linear-gradient(90deg, #0C1E30 0 78px, #08131F 78px 80px); position:relative; }
.hgr-v-door::after{ content:""; position:absolute; top:0; bottom:0; width:2px; background:var(--hgr-v-blue-line); opacity:.5; }
.hgr-v-door-left{ animation: hgr-v-openLeft 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
.hgr-v-door-right{ animation: hgr-v-openRight 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
.hgr-v-door-left::after{ right:0; }
.hgr-v-door-right::after{ left:0; }
@keyframes hgr-v-openLeft{ from{ transform:translateX(0);} to{ transform:translateX(-100%);} }
@keyframes hgr-v-openRight{ from{ transform:translateX(0);} to{ transform:translateX(100%);} }
@media (prefers-reduced-motion: reduce){ .hgr-v-doors{ display:none; } }
.hgr-v-status-row{ display:flex; align-items:center; gap:12px; margin-bottom:22px; flex-wrap:wrap; }
.hgr-v-badge{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; letter-spacing:.1em; text-transform:uppercase; padding:6px 13px; border-radius:2px; display:inline-flex; align-items:center; gap:8px; }
.hgr-v-badge-bay{ color:var(--hgr-v-paper-dim); border:1px solid var(--hgr-v-hairline); }
.hgr-v-hero-row{ display:flex; align-items:center; gap:48px; flex-wrap:wrap; }
@media(max-width:760px){ .hgr-v-hero-row{ flex-direction:column; align-items:flex-start; gap:16px; } }
.hgr-v-hero h1{ font-size:clamp(34px,5vw,58px); margin:0; flex-shrink:0; }
.hgr-v-hero .hgr-v-lead{ color:var(--hgr-v-paper-dim); font-size:15.5px; max-width:520px; line-height:1.6; margin:0; flex:1; min-width:280px; }
.hgr-v-hero .hgr-v-lead b{ color:var(--hgr-v-paper); font-weight:600; }

.hgr-v section{ padding:60px 0; }
#run-validation{ padding-top:32px; }
.hgr-v-kicker{ font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--hgr-v-amber); margin-bottom:12px; }
.hgr-v-sec-title{ font-size:clamp(22px,2.6vw,30px); margin-bottom:10px; }
.hgr-v-sec-sub{ color:var(--hgr-v-paper-dim); font-size:14.5px; max-width:640px; margin-bottom:36px; }
.hgr-v-empty-hint{ color:var(--hgr-v-paper-dim); font-size:13.5px; margin-bottom:24px; }
.hgr-v-empty-hint a{ color:var(--hgr-v-blue-bright); }

.hgr-v-btn{ font-family:'IBM Plex Mono',monospace; font-size:13px; padding:12px 22px; border-radius:2px; display:inline-flex; align-items:center; gap:8px; text-decoration:none; border:1px solid transparent; cursor:pointer; background:none; }
.hgr-v-btn-ghost{ border:1px solid var(--hgr-v-hairline); color:var(--hgr-v-paper-dim); }
.hgr-v-btn-ghost:hover{ color:var(--hgr-v-paper); border-color:var(--hgr-v-blue-bright); }
.hgr-v-btn-amber{ background:var(--hgr-v-amber); color:var(--hgr-v-navy-deep); font-weight:600; }
.hgr-v-btn-amber:hover{ background:var(--hgr-v-amber-bright); }
.hgr-v-btn:disabled{ opacity:.4; cursor:not-allowed; }
.hgr-v-btn:disabled:hover{ color:var(--hgr-v-paper-dim); border-color:var(--hgr-v-hairline); }

/* -- Collapsible panels -- */
.hgr-v-collapsible{ border:1px solid var(--hgr-v-hairline); background:var(--hgr-v-navy-panel); border-radius:2px; margin-bottom:32px; }
.hgr-v-collapsible-title{ display:flex; align-items:center; justify-content:space-between; width:100%; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-v-paper-dim); padding:14px 18px; border:none; background:none; cursor:pointer; }
.hgr-v-collapsible-title:hover{ color:var(--hgr-v-paper); }
.hgr-v-arrow{ display:inline-block; font-size:11px; transition:transform .15s; }
.hgr-v-arrow-open{ transform:rotate(90deg); }
.hgr-v-list{ max-height:260px; overflow-y:auto; border-top:1px solid var(--hgr-v-hairline); }
.hgr-v-list-row{ display:grid; grid-template-columns:1.2fr 1.6fr auto 0.7fr 1fr; align-items:center; gap:10px; width:100%; padding:12px 18px; border:none; border-bottom:1px dashed var(--hgr-v-hairline); background:none; cursor:pointer; text-align:left; font-family:'IBM Plex Sans',sans-serif; transition:background .15s; }
.hgr-v-list-row:last-child{ border-bottom:none; }
.hgr-v-list-row:hover{ background:rgba(111,180,224,.07); }
.hgr-v-list-row-selected{ background:rgba(232,163,61,.09); border-left:2px solid var(--hgr-v-amber); }
@media(max-width:820px){ .hgr-v-list-row{ grid-template-columns:1fr 1fr; row-gap:4px; } }
.hgr-v-list-row-code{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-v-blue-bright); }
.hgr-v-list-row-type{ font-size:13px; color:var(--hgr-v-paper); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hgr-v-list-row-status{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.05em; text-transform:uppercase; color:var(--hgr-v-paper-dim); border:1px solid var(--hgr-v-hairline); padding:3px 8px; border-radius:2px; justify-self:start; white-space:nowrap; }
.hgr-v-list-row-status-spec_ready{ color:var(--hgr-v-blue-bright); border-color:rgba(111,180,224,.4); }
.hgr-v-list-row-status-finalized{ color:var(--hgr-v-amber-bright); border-color:rgba(232,163,61,.4); }
.hgr-v-list-row-status-error{ color:var(--hgr-v-amber); border-color:rgba(232,163,61,.4); }
.hgr-v-list-row-confidence{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-v-paper-dim); }
.hgr-v-list-row-date{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-v-paper-dim); text-align:right; }

/* -- List-fetch error -- */
.hgr-v-list-fetch-error{ display:flex; align-items:center; justify-content:space-between; gap:16px; padding:14px 18px; margin-bottom:20px; border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; }
.hgr-v-list-fetch-error p{ margin:0; color:var(--hgr-v-paper-dim); font-size:13.5px; }

/* -- Process grid + selected-spec / status panel -- */
.hgr-v-process-grid{ display:grid; grid-template-columns:1fr 320px; gap:32px; align-items:start; }
@media(max-width:820px){ .hgr-v-process-grid{ grid-template-columns:1fr; } }
.hgr-v-selected-spec{ max-width:640px; padding:14px 16px; border:1px solid rgba(111,180,224,.3); border-left:3px solid var(--hgr-v-blue-bright); background:rgba(111,180,224,.09); border-radius:2px; margin-bottom:20px; }
.hgr-v-selected-spec-label{ display:block; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-v-blue-bright); margin-bottom:8px; }
.hgr-v-selected-spec p{ margin:0 0 14px; font-size:14px; color:var(--hgr-v-paper); line-height:1.6; }

.hgr-v-status-panel{ border:1px solid var(--hgr-v-hairline); background:var(--hgr-v-navy-panel); border-radius:2px; padding:20px; }
.hgr-v-status-panel-title{ font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-v-paper-dim); margin-bottom:16px; }
.hgr-v-status-idle{ color:var(--hgr-v-paper-dim); font-size:13px; line-height:1.6; margin:0; }
.hgr-v-status-step{ display:flex; align-items:flex-start; gap:10px; padding:9px 0; }
.hgr-v-status-icon{ width:18px; height:18px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
.hgr-v-status-spinner{ width:13px; height:13px; border-radius:50%; border:2px solid var(--hgr-v-hairline); border-top-color:var(--hgr-v-amber); animation:hgr-v-spin 0.8s linear infinite; }
.hgr-v-status-text{ font-size:12.5px; line-height:1.5; color:var(--hgr-v-paper-dim); }
.hgr-v-status-step-active .hgr-v-status-text{ color:var(--hgr-v-paper); }

/* -- Mock source badge (durable, matches every prior bay's convention) -- */
.hgr-v-mock-badge{ display:inline-flex; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.03em; color:var(--hgr-v-amber-bright); border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); padding:4px 9px; border-radius:2px; margin-top:8px; }
.hgr-v-mock-badge-compact{ margin-top:0; font-size:9.5px; padding:2px 7px; justify-self:start; }

/* -- Verdict badge -- */
.hgr-v-verdict-badge{ display:inline-flex; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.06em; text-transform:uppercase; padding:4px 10px; border-radius:2px; margin-left:10px; }
.hgr-v-verdict-badge-pass{ color:var(--hgr-v-green); border:1px solid rgba(95,191,143,.4); background:rgba(95,191,143,.08); }
.hgr-v-verdict-badge-fail{ color:var(--hgr-v-red); border:1px solid rgba(224,113,90,.4); background:rgba(224,113,90,.08); }
.hgr-v-verdict-badge-conditional{ color:var(--hgr-v-amber-bright); border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); }

/* -- Error -- */
@keyframes hgr-v-spin{ to{ transform:rotate(360deg); } }
.hgr-v-error{ border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; padding:20px 22px; max-width:640px; margin-top:20px; }
.hgr-v-error b{ color:var(--hgr-v-amber-bright); display:block; margin-bottom:6px; font-size:14px; }
.hgr-v-error p{ color:var(--hgr-v-paper-dim); font-size:13.5px; margin:0 0 16px; line-height:1.6; }

/* -- Dashboard / result views -- */
.hgr-v-dash{ border:1px solid var(--hgr-v-hairline); background:var(--hgr-v-navy-panel); }
.hgr-v-dash-header{ display:flex; align-items:flex-start; justify-content:space-between; gap:24px; padding:26px 28px; border-bottom:1px solid var(--hgr-v-hairline); flex-wrap:wrap; }
.hgr-v-dash-badge{ display:inline-block; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-v-blue-bright); border:1px solid rgba(111,180,224,.4); padding:4px 10px; border-radius:2px; margin-bottom:10px; }
.hgr-v-dash-header h3{ font-size:20px; margin-bottom:6px; display:inline-block; }
.hgr-v-dash-confidence{ text-align:center; flex-shrink:0; }
.hgr-v-dash-confidence-num{ font-family:'Space Grotesk',sans-serif; font-size:32px; font-weight:700; color:var(--hgr-v-amber-bright); line-height:1; }
.hgr-v-dash-confidence-label{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-v-paper-dim); }
.hgr-v-dash-section{ padding:24px 28px; border-bottom:1px solid var(--hgr-v-hairline); }
.hgr-v-dash-section:last-of-type{ border-bottom:none; }
.hgr-v-dash-section h4{ font-family:'Space Grotesk',sans-serif; font-size:14.5px; font-weight:600; margin-bottom:16px; }
.hgr-v-dash-empty{ color:var(--hgr-v-paper-dim); font-size:13px; margin:0; }
.hgr-v-dash-rationale{ color:var(--hgr-v-paper); font-size:14px; line-height:1.7; margin:0; }
.hgr-v-dash-field-label{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--hgr-v-paper-dim); margin-bottom:6px; }
.hgr-v-dash-field-value{ font-size:14px; }
.hgr-v-dash-actions{ display:flex; gap:12px; flex-wrap:wrap; padding:24px 28px; }

/* -- Compliance matrix -- */
.hgr-v-matrix{ margin:0; padding-left:18px; color:var(--hgr-v-paper); font-size:13px; line-height:1.9; }
.hgr-v-matrix-tag{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.04em; text-transform:uppercase; }
.hgr-v-matrix-tag-pass{ color:var(--hgr-v-green); }
.hgr-v-matrix-tag-fail{ color:var(--hgr-v-red); }
.hgr-v-matrix-tag-not_applicable{ color:var(--hgr-v-paper-dim); }

/* -- Non-conformances -- */
.hgr-v-non-conformances{ margin:0; padding-left:18px; color:var(--hgr-v-paper); font-size:13px; line-height:1.9; }
.hgr-v-severity-tag{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.04em; text-transform:uppercase; }
.hgr-v-severity-tag-low{ color:var(--hgr-v-green); }
.hgr-v-severity-tag-medium{ color:var(--hgr-v-amber-bright); }
.hgr-v-severity-tag-high{ color:var(--hgr-v-amber); }
.hgr-v-severity-tag-critical{ color:var(--hgr-v-red); }

/* -- Risk flags (advisory, non-blocking) -- */
.hgr-v-risk-flags{ border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; padding:14px 16px; }
.hgr-v-risk-flags ul{ margin:0; padding-left:18px; color:var(--hgr-v-amber-bright); font-size:13px; line-height:1.7; }
`;
