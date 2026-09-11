import { useEffect, useState } from "react";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useHangarSession } from "@/lib/the-hangar/session";
import { supabase } from "@/integrations/supabase/client";
import type { MissionListEntry } from "@/lib/the-hangar/missionAgentPipeline";

// Local view types mirroring the /api/hangar/process-bernoulli/review
// response shape (bernoulliAgentPipeline.ts's BernoulliReviewResponse) --
// duplicated rather than imported, same client/server type-duplication
// convention every other bay page already follows.
interface BernoulliCheckView {
  ruleId: string;
  status: "PASS" | "WARN" | "FAIL" | "INFO";
  message: string;
  sourceWasMock: boolean;
}

interface BernoulliReviewView {
  reviewId: string;
  reviewCode: string;
  missionId: string;
  verdict: "PASS" | "WARN" | "FAIL";
  checks: BernoulliCheckView[];
  confidenceScore: number;
  specVersion: number;
  createdAt: string;
}

// -----------------------------------------------------------------------
// The Hangar -- Bay 14 (Bernoulli Agent) page, phase 1 (visual shell only).
// Same isolated-page convention as every other bay page (no shared imports
// with the-hangar.documentation.tsx etc.) and the same CSS design system
// (hgr-ber-* mirrors hgr-d-*'s tokens/classes 1:1), so it reads as one
// family of pages -- but the CONTENT differs on purpose.
//
// Bernoulli Agent is cross-cutting, not a link in the sequential B01-B13
// chain: it has no single upstream owner, so there's no "pick a spec-ready
// result, then run a stage" flow like every other bay page. Once the
// backend (physicsAgentPipeline.ts and the 10 caller-bay call sites) is
// built, this page becomes a log of physics checks across all 10 calling
// bays. Today it's an honest, disclosed placeholder -- same "no real X
// yet" candor every other Phase 1 bay spec already uses -- reachable by
// clicking Bay 14 on the welcome page's circuit diagram, matching every
// other bay's own click-through pattern.
// -----------------------------------------------------------------------

// `source` identifies which bay the visitor arrived from -- set by that
// bay's own "Ask Bernoulli" link -- and drives both the highlighted caller
// box below (the click-back affordance itself -- there's no separate
// "Back to X" nav link) and the default-selected mission in the picker.
// Two ways a caller bay can identify which mission it means:
//   - `missionId` directly -- Mission/Concept/Aircraft Design pass this,
//     since they already have it in scope client-side with no extra hop.
//   - `sourceId` -- every bay from CAD onward passes its OWN entity id
//     instead (its chain back to a mission is too many hops to resolve
//     client-side); this page resolves it server-side via
//     /api/hangar/resolve-mission (bernoulliSourceResolver.ts) on landing.
export const Route = createFileRoute("/the-hangar/bernoulli")({
  validateSearch: (s: Record<string, unknown>) => ({
    source: (s.source as string) || "",
    missionId: (s.missionId as string) || "",
    sourceId: (s.sourceId as string) || "",
  }),
  component: TheHangarBernoulli,
});

// Split into two 5-bay columns for the hub-and-spoke layout: left is the
// primary sequential chain (01-05), right is the parallel physics +
// downstream-gate stages (06-09, 12) -- same grouping the welcome page's
// own diagram already uses. `key` is what `source` matches against to
// highlight a box; `to` is that bay's own real page (every one of the 10
// already has one), used only for the highlighted box's click-back link.
const LEFT_CALLERS = [
  { bay: "01", key: "mission", name: "Mission Agent", to: "/the-hangar/mission" },
  { bay: "02", key: "concept", name: "Concept Agent", to: "/the-hangar/concept" },
  {
    bay: "03",
    key: "aircraft-design",
    name: "Aircraft Design Agent",
    to: "/the-hangar/aircraft-design",
  },
  { bay: "04", key: "cad", name: "CAD Agent", to: "/the-hangar/cad-design" },
  {
    bay: "05",
    key: "simulation",
    name: "Simulation Orchestrator",
    to: "/the-hangar/simulation",
  },
] as const;

const RIGHT_CALLERS = [
  { bay: "06", key: "cfd", name: "CFD Agent", to: "/the-hangar/cfd-analysis" },
  { bay: "07", key: "structural", name: "Structural Agent", to: "/the-hangar/structural" },
  { bay: "08", key: "optimization", name: "Optimization Agent", to: "/the-hangar/optimization" },
  { bay: "09", key: "validation", name: "Validation Agent", to: "/the-hangar/validation" },
  { bay: "12", key: "certification", name: "Certification Agent", to: "/the-hangar/certification" },
] as const;

// The 5 checks bernoulliChecks.ts actually runs (BERN-M01–M05), with a
// human-readable name and one-line description for each -- shown as a
// legend before a check runs, and to label each row of the report after.
// M01/M05 are the two hard gates (a FAIL on either fails the whole
// review); M02-M04 can only WARN.
const BERN_RULES: { id: string; name: string; description: string; hardGate: boolean }[] = [
  {
    id: "BERN-M01",
    name: "Speed Consistency",
    description: "Range ÷ Endurance implies an average speed -- flagged if implausible for the vehicle class.",
    hardGate: true,
  },
  {
    id: "BERN-M02",
    name: "Coverage Math",
    description: "For multi-unit/swarm specs: units × per-unit coverage angle should reach 360°.",
    hardGate: false,
  },
  {
    id: "BERN-M03",
    name: "Payload/Endurance Plausibility",
    description: "Claude-judged: is this payload/endurance combination realistic for this vehicle class?",
    hardGate: false,
  },
  {
    id: "BERN-M04",
    name: "KPI/Constraint Provenance",
    description: "Does every constraint cite a source, or are some untagged?",
    hardGate: false,
  },
  {
    id: "BERN-M05",
    name: "Dimensional Consistency",
    description: 'Do KPI units actually match what their names imply (e.g. "Range" isn\'t given in kg)?',
    hardGate: true,
  },
];

const BERN_RULE_NAMES: Record<string, string> = Object.fromEntries(
  BERN_RULES.map((r) => [r.id, r.name]),
);

function TheHangarBernoulli() {
  const ready = useHangarSession();
  const search = useSearch({ from: "/the-hangar/bernoulli" });
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  const [missions, setMissions] = useState<MissionListEntry[] | null>(null);
  const [missionsStatus, setMissionsStatus] = useState<"idle" | "loading" | "error">("idle");
  // Seeded from ?missionId= (the mission the caller bay linked here with) --
  // the whole point of carrying it is to land with that mission already
  // selected, not just present in the list.
  const [selectedMissionId, setSelectedMissionId] = useState<string>(search.missionId);
  // Full spec shows by default whenever a mission is selected (picked from
  // the dropdown, or landed on already-selected via ?missionId=). Ask
  // Bernoulli collapses it down to just the id/score header and opens the
  // report below; clicking that header again re-expands it independently
  // of whether a report is showing.
  const [specExpanded, setSpecExpanded] = useState(true);
  const [checkTriggered, setCheckTriggered] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<"idle" | "loading" | "error">("idle");
  const [reviewResult, setReviewResult] = useState<BernoulliReviewView | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const selectedMission = missions?.find((m) => m.missionId === selectedMissionId) ?? null;

  async function requestCheck() {
    if (!selectedMissionId) return;
    setCheckTriggered(true);
    setSpecExpanded(false);
    setReviewStatus("loading");
    setReviewError(null);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setReviewStatus("error");
      setReviewError("No signed-in TorqWings session found. Sign in with a real TorqWings account first, then retry.");
      return;
    }
    try {
      const res = await fetch("/api/hangar/process-bernoulli/review", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ missionId: selectedMissionId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Request failed (HTTP ${res.status}).`);
      setReviewResult(json as BernoulliReviewView);
      setReviewStatus("idle");
    } catch (err) {
      setReviewStatus("error");
      setReviewError(
        err instanceof Error ? err.message : "Unexpected error -- check your connection and try again.",
      );
    }
  }

  // Loads the most recently saved review for a mission, if one exists --
  // called on selection (and once on initial landing, if ?missionId= was
  // already set) so a past report shows without needing another Ask
  // Bernoulli click. Silently no-ops if there's nothing saved yet (a
  // normal state, not an error) or if the fetch itself fails -- this is
  // a convenience pre-load, not something worth surfacing an error banner
  // for.
  async function fetchSavedReview(missionId: string) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    try {
      const res = await fetch(`/api/hangar/bernoulli-review?missionId=${missionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      if (!json) return; // nothing saved for this mission yet
      setReviewResult(json as BernoulliReviewView);
      setCheckTriggered(true);
      setSpecExpanded(false);
    } catch {
      // best-effort pre-load only
    }
  }

  function selectMission(id: string) {
    setSelectedMissionId(id);
    setSpecExpanded(true);
    setCheckTriggered(false);
    setReviewResult(null);
    setReviewStatus("idle");
    setReviewError(null);
    fetchSavedReview(id);
  }

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

  // Landed here with ?missionId= already set (e.g. from Mission Agent's
  // own "Ask Bernoulli" link) -- try loading a saved report for it once
  // auth is ready, same as picking it from the dropdown would.
  useEffect(() => {
    if (currentUserEmail && search.missionId) fetchSavedReview(search.missionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserEmail]);

  // Landed here with ?sourceId= instead (every caller bay from CAD
  // onward -- see the Route header comment) -- resolve it to a missionId
  // server-side, then proceed exactly as the ?missionId= case above would.
  useEffect(() => {
    if (!currentUserEmail || !search.sourceId || search.missionId) return;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      try {
        const res = await fetch(
          `/api/hangar/resolve-mission?source=${encodeURIComponent(search.source)}&sourceId=${encodeURIComponent(search.sourceId)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) return;
        const json = await res.json();
        if (json.missionId) {
          setSelectedMissionId(json.missionId);
          fetchSavedReview(json.missionId);
        }
      } catch {
        // best-effort resolution only
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserEmail]);

  // "Your missions" -- spec_ready AND finalized, filtered client-side to
  // "has a real persisted spec" (missionSpecs !== null) rather than a
  // fixed status list. Originally spec_ready-only, but Concept Agent (and
  // every bay downstream of it) only ever builds from a FINALIZED mission
  // -- excluding finalized here would mean the missionId a Concept-sourced
  // "Ask Bernoulli" link carries could never actually resolve to anything
  // on this page. draft/processing/error missions never have a spec, so
  // they're naturally excluded by the missionSpecs check without needing
  // their own status branch.
  async function fetchMissions() {
    setMissionsStatus("loading");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setMissionsStatus("error");
      return;
    }
    try {
      const res = await fetch("/api/hangar/missions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const all: MissionListEntry[] = await res.json();
      setMissions(all.filter((m) => m.missionSpecs !== null));
      setMissionsStatus("idle");
    } catch {
      setMissionsStatus("error");
    }
  }

  useEffect(() => {
    if (currentUserEmail) fetchMissions();
  }, [currentUserEmail]);

  if (!ready) return null;

  return (
    <div className="hgr-ber">
      <style>{HGR_BERNOULLI_CSS}</style>

      <nav>
        <div className="hgr-ber-wrap">
          <div className="hgr-ber-crumbs">
            <Link to="/">TorqWings</Link>
            <span className="hgr-ber-sep">/</span>
            <Link to="/the-hangar">The Hangar</Link>
            <span className="hgr-ber-sep">/</span>
            <span className="hgr-ber-cur">Bay 14 -- Bernoulli Agent</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {currentUserEmail && (
              <span
                className="hgr-ber-mono"
                style={{ fontSize: 12.5, color: "var(--hgr-ber-paper-dim)" }}
              >
                Welcome, {currentUserEmail}
              </span>
            )}
            <Link to="/the-hangar/welcome" className="hgr-ber-exit">
              ← Back to Hangar
            </Link>
            <Link to="/the-hangar" className="hgr-ber-exit">
              Exit site
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <div className="hgr-ber-hero">
          <div className="hgr-ber-doors">
            <div className="hgr-ber-door hgr-ber-door-left" />
            <div className="hgr-ber-door hgr-ber-door-right" />
          </div>
          <div className="hgr-ber-wrap">
            <div className="hgr-ber-status-row">
              <span className="hgr-ber-badge hgr-ber-badge-bay">BAY 14 -- CROSS-CUTTING</span>
              <span className="hgr-ber-badge hgr-ber-badge-design">IN DESIGN</span>
            </div>
            <div className="hgr-ber-hero-row">
              <h1>Bernoulli Agent</h1>
              <p className="hgr-ber-lead">
                Not a link in the sequential chain -- a <b>cross-cutting validation service</b>{" "}
                called by every design and analysis bay to sanity-check its output against
                conservation laws, dimensional consistency, and aerospace empiricals before it
                moves downstream.
              </p>
            </div>
          </div>
        </div>

        <section id="bernoulli-hub">
          <div className="hgr-ber-hub-wrap">
            <div className="hgr-ber-hub-row">
              <div className="hgr-ber-hub-col">
                {LEFT_CALLERS.map((b) =>
                  search.source === b.key ? (
                    // The highlighted box IS the way back -- no separate
                    // "Back to X" nav link anymore.
                    <Link
                      key={b.bay}
                      to={b.to}
                      className="hgr-ber-caller-chip hgr-ber-caller-highlighted"
                      style={{ textDecoration: "none" }}
                      title={`Back to ${b.name}`}
                    >
                      <span className="hgr-ber-caller-bay">BAY {b.bay}</span>
                      <span className="hgr-ber-caller-name">{b.name}</span>
                    </Link>
                  ) : (
                    <div key={b.bay} className="hgr-ber-caller-chip">
                      <span className="hgr-ber-caller-bay">BAY {b.bay}</span>
                      <span className="hgr-ber-caller-name">{b.name}</span>
                    </div>
                  ),
                )}
              </div>

              <div className="hgr-ber-hub-center">
                <label className="hgr-ber-hub-select-label" htmlFor="bernoulli-mission-select">
                  Your missions -- spec ready or finalized
                </label>
                <div className="hgr-ber-hub-select-row">
                  {missionsStatus === "error" ? (
                    <div className="hgr-ber-hub-select-error">
                      Couldn't load your missions.{" "}
                      <button type="button" onClick={fetchMissions}>
                        Retry
                      </button>
                    </div>
                  ) : (
                    <select
                      id="bernoulli-mission-select"
                      className="hgr-ber-hub-select"
                      value={selectedMissionId}
                      disabled={missionsStatus === "loading" || (missions?.length ?? 0) === 0}
                      onChange={(e) => selectMission(e.target.value)}
                    >
                      <option value="">
                        {missionsStatus === "loading"
                          ? "Loading missions…"
                          : (missions?.length ?? 0) === 0
                            ? "No missions with a spec yet"
                            : `Select a mission (${missions?.length})`}
                      </option>
                      {missions?.map((m) => (
                        <option key={m.missionId} value={m.missionId}>
                          {m.missionCode}
                          {m.summary ? ` -- ${m.summary.slice(0, 40)}` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    className="hgr-ber-btn hgr-ber-btn-amber"
                    disabled={!selectedMissionId || reviewStatus === "loading"}
                    onClick={requestCheck}
                  >
                    {reviewStatus === "loading" ? "Checking…" : "Ask Bernoulli"}
                  </button>
                </div>
                <p className="hgr-ber-hub-select-hint">
                  {checkTriggered
                    ? "Runs BERN-M01–M05 against the selected spec -- deterministic checks plus one Claude Sonnet 5 call."
                    : "Picking a mission doesn't run a check yet -- Ask Bernoulli opens the report below."}
                </p>

                <ul className="hgr-ber-rules-legend">
                  {BERN_RULES.map((r) => (
                    <li key={r.id}>
                      <span className="hgr-ber-rules-legend-id">
                        {r.id}
                        {r.hardGate && <span className="hgr-ber-rules-legend-gate">HARD GATE</span>}
                      </span>
                      <span className="hgr-ber-rules-legend-name">{r.name}</span>
                      <span className="hgr-ber-rules-legend-desc">{r.description}</span>
                    </li>
                  ))}
                </ul>

                {selectedMission && (
                  <div className="hgr-ber-hub-spec">
                    <button
                      type="button"
                      className="hgr-ber-hub-spec-header"
                      onClick={() => setSpecExpanded((v) => !v)}
                      aria-expanded={specExpanded}
                    >
                      <span className="hgr-ber-hub-spec-header-left">
                        <span
                          className={`hgr-ber-hub-spec-arrow${specExpanded ? " hgr-ber-hub-spec-arrow-open" : ""}`}
                        >
                          ▸
                        </span>
                        <span className="hgr-ber-hub-spec-code">
                          Spec ID: {selectedMission.missionCode}
                        </span>
                      </span>
                      {selectedMission.confidenceScore !== null && (
                        <span className="hgr-ber-hub-spec-confidence">
                          Score: {Math.round(selectedMission.confidenceScore * 100)}%
                        </span>
                      )}
                    </button>

                    {specExpanded && (
                      <div className="hgr-ber-hub-spec-body">
                        {selectedMission.summary && (
                          <p className="hgr-ber-hub-spec-summary">{selectedMission.summary}</p>
                        )}

                        {selectedMission.missionSpecs && (
                          <div className="hgr-ber-hub-spec-fields">
                            <SpecField label="Domain" value={selectedMission.missionSpecs.domain} />
                            <SpecField
                              label="Vertical"
                              value={selectedMission.missionSpecs.vertical}
                            />
                            <SpecField
                              label="Vehicle class"
                              value={selectedMission.missionSpecs.vehicleClass}
                            />
                            <SpecField
                              label="Mission type"
                              value={selectedMission.missionSpecs.missionType}
                            />
                            <SpecField label="Phase" value={selectedMission.missionSpecs.phase} />
                            <SpecField
                              label="Environment"
                              value={selectedMission.missionSpecs.operatingEnvironment}
                            />
                          </div>
                        )}

                        {selectedMission.constraints && selectedMission.constraints.length > 0 && (
                          <div className="hgr-ber-hub-spec-block">
                            <div className="hgr-ber-hub-spec-block-title">
                              Constraints ({selectedMission.constraints.length})
                            </div>
                            <ul>
                              {selectedMission.constraints.map((c, i) => (
                                <li key={i}>
                                  <b>{c.name}</b>: {c.value}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {selectedMission.kpis && selectedMission.kpis.length > 0 && (
                          <div className="hgr-ber-hub-spec-block">
                            <div className="hgr-ber-hub-spec-block-title">
                              KPIs ({selectedMission.kpis.length})
                            </div>
                            <ul>
                              {selectedMission.kpis.map((k, i) => (
                                <li key={i}>
                                  <b>{k.name}</b>: {k.target} {k.unit} (
                                  {k.priority === "critical" ? "critical" : `#${k.priority}`})
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <button
                          type="button"
                          className="hgr-ber-btn hgr-ber-btn-amber"
                          disabled={reviewStatus === "loading"}
                          onClick={requestCheck}
                          style={{ marginTop: 4 }}
                        >
                          {reviewStatus === "loading" ? "Checking…" : "Ask Bernoulli"}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {checkTriggered && selectedMission && (
                  <div className="hgr-ber-hub-report">
                    <div className="hgr-ber-hub-report-title">
                      Bernoulli report -- {selectedMission.missionCode}
                      {reviewResult && (
                        <span className="hgr-ber-hub-report-date">
                          {" "}
                          -- {new Date(reviewResult.createdAt).toLocaleString()}
                        </span>
                      )}
                    </div>

                    {reviewStatus === "loading" && (
                      <p className="hgr-ber-hub-report-placeholder">
                        Running BERN-M01–M05 -- deterministic checks are instant, the Claude call
                        (BERN-M03) can take a few seconds…
                      </p>
                    )}

                    {reviewStatus === "error" && (
                      <div className="hgr-ber-hub-report-error">
                        <p>Couldn't complete the review: {reviewError}</p>
                        <button
                          type="button"
                          className="hgr-ber-btn hgr-ber-btn-ghost"
                          onClick={requestCheck}
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    {reviewStatus === "idle" && reviewResult && (
                      <>
                        <div className="hgr-ber-report-summary">
                          <span className={`hgr-ber-verdict hgr-ber-verdict-${reviewResult.verdict}`}>
                            {reviewResult.verdict}
                          </span>
                          <span className="hgr-ber-report-confidence">
                            {Math.round(reviewResult.confidenceScore * 100)}% confidence
                          </span>
                        </div>
                        <ul className="hgr-ber-check-list">
                          {reviewResult.checks.map((c) => (
                            <li key={c.ruleId} className="hgr-ber-check-row">
                              <span className="hgr-ber-check-rule">
                                {c.ruleId}
                                <span className="hgr-ber-check-rule-name">
                                  {BERN_RULE_NAMES[c.ruleId] ?? ""}
                                </span>
                              </span>
                              <span className={`hgr-ber-check-badge hgr-ber-check-badge-${c.status}`}>
                                {c.status}
                              </span>
                              <span className="hgr-ber-check-message">
                                {c.message}
                                {c.sourceWasMock && (
                                  <span className="hgr-ber-check-mock"> -- via Claude (mock)</span>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="hgr-ber-hub-col">
                {RIGHT_CALLERS.map((b) =>
                  search.source === b.key ? (
                    <Link
                      key={b.bay}
                      to={b.to}
                      className="hgr-ber-caller-chip hgr-ber-caller-highlighted"
                      style={{ textDecoration: "none" }}
                      title={`Back to ${b.name}`}
                    >
                      <span className="hgr-ber-caller-bay">BAY {b.bay}</span>
                      <span className="hgr-ber-caller-name">{b.name}</span>
                    </Link>
                  ) : (
                    <div key={b.bay} className="hgr-ber-caller-chip">
                      <span className="hgr-ber-caller-bay">BAY {b.bay}</span>
                      <span className="hgr-ber-caller-name">{b.name}</span>
                    </div>
                  ),
                )}
              </div>
            </div>

            <p className="hgr-ber-empty-hint">
              Advisory only, never gating -- a flagged or violating result won't block the calling
              bay's own pipeline.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function SpecField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="hgr-ber-hub-spec-field">
      <div className="hgr-ber-hub-spec-field-label">{label}</div>
      <div className="hgr-ber-hub-spec-field-value">{value ?? "—"}</div>
    </div>
  );
}

const HGR_BERNOULLI_CSS = `
.hgr-ber{
  --hgr-ber-navy-deep:#08131F; --hgr-ber-navy-panel:#0F2136;
  --hgr-ber-blue-line:#3E7CA6; --hgr-ber-blue-bright:#6FB4E0;
  --hgr-ber-amber:#E8A33D; --hgr-ber-amber-bright:#F6C374;
  --hgr-ber-paper:#ECEFF3; --hgr-ber-paper-dim:#8FA5BB;
  --hgr-ber-green:#5FBF8F; --hgr-ber-red:#E0715A;
  --hgr-ber-grid:rgba(111,180,224,0.08); --hgr-ber-hairline:rgba(111,180,224,0.20);

  background:var(--hgr-ber-navy-deep); color:var(--hgr-ber-paper); font-family:'IBM Plex Sans', sans-serif;
  background-image:linear-gradient(var(--hgr-ber-grid) 1px, transparent 1px), linear-gradient(90deg, var(--hgr-ber-grid) 1px, transparent 1px);
  background-size:44px 44px;
  min-height:100vh;
}
.hgr-ber *{ box-sizing:border-box; }
.hgr-ber h1,.hgr-ber h2,.hgr-ber h3{ font-family:'Space Grotesk', sans-serif; font-weight:600; letter-spacing:-0.01em; margin:0; }
.hgr-ber-mono{ font-family:'IBM Plex Mono', monospace; }
.hgr-ber-wrap{ max-width:1180px; margin:0 auto; padding:0 32px; }
.hgr-ber a{ color:inherit; }

.hgr-ber nav{ border-bottom:1px solid var(--hgr-ber-hairline); position:sticky; top:0; background:rgba(8,19,31,0.9); backdrop-filter:blur(8px); z-index:20; }
.hgr-ber nav .hgr-ber-wrap{ display:flex; align-items:center; justify-content:space-between; height:68px; }
.hgr-ber-crumbs{ font-size:14px; color:var(--hgr-ber-paper-dim); display:flex; align-items:center; gap:8px; }
.hgr-ber-crumbs a{ text-decoration:none; color:var(--hgr-ber-paper-dim); }
.hgr-ber-crumbs a:hover{ color:var(--hgr-ber-blue-bright); }
.hgr-ber-sep{ color:var(--hgr-ber-blue-line); }
.hgr-ber-cur{ color:var(--hgr-ber-paper); font-weight:500; }
.hgr-ber-exit{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-ber-paper-dim); text-decoration:none; border:1px solid var(--hgr-ber-hairline); padding:8px 15px; border-radius:2px; }
.hgr-ber-exit:hover{ color:var(--hgr-ber-paper); border-color:var(--hgr-ber-blue-bright); }

.hgr-ber main{ padding-bottom:100px; }
.hgr-ber-hero{ padding:56px 0 20px; border-bottom:1px solid var(--hgr-ber-hairline); position:relative; overflow:hidden; }
.hgr-ber-doors{ position:absolute; inset:0; z-index:5; display:flex; pointer-events:none; }
.hgr-ber-door{ flex:1; background: repeating-linear-gradient(90deg, #0C1E30 0 78px, #08131F 78px 80px); position:relative; }
.hgr-ber-door::after{ content:""; position:absolute; top:0; bottom:0; width:2px; background:var(--hgr-ber-blue-line); opacity:.5; }
.hgr-ber-door-left{ animation: hgr-ber-openLeft 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
.hgr-ber-door-right{ animation: hgr-ber-openRight 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
.hgr-ber-door-left::after{ right:0; }
.hgr-ber-door-right::after{ left:0; }
@keyframes hgr-ber-openLeft{ from{ transform:translateX(0);} to{ transform:translateX(-100%);} }
@keyframes hgr-ber-openRight{ from{ transform:translateX(0);} to{ transform:translateX(100%);} }
@media (prefers-reduced-motion: reduce){ .hgr-ber-doors{ display:none; } }
.hgr-ber-status-row{ display:flex; align-items:center; gap:12px; margin-bottom:22px; flex-wrap:wrap; }
.hgr-ber-badge{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; letter-spacing:.1em; text-transform:uppercase; padding:6px 13px; border-radius:2px; display:inline-flex; align-items:center; gap:8px; }
.hgr-ber-badge-bay{ color:var(--hgr-ber-paper-dim); border:1px solid var(--hgr-ber-hairline); }
.hgr-ber-badge-design{ color:var(--hgr-ber-amber-bright); border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); }
.hgr-ber-hero-row{ display:flex; align-items:center; gap:48px; flex-wrap:wrap; }
@media(max-width:760px){ .hgr-ber-hero-row{ flex-direction:column; align-items:flex-start; gap:16px; } }
.hgr-ber-hero h1{ font-size:clamp(34px,5vw,58px); margin:0; flex-shrink:0; }
.hgr-ber-hero .hgr-ber-lead{ color:var(--hgr-ber-paper-dim); font-size:15.5px; max-width:520px; line-height:1.6; margin:0; flex:1; min-width:280px; }
.hgr-ber-hero .hgr-ber-lead b{ color:var(--hgr-ber-paper); font-weight:600; }

.hgr-ber section{ padding:60px 0; }
#bernoulli-hub{ padding-top:32px; }
.hgr-ber-kicker{ font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--hgr-ber-amber); margin-bottom:12px; }
.hgr-ber-sec-title{ font-size:clamp(22px,2.6vw,30px); margin-bottom:10px; }
.hgr-ber-sec-sub{ color:var(--hgr-ber-paper-dim); font-size:14.5px; max-width:640px; margin-bottom:36px; line-height:1.6; }
.hgr-ber-empty-hint{ color:var(--hgr-ber-paper-dim); font-size:13.5px; margin-top:36px; }

/* -- Hub-and-spoke: 5 callers left, mission picker + spec center, 5 callers
   right. Its own wider wrap (not the standard 1180px .hgr-ber-wrap) pushes
   the two columns further out toward the page edges. align-items:flex-start
   on the row (not center) lines the center column's top edge up with BAY 01
   / BAY 06 -- the first chip in each side column. -- */
.hgr-ber-hub-wrap{ max-width:1700px; margin:0 auto; padding:0 32px; }
.hgr-ber-hub-row{ display:flex; align-items:flex-start; justify-content:space-between; gap:24px; min-height:640px; }
@media(max-width:900px){ .hgr-ber-hub-row{ flex-direction:column; align-items:stretch; gap:28px; min-height:0; } }
.hgr-ber-hub-col{ flex:0 0 280px; display:flex; flex-direction:column; justify-content:space-between; align-self:stretch; padding:12px 0; }
@media(max-width:900px){ .hgr-ber-hub-col{ flex:none; padding:0; gap:14px; } }

.hgr-ber-caller-chip{
  width:100%; background:var(--hgr-ber-navy-panel); border:1px solid var(--hgr-ber-hairline);
  border-radius:2px; padding:12px 16px; display:flex; flex-direction:column; gap:4px;
  transition:border-color .25s, box-shadow .25s, background .25s;
}
.hgr-ber-caller-bay{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.05em; color:var(--hgr-ber-amber-bright); }
.hgr-ber-caller-name{ font-size:13px; color:var(--hgr-ber-paper); }
.hgr-ber-caller-highlighted{
  cursor:pointer; border-color:var(--hgr-ber-amber); background:rgba(232,163,61,.1);
  box-shadow:0 0 0 1px var(--hgr-ber-amber), 0 0 16px rgba(232,163,61,.45);
}
.hgr-ber-caller-highlighted:hover{ background:rgba(232,163,61,.18); }

.hgr-ber-hub-center{
  flex:0 0 400px; display:flex; flex-direction:column; align-items:stretch; text-align:left;
  padding-top:12px; gap:10px;
}
@media(max-width:900px){ .hgr-ber-hub-center{ padding-top:0; flex:1; } }
.hgr-ber-hub-select-label{ font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-ber-paper-dim); }
.hgr-ber-hub-select-row{ display:flex; gap:10px; align-items:stretch; }
.hgr-ber-hub-select{
  flex:1; min-width:0; font-family:'IBM Plex Sans',sans-serif; font-size:13.5px; color:var(--hgr-ber-paper);
  background:var(--hgr-ber-navy-panel); border:1px solid var(--hgr-ber-hairline); border-radius:2px;
  padding:10px 12px; cursor:pointer;
}
.hgr-ber-hub-select:disabled{ opacity:.5; cursor:not-allowed; }
.hgr-ber-hub-select-hint{ color:var(--hgr-ber-paper-dim); font-size:12px; line-height:1.5; margin:0; }
.hgr-ber-hub-select-error{ flex:1; font-size:13px; color:var(--hgr-ber-amber-bright); }

.hgr-ber-btn{
  font-family:'IBM Plex Mono',monospace; font-size:12.5px; font-weight:600; white-space:nowrap;
  padding:10px 16px; border-radius:2px; border:1px solid transparent; cursor:pointer;
}
.hgr-ber-btn-amber{ background:var(--hgr-ber-amber); color:var(--hgr-ber-navy-deep); }
.hgr-ber-btn-amber:hover{ background:var(--hgr-ber-amber-bright); }
.hgr-ber-btn:disabled{ opacity:.4; cursor:not-allowed; background:var(--hgr-ber-hairline); color:var(--hgr-ber-paper-dim); }

/* -- Selected mission's spec, shown by default below the picker. Header
   (id + score) is always visible and toggles the rest; collapses down to
   just that header on Ask Bernoulli. -- */
.hgr-ber-hub-spec{
  margin-top:8px; border:1px solid var(--hgr-ber-hairline); background:var(--hgr-ber-navy-panel);
  border-radius:2px; padding:16px 18px;
}
.hgr-ber-hub-spec-header{
  display:flex; align-items:center; justify-content:space-between; gap:12px; width:100%;
  background:none; border:none; padding:0; cursor:pointer; font-family:inherit; color:inherit;
}
.hgr-ber-hub-spec-header-left{ display:flex; align-items:center; gap:8px; }
.hgr-ber-hub-spec-arrow{ display:inline-block; font-size:11px; color:var(--hgr-ber-paper-dim); transition:transform .15s; }
.hgr-ber-hub-spec-arrow-open{ transform:rotate(90deg); }
.hgr-ber-hub-spec-body{ margin-top:14px; }
.hgr-ber-hub-spec-code{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-ber-blue-bright); }
.hgr-ber-hub-spec-confidence{ font-family:'IBM Plex Mono',monospace; font-size:12px; font-weight:700; color:var(--hgr-ber-amber-bright); }
.hgr-ber-hub-spec-summary{ font-size:13.5px; color:var(--hgr-ber-paper); line-height:1.6; margin:0 0 16px; }
.hgr-ber-hub-spec-fields{ display:grid; grid-template-columns:1fr 1fr; gap:12px 16px; margin-bottom:16px; }
.hgr-ber-hub-spec-field-label{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.06em; text-transform:uppercase; color:var(--hgr-ber-paper-dim); margin-bottom:3px; }
.hgr-ber-hub-spec-field-value{ font-size:13px; color:var(--hgr-ber-paper); }
.hgr-ber-hub-spec-block{ margin-bottom:16px; }
.hgr-ber-hub-spec-block:last-child{ margin-bottom:0; }
.hgr-ber-hub-spec-block-title{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--hgr-ber-paper-dim); margin-bottom:8px; }
.hgr-ber-hub-spec-block ul{ margin:0; padding-left:18px; color:var(--hgr-ber-paper); font-size:12.5px; line-height:1.8; }

/* -- Report, opened by Ask Bernoulli -- runs BERN-M01-M05 for real -- */
.hgr-ber-hub-report{
  margin-top:16px; border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.06);
  border-radius:2px; padding:20px 22px;
}
.hgr-ber-hub-report-title{ font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:var(--hgr-ber-amber-bright); margin-bottom:10px; }
.hgr-ber-hub-report-date{ text-transform:none; color:var(--hgr-ber-paper-dim); font-weight:400; }
.hgr-ber-hub-report-placeholder{ font-size:13px; color:var(--hgr-ber-paper-dim); line-height:1.6; margin:0; }
.hgr-ber-hub-report-error p{ font-size:13px; color:var(--hgr-ber-paper); margin:0 0 10px; }

.hgr-ber-btn-ghost{ background:none; border:1px solid var(--hgr-ber-hairline); color:var(--hgr-ber-paper-dim); }
.hgr-ber-btn-ghost:hover{ color:var(--hgr-ber-paper); border-color:var(--hgr-ber-blue-bright); }

.hgr-ber-report-summary{ display:flex; align-items:center; gap:14px; margin-bottom:16px; }
.hgr-ber-verdict{
  font-family:'Space Grotesk',sans-serif; font-size:18px; font-weight:700; letter-spacing:.03em;
  padding:5px 14px; border-radius:2px;
}
.hgr-ber-verdict-PASS{ background:rgba(95,191,143,.15); color:var(--hgr-ber-green); }
.hgr-ber-verdict-WARN{ background:rgba(232,163,61,.18); color:var(--hgr-ber-amber-bright); }
.hgr-ber-verdict-FAIL{ background:rgba(224,113,90,.18); color:var(--hgr-ber-red); }
.hgr-ber-report-confidence{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-ber-paper-dim); }

.hgr-ber-check-list{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:1px; background:var(--hgr-ber-hairline); border:1px solid var(--hgr-ber-hairline); }
.hgr-ber-check-row{ display:grid; grid-template-columns:140px 60px 1fr; gap:10px; align-items:start; background:var(--hgr-ber-navy-panel); padding:10px 12px; }
@media(max-width:900px){ .hgr-ber-check-row{ grid-template-columns:1fr; gap:4px; } }
.hgr-ber-check-rule{ font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--hgr-ber-blue-bright); }
.hgr-ber-check-rule-name{ display:block; font-family:'IBM Plex Sans',sans-serif; font-size:10.5px; color:var(--hgr-ber-paper-dim); margin-top:2px; }

/* -- Legend: what BERN-M01-M05 each check -- */
.hgr-ber-rules-legend{ list-style:none; margin:14px 0 0; padding:0; display:flex; flex-direction:column; gap:8px; }
.hgr-ber-rules-legend li{ display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; font-size:12px; line-height:1.5; }
.hgr-ber-rules-legend-id{ font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--hgr-ber-blue-bright); flex-shrink:0; display:inline-flex; align-items:center; gap:6px; }
.hgr-ber-rules-legend-gate{ font-family:'IBM Plex Mono',monospace; font-size:8.5px; letter-spacing:.05em; color:var(--hgr-ber-amber-bright); border:1px solid rgba(232,163,61,.4); border-radius:2px; padding:1px 5px; }
.hgr-ber-rules-legend-name{ font-weight:600; color:var(--hgr-ber-paper); flex-shrink:0; }
.hgr-ber-rules-legend-desc{ color:var(--hgr-ber-paper-dim); }
.hgr-ber-check-badge{ font-family:'IBM Plex Mono',monospace; font-size:10px; font-weight:700; letter-spacing:.04em; padding:2px 7px; border-radius:2px; justify-self:start; white-space:nowrap; }
.hgr-ber-check-badge-PASS{ background:rgba(95,191,143,.15); color:var(--hgr-ber-green); }
.hgr-ber-check-badge-WARN{ background:rgba(232,163,61,.18); color:var(--hgr-ber-amber-bright); }
.hgr-ber-check-badge-FAIL{ background:rgba(224,113,90,.18); color:var(--hgr-ber-red); }
.hgr-ber-check-badge-INFO{ background:rgba(111,180,224,.15); color:var(--hgr-ber-blue-bright); }
.hgr-ber-check-message{ font-size:12.5px; color:var(--hgr-ber-paper); line-height:1.6; }
.hgr-ber-check-mock{ color:var(--hgr-ber-paper-dim); font-style:italic; }

.hgr-ber-hub-select-error button{
  background:none; border:none; color:var(--hgr-ber-blue-bright); text-decoration:underline; cursor:pointer; font-size:13px; padding:0;
}
`;
