import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useHangarSession } from "@/lib/the-hangar/session";
import { supabase } from "@/integrations/supabase/client";
import type { ValidationListEntry } from "@/lib/the-hangar/validationAgentPipeline";
import type {
  CertificationResult,
  CertificationListEntry,
} from "@/lib/the-hangar/certificationAgentPipeline";
import type { ChecklistItem, GapItem } from "@/lib/the-hangar/certificationGeneration";

// -----------------------------------------------------------------------
// The Hangar -- Bay 12 (Certification Agent) detail page, phase 1. New,
// self-contained page (no shared imports with any other bay page, matching
// the welcome page's own "fully isolated" convention).
//
// Single upstream picker: a spec-ready validation result from Bay 09.
// Bay 12 is a SIBLING of Bays 10, 11, 13, not a link in a chain -- all
// four fan in from Bay 09 independently (CertificationAgent.md's own
// header note). Everything else mirrors the-hangar.manufacturing.tsx's
// shape -- deliberately NOT a multi-item gated-stage tracker (this bay has
// exactly one real stage today, folding CertificationAgent.md Sections
// 12.1-12.3 into a single call -- see certificationAgentPipeline.ts's own
// header comment).
//
// source_was_mock is surfaced durably (live result, list row, past-
// certification view) via MockSourceBadge, matching every prior bay's own
// convention.
// -----------------------------------------------------------------------

export const Route = createFileRoute("/the-hangar/certification")({
  component: TheHangarCertification,
});

interface FlowState {
  status: "idle" | "running" | "complete" | "error";
  result: CertificationResult | null;
  errorMessage: string | null;
}

const INITIAL_FLOW_STATE: FlowState = { status: "idle", result: null, errorMessage: null };

const CERTIFICATION_STATUS_LABEL: Record<string, string> = {
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

const READINESS_LABEL: Record<string, string> = {
  READY: "Ready",
  GAPS_OPEN: "Gaps Open",
  BLOCKED: "Blocked",
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

function TheHangarCertification() {
  const ready = useHangarSession();

  const [flow, setFlow] = useState<FlowState>(INITIAL_FLOW_STATE);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  const [validations, setValidations] = useState<ValidationListEntry[] | null>(null);
  const [validationsStatus, setValidationsStatus] = useState<"idle" | "loading" | "error">("idle");
  const [validationsExpanded, setValidationsExpanded] = useState(false);

  const [certificationsList, setCertificationsList] = useState<CertificationListEntry[] | null>(
    null,
  );
  const [certificationsStatus, setCertificationsStatus] = useState<"idle" | "loading" | "error">(
    "idle",
  );
  const [certificationsExpanded, setCertificationsExpanded] = useState(false);

  const [selectedSourceValidation, setSelectedSourceValidation] =
    useState<ValidationListEntry | null>(null);
  const [selectedCertification, setSelectedCertification] =
    useState<CertificationListEntry | null>(null);
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

  async function fetchCertifications() {
    setCertificationsStatus("loading");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setCertificationsStatus("error");
      return;
    }
    try {
      const res = await fetch("/api/hangar/certifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCertificationsList(await res.json());
      setCertificationsStatus("idle");
    } catch {
      setCertificationsStatus("error");
    }
  }

  useEffect(() => {
    if (currentUserEmail) fetchCertifications();
  }, [currentUserEmail, flow.status]);

  function resetFlow() {
    setFlow(INITIAL_FLOW_STATE);
    setSelectedSourceValidation(null);
  }

  function selectSourceValidation(v: ValidationListEntry) {
    setFlow(INITIAL_FLOW_STATE);
    setSelectedCertification(null);
    setSelectedSourceValidation(v);
    setPlanExpanded(true);
  }

  async function generateCertification() {
    if (!selectedSourceValidation) return;
    setFlow({ status: "running", result: null, errorMessage: null });
    const outcome = await callStageApi<CertificationResult>(
      "/api/hangar/process-certification/regulatory-mapping",
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
    <div className="hgr-c">
      <style>{HGR_CERTIFICATION_CSS}</style>

      <nav>
        <div className="hgr-c-wrap">
          <div className="hgr-c-crumbs">
            <Link to="/">TorqWings</Link>
            <span className="hgr-c-sep">/</span>
            <Link to="/the-hangar">The Hangar</Link>
            <span className="hgr-c-sep">/</span>
            <span className="hgr-c-cur">Bay 12 -- Certification Agent</span>
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
              <span className="hgr-c-badge hgr-c-badge-bay">BAY 12 OF 15</span>
            </div>
            <div className="hgr-c-hero-row">
              <h1>Certification Agent</h1>
              <p className="hgr-c-lead">
                Takes a <b>spec-ready validation result</b> from Bay 09 and builds a formal
                certification checklist and gap-closure plan -- one level up from Bay 09's own
                compliance pass, not a real regulatory audit.
              </p>
            </div>
          </div>
        </div>

        <section id="run-certification">
          <div className="hgr-c-wrap">
            <div className="hgr-c-kicker">Run a certification review</div>
            <h2 className="hgr-c-sec-title">
              Build a certification checklist for a validated design.
            </h2>
            <p className="hgr-c-sec-sub">
              Runs one real Claude Sonnet 5 call to reason about certification readiness, then a
              deterministic confidence pass. There's no live regulatory clause database or
              certification-body integration yet -- so this is Claude reasoning qualitatively
              about certification for the one design you give it, not a claim of a formal
              regulatory audit.
            </p>

            {validationsStatus === "error" && <ListFetchError onRetry={fetchValidations} />}

            {validationsStatus !== "error" &&
              validations &&
              validations.length > 0 &&
              !selectedCertification && (
                <ListPanel
                  title={`Your spec-ready validations (${validations.length})`}
                  expanded={validationsExpanded}
                  onToggleExpanded={() => setValidationsExpanded((v) => !v)}
                >
                  {validations.map((v) => (
                    <button
                      key={v.validationId}
                      type="button"
                      className={`hgr-c-list-row${selectedSourceValidation?.validationId === v.validationId ? " hgr-c-list-row-selected" : ""}`}
                      onClick={() => selectSourceValidation(v)}
                    >
                      <span className="hgr-c-list-row-code">{v.validationCode}</span>
                      <span className="hgr-c-list-row-type">
                        {v.verdict !== null ? VERDICT_LABEL[v.verdict] ?? v.verdict : "—"}
                      </span>
                      <MockSourceBadge show={v.sourceWasMock === true} compact />
                      <span className="hgr-c-list-row-confidence">
                        {v.confidenceScore !== null
                          ? `${Math.round(v.confidenceScore * 100)}%`
                          : "—"}
                      </span>
                      <span className="hgr-c-list-row-date">
                        {new Date(v.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </ListPanel>
              )}

            {validationsStatus !== "error" && validations && validations.length === 0 && (
              <p className="hgr-c-empty-hint">
                No spec-ready validations yet -- generate one in{" "}
                <Link to="/the-hangar/validation">Validation Agent</Link> first, then come back
                here.
              </p>
            )}

            {certificationsStatus === "error" && <ListFetchError onRetry={fetchCertifications} />}

            {certificationsStatus !== "error" &&
              certificationsList &&
              certificationsList.length > 0 &&
              !selectedCertification && (
                <ListPanel
                  title={`Your certifications (${certificationsList.length})`}
                  expanded={certificationsExpanded}
                  onToggleExpanded={() => setCertificationsExpanded((v) => !v)}
                >
                  {certificationsList.map((c) => (
                    <button
                      key={c.certificationId}
                      type="button"
                      className="hgr-c-list-row"
                      onClick={() => setSelectedCertification(c)}
                    >
                      <span className="hgr-c-list-row-code">{c.certificationCode}</span>
                      <span className="hgr-c-list-row-type">
                        {c.certificationReadiness !== null
                          ? READINESS_LABEL[c.certificationReadiness] ?? c.certificationReadiness
                          : "—"}
                      </span>
                      <span className={`hgr-c-list-row-status hgr-c-list-row-status-${c.status}`}>
                        {CERTIFICATION_STATUS_LABEL[c.status] ?? c.status}
                      </span>
                      <MockSourceBadge show={c.sourceWasMock === true} compact />
                      <span className="hgr-c-list-row-confidence">
                        {c.confidenceScore !== null
                          ? `${Math.round(c.confidenceScore * 100)}%`
                          : "—"}
                      </span>
                      <span className="hgr-c-list-row-date">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </ListPanel>
              )}

            {selectedCertification ? (
              <PastCertificationDetail
                certification={selectedCertification}
                onBack={() => setSelectedCertification(null)}
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
                    <span>Run a certification review</span>
                    <span className={`hgr-c-arrow${planExpanded ? " hgr-c-arrow-open" : ""}`}>
                      ▸
                    </span>
                  </button>
                )}
                {(!isIdle || planExpanded) && (
                  <div className={isIdle ? "hgr-c-collapsible-body" : undefined}>
                    {flow.status !== "complete" && (
                      <div className="hgr-c-process-grid">
                        <div>
                          {selectedSourceValidation ? (
                            <div className="hgr-c-selected-spec">
                              <span className="hgr-c-selected-spec-label">Certifying</span>
                              <p>
                                <b>{selectedSourceValidation.validationCode}</b> (Validation)
                              </p>
                              {flow.status !== "running" && (
                                <button
                                  type="button"
                                  className="hgr-c-btn hgr-c-btn-amber"
                                  onClick={generateCertification}
                                >
                                  Run Certification Review →
                                </button>
                              )}
                            </div>
                          ) : (
                            <p className="hgr-c-status-idle">
                              Select one spec-ready validation result above to begin.
                            </p>
                          )}
                          {flow.status === "error" && (
                            <StageErrorCard
                              title="Couldn't complete Certification Review."
                              message={flow.errorMessage}
                              onRetry={generateCertification}
                            />
                          )}
                        </div>

                        <div className="hgr-c-status-panel">
                          <div className="hgr-c-status-panel-title">Certification Review</div>
                          {flow.status === "running" ? (
                            <div className="hgr-c-status-step hgr-c-status-step-active">
                              <span className="hgr-c-status-icon">
                                <span className="hgr-c-status-spinner" />
                              </span>
                              <span className="hgr-c-status-text">Processing…</span>
                            </div>
                          ) : flow.status === "error" ? (
                            <p className="hgr-c-status-idle">
                              Stopped -- see the error below, then retry.
                            </p>
                          ) : (
                            <p className="hgr-c-status-idle">
                              Select a validation result, then run to begin.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {flow.status === "complete" && flow.result && (
                      <CertificationResultView result={flow.result} onStartNew={resetFlow} />
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

function ListFetchError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="hgr-c-list-fetch-error">
      <p>Couldn't load this list -- check your connection and try again.</p>
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

function MockSourceBadge({ show, compact }: { show: boolean; compact?: boolean }) {
  if (!show) return null;
  return (
    <span className={`hgr-c-mock-badge${compact ? " hgr-c-mock-badge-compact" : ""}`}>
      ⚠ Touched by mock/fallback data upstream
    </span>
  );
}

function ReadinessBadge({ readiness }: { readiness: "READY" | "GAPS_OPEN" | "BLOCKED" }) {
  return (
    <span className={`hgr-c-readiness-badge hgr-c-readiness-badge-${readiness.toLowerCase()}`}>
      {READINESS_LABEL[readiness] ?? readiness}
    </span>
  );
}

function ChecklistView({ checklist }: { checklist: ChecklistItem[] }) {
  if (checklist.length === 0) {
    return <p className="hgr-c-dash-empty">No checklist items were generated.</p>;
  }
  return (
    <ul className="hgr-c-checklist">
      {checklist.map((c, i) => (
        <li key={i}>
          <span className={`hgr-c-checklist-tag hgr-c-checklist-tag-${c.status}`}>{c.status}</span>{" "}
          <b>{c.item}</b> -- {c.description}
        </li>
      ))}
    </ul>
  );
}

function GapReportList({ gaps }: { gaps: GapItem[] }) {
  if (gaps.length === 0) {
    return <p className="hgr-c-dash-empty">No gaps found.</p>;
  }
  return (
    <ul className="hgr-c-gaps">
      {gaps.map((g, i) => (
        <li key={i}>
          <b>{g.issue}</b>: {g.remediation} ({g.estimatedEffort})
        </li>
      ))}
    </ul>
  );
}

function CertificationResultView({
  result,
  onStartNew,
}: {
  result: CertificationResult;
  onStartNew: () => void;
}) {
  return (
    <div className="hgr-c-dash">
      <div className="hgr-c-dash-header">
        <div>
          <div className="hgr-c-dash-badge">Spec Ready</div>
          <h3>{result.certificationCode}</h3>
          <ReadinessBadge readiness={result.certificationReadiness} />
          <MockSourceBadge show={result.sourceWasMock} />
        </div>
        <div className="hgr-c-dash-confidence">
          <div className="hgr-c-dash-confidence-num">
            {Math.round(result.confidenceScore * 100)}%
          </div>
          <div className="hgr-c-dash-confidence-label">Confidence</div>
          <Link
            to="/the-hangar/bernoulli"
            search={{ source: "certification", missionId: "", sourceId: result.certificationId }}
            className="hgr-c-dash-bernoulli-link"
            title="Sanity-check this result's origin mission spec against conservation laws and aerospace empiricals."
          >
            Ask Bernoulli →
          </Link>
        </div>
      </div>

      <div className="hgr-c-dash-section">
        <h4>Certification Checklist ({result.checklist.length})</h4>
        <ChecklistView checklist={result.checklist} />
      </div>

      <div className="hgr-c-dash-section">
        <h4>Gap Report ({result.gapReport.length})</h4>
        <GapReportList gaps={result.gapReport} />
      </div>

      <div className="hgr-c-dash-section">
        <h4>Reasoning Summary</h4>
        <p className="hgr-c-dash-rationale">{result.reasoningSummary}</p>
      </div>

      <div className="hgr-c-dash-actions">
        <button type="button" className="hgr-c-btn hgr-c-btn-amber" onClick={onStartNew}>
          Start a new certification review
        </button>
      </div>
    </div>
  );
}

function PastCertificationDetail({
  certification,
  onBack,
}: {
  certification: CertificationListEntry;
  onBack: () => void;
}) {
  const hasSpec = certification.checklist !== null;
  return (
    <div className="hgr-c-dash">
      <div className="hgr-c-dash-header">
        <div>
          <div className="hgr-c-dash-badge">
            {CERTIFICATION_STATUS_LABEL[certification.status] ?? certification.status}
          </div>
          <h3>{certification.certificationCode}</h3>
          {certification.certificationReadiness !== null && (
            <ReadinessBadge readiness={certification.certificationReadiness} />
          )}
          <MockSourceBadge show={certification.sourceWasMock === true} />
        </div>
        {certification.confidenceScore !== null && (
          <div className="hgr-c-dash-confidence">
            <div className="hgr-c-dash-confidence-num">
              {Math.round(certification.confidenceScore * 100)}%
            </div>
            <div className="hgr-c-dash-confidence-label">Confidence</div>
            {hasSpec && (
              <Link
                to="/the-hangar/bernoulli"
                search={{ source: "certification", missionId: "", sourceId: certification.certificationId }}
                className="hgr-c-dash-bernoulli-link"
                title="Sanity-check this result's origin mission spec against conservation laws and aerospace empiricals."
              >
                Ask Bernoulli →
              </Link>
            )}
          </div>
        )}
      </div>
      {hasSpec ? (
        <>
          <div className="hgr-c-dash-section">
            <h4>Certification Checklist ({certification.checklist?.length ?? 0})</h4>
            <ChecklistView checklist={certification.checklist ?? []} />
          </div>
          <div className="hgr-c-dash-section">
            <h4>Gap Report ({certification.gapReport?.length ?? 0})</h4>
            <GapReportList gaps={certification.gapReport ?? []} />
          </div>
          <div className="hgr-c-dash-section">
            <h4>Reasoning Summary</h4>
            <p className="hgr-c-dash-rationale">{certification.reasoningSummary}</p>
          </div>
        </>
      ) : (
        <div className="hgr-c-dash-section">
          <p className="hgr-c-dash-empty">
            No spec was generated for this certification review -- its status is "
            {CERTIFICATION_STATUS_LABEL[certification.status] ?? certification.status}".
          </p>
        </div>
      )}
      <div className="hgr-c-dash-actions">
        <button type="button" className="hgr-c-btn hgr-c-btn-ghost" onClick={onBack}>
          ← Back to Your certifications
        </button>
      </div>
    </div>
  );
}

const HGR_CERTIFICATION_CSS = `
.hgr-c{
  --hgr-c-navy-deep:#08131F; --hgr-c-navy-panel:#0F2136;
  --hgr-c-blue-line:#3E7CA6; --hgr-c-blue-bright:#6FB4E0;
  --hgr-c-amber:#E8A33D; --hgr-c-amber-bright:#F6C374;
  --hgr-c-paper:#ECEFF3; --hgr-c-paper-dim:#8FA5BB;
  --hgr-c-green:#5FBF8F; --hgr-c-red:#E0715A;
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
.hgr-c-hero-row{ display:flex; align-items:center; gap:48px; flex-wrap:wrap; }
@media(max-width:760px){ .hgr-c-hero-row{ flex-direction:column; align-items:flex-start; gap:16px; } }
.hgr-c-hero h1{ font-size:clamp(34px,5vw,58px); margin:0; flex-shrink:0; }
.hgr-c-hero .hgr-c-lead{ color:var(--hgr-c-paper-dim); font-size:15.5px; max-width:520px; line-height:1.6; margin:0; flex:1; min-width:280px; }
.hgr-c-hero .hgr-c-lead b{ color:var(--hgr-c-paper); font-weight:600; }

.hgr-c section{ padding:60px 0; }
#run-certification{ padding-top:32px; }
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

/* -- Collapsible panels -- */
.hgr-c-collapsible{ border:1px solid var(--hgr-c-hairline); background:var(--hgr-c-navy-panel); border-radius:2px; margin-bottom:32px; }
.hgr-c-collapsible-title{ display:flex; align-items:center; justify-content:space-between; width:100%; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-c-paper-dim); padding:14px 18px; border:none; background:none; cursor:pointer; }
.hgr-c-collapsible-title:hover{ color:var(--hgr-c-paper); }
.hgr-c-arrow{ display:inline-block; font-size:11px; transition:transform .15s; }
.hgr-c-arrow-open{ transform:rotate(90deg); }
.hgr-c-list{ max-height:260px; overflow-y:auto; border-top:1px solid var(--hgr-c-hairline); }
.hgr-c-list-row{ display:grid; grid-template-columns:1.2fr 1.6fr auto 0.7fr 1fr; align-items:center; gap:10px; width:100%; padding:12px 18px; border:none; border-bottom:1px dashed var(--hgr-c-hairline); background:none; cursor:pointer; text-align:left; font-family:'IBM Plex Sans',sans-serif; transition:background .15s; }
.hgr-c-list-row:last-child{ border-bottom:none; }
.hgr-c-list-row:hover{ background:rgba(111,180,224,.07); }
.hgr-c-list-row-selected{ background:rgba(232,163,61,.09); border-left:2px solid var(--hgr-c-amber); }
@media(max-width:820px){ .hgr-c-list-row{ grid-template-columns:1fr 1fr; row-gap:4px; } }
.hgr-c-list-row-code{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-c-blue-bright); }
.hgr-c-list-row-type{ font-size:13px; color:var(--hgr-c-paper); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hgr-c-list-row-status{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.05em; text-transform:uppercase; color:var(--hgr-c-paper-dim); border:1px solid var(--hgr-c-hairline); padding:3px 8px; border-radius:2px; justify-self:start; white-space:nowrap; }
.hgr-c-list-row-status-spec_ready{ color:var(--hgr-c-blue-bright); border-color:rgba(111,180,224,.4); }
.hgr-c-list-row-status-finalized{ color:var(--hgr-c-amber-bright); border-color:rgba(232,163,61,.4); }
.hgr-c-list-row-status-error{ color:var(--hgr-c-amber); border-color:rgba(232,163,61,.4); }
.hgr-c-list-row-confidence{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-c-paper-dim); }
.hgr-c-list-row-date{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-c-paper-dim); text-align:right; }

/* -- List-fetch error -- */
.hgr-c-list-fetch-error{ display:flex; align-items:center; justify-content:space-between; gap:16px; padding:14px 18px; margin-bottom:20px; border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; }
.hgr-c-list-fetch-error p{ margin:0; color:var(--hgr-c-paper-dim); font-size:13.5px; }

/* -- Process grid + selected-spec / status panel -- */
.hgr-c-process-grid{ display:grid; grid-template-columns:1fr 320px; gap:32px; align-items:start; }
@media(max-width:820px){ .hgr-c-process-grid{ grid-template-columns:1fr; } }
.hgr-c-selected-spec{ max-width:640px; padding:14px 16px; border:1px solid rgba(111,180,224,.3); border-left:3px solid var(--hgr-c-blue-bright); background:rgba(111,180,224,.09); border-radius:2px; margin-bottom:20px; }
.hgr-c-selected-spec-label{ display:block; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-c-blue-bright); margin-bottom:8px; }
.hgr-c-selected-spec p{ margin:0 0 14px; font-size:14px; color:var(--hgr-c-paper); line-height:1.6; }

.hgr-c-status-panel{ border:1px solid var(--hgr-c-hairline); background:var(--hgr-c-navy-panel); border-radius:2px; padding:20px; }
.hgr-c-status-panel-title{ font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-c-paper-dim); margin-bottom:16px; }
.hgr-c-status-idle{ color:var(--hgr-c-paper-dim); font-size:13px; line-height:1.6; margin:0; }
.hgr-c-status-step{ display:flex; align-items:flex-start; gap:10px; padding:9px 0; }
.hgr-c-status-icon{ width:18px; height:18px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
.hgr-c-status-spinner{ width:13px; height:13px; border-radius:50%; border:2px solid var(--hgr-c-hairline); border-top-color:var(--hgr-c-amber); animation:hgr-c-spin 0.8s linear infinite; }
.hgr-c-status-text{ font-size:12.5px; line-height:1.5; color:var(--hgr-c-paper-dim); }
.hgr-c-status-step-active .hgr-c-status-text{ color:var(--hgr-c-paper); }

/* -- Mock source badge -- */
.hgr-c-mock-badge{ display:inline-flex; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.03em; color:var(--hgr-c-amber-bright); border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); padding:4px 9px; border-radius:2px; margin-top:8px; }
.hgr-c-mock-badge-compact{ margin-top:0; font-size:9.5px; padding:2px 7px; justify-self:start; }

/* -- Readiness badge -- */
.hgr-c-readiness-badge{ display:inline-flex; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.06em; text-transform:uppercase; padding:4px 10px; border-radius:2px; margin-left:10px; }
.hgr-c-readiness-badge-ready{ color:var(--hgr-c-green); border:1px solid rgba(95,191,143,.4); background:rgba(95,191,143,.08); }
.hgr-c-readiness-badge-gaps_open{ color:var(--hgr-c-amber-bright); border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); }
.hgr-c-readiness-badge-blocked{ color:var(--hgr-c-red); border:1px solid rgba(224,113,90,.4); background:rgba(224,113,90,.08); }

/* -- Error -- */
@keyframes hgr-c-spin{ to{ transform:rotate(360deg); } }
.hgr-c-error{ border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; padding:20px 22px; max-width:640px; margin-top:20px; }
.hgr-c-error b{ color:var(--hgr-c-amber-bright); display:block; margin-bottom:6px; font-size:14px; }
.hgr-c-error p{ color:var(--hgr-c-paper-dim); font-size:13.5px; margin:0 0 16px; line-height:1.6; }

/* -- Dashboard / result views -- */
.hgr-c-dash{ border:1px solid var(--hgr-c-hairline); background:var(--hgr-c-navy-panel); }
.hgr-c-dash-header{ display:flex; align-items:flex-start; justify-content:space-between; gap:24px; padding:26px 28px; border-bottom:1px solid var(--hgr-c-hairline); flex-wrap:wrap; }
.hgr-c-dash-badge{ display:inline-block; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-c-blue-bright); border:1px solid rgba(111,180,224,.4); padding:4px 10px; border-radius:2px; margin-bottom:10px; }
.hgr-c-dash-header h3{ font-size:20px; margin-bottom:6px; display:inline-block; }
.hgr-c-dash-confidence{ text-align:center; flex-shrink:0; }
.hgr-c-dash-confidence-num{ font-family:'Space Grotesk',sans-serif; font-size:32px; font-weight:700; color:var(--hgr-c-amber-bright); line-height:1; }
.hgr-c-dash-confidence-label{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-c-paper-dim); }
.hgr-c-dash-bernoulli-link{
  display:inline-block; margin-top:10px; font-family:'IBM Plex Mono',monospace; font-size:11px;
  color:var(--hgr-c-blue-bright); text-decoration:none; border:1px solid var(--hgr-c-hairline);
  border-radius:2px; padding:5px 10px; white-space:nowrap;
}
.hgr-c-dash-bernoulli-link:hover{ border-color:var(--hgr-c-blue-bright); color:var(--hgr-c-paper); }
.hgr-c-dash-section{ padding:24px 28px; border-bottom:1px solid var(--hgr-c-hairline); }
.hgr-c-dash-section:last-of-type{ border-bottom:none; }
.hgr-c-dash-section h4{ font-family:'Space Grotesk',sans-serif; font-size:14.5px; font-weight:600; margin-bottom:16px; }
.hgr-c-dash-empty{ color:var(--hgr-c-paper-dim); font-size:13px; margin:0; }
.hgr-c-dash-rationale{ color:var(--hgr-c-paper); font-size:14px; line-height:1.7; margin:0; }
.hgr-c-dash-actions{ display:flex; gap:12px; flex-wrap:wrap; padding:24px 28px; }

/* -- Checklist / gap report -- */
.hgr-c-checklist{ margin:0; padding-left:18px; color:var(--hgr-c-paper); font-size:13px; line-height:1.9; }
.hgr-c-checklist-tag{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.04em; text-transform:uppercase; }
.hgr-c-checklist-tag-complete{ color:var(--hgr-c-green); }
.hgr-c-checklist-tag-open{ color:var(--hgr-c-amber-bright); }
.hgr-c-checklist-tag-not_applicable{ color:var(--hgr-c-paper-dim); }
.hgr-c-gaps{ margin:0; padding-left:18px; color:var(--hgr-c-paper); font-size:13px; line-height:1.9; }
`;
