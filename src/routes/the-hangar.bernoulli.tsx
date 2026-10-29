import { useEffect, useState } from "react";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useHangarSession } from "@/lib/the-hangar/session";
import { supabase } from "@/integrations/supabase/client";
import type { MissionListEntry } from "@/lib/the-hangar/missionAgentPipeline";
import type { ConceptListEntry } from "@/lib/the-hangar/conceptAgentPipeline";
import { describeInrCost, formatCostInr } from "@/lib/the-hangar/missionUsage";

// Local view types mirroring the /api/hangar/process-bernoulli/review
// response shape (bernoulliAgentPipeline.ts's BernoulliReviewResponse) --
// duplicated rather than imported, same client/server type-duplication
// convention every other bay page already follows.
interface BernoulliCheckView {
  ruleId: string;
  ruleName?: string;
  status: "PASS" | "WARN" | "FAIL" | "INFO";
  message: string;
  sourceWasMock: boolean;
  reasoning?: string;
  usage?: { inputTokens: number; outputTokens: number };
  provider?: "anthropic" | "groq";
}

// One row of the check registry (/api/hangar/bernoulli-rules), the fields
// this page uses. Mirrors bernoulliRules.ts's BernoulliRuleDef.
interface RegistryRule {
  ruleId: string;
  name: string;
  description: string;
  kind: "rule" | "llm";
  hardGate: boolean;
  enabled: boolean;
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
  usage: { requests: number; inputTokens: number; outputTokens: number; estimatedCostUsd: number };
  durationMs: number | null;
  sourceBay?: "mission" | "concept";
  conceptId?: string | null;
  conceptCode?: string | null;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

const PROVIDER_LABEL: Record<"anthropic" | "groq", string> = { anthropic: "Claude", groq: "Groq" };

// Collapsible "Requests & tokens", same as Bay 01/02: closed by default with
// the totals in its header; opens to the summary bar + per-check table.
function BernoulliUsageDetails({ review }: { review: BernoulliReviewView }) {
  const u = review.usage;
  if (!u) return null;
  return (
    <details className="hgr-ber-usage-details">
      <summary title="LLM usage for this review. Cost is an estimate in INR at a fixed USD rate, not a bill.">
        <span className="hgr-ber-usage-details-label">Requests &amp; tokens</span>
        <span className="hgr-ber-usage-details-totals">
          {u.requests} req · {(u.inputTokens + u.outputTokens).toLocaleString()} tokens · ~
          {formatCostInr(u.estimatedCostUsd)}
        </span>
      </summary>
      <BernoulliTelemetryBar review={review} />
      <BernoulliUsageTable review={review} />
    </details>
  );
}

// Same telemetry bar Bay 01 shows (Requests / tokens / est. cost / time),
// so both bays read their LLM spend the same way.
function BernoulliTelemetryBar({ review }: { review: BernoulliReviewView }) {
  const u = review.usage;
  if (!u) return null;
  return (
    <div
      className="hgr-ber-telemetry"
      title="LLM usage for this review. Cost is an estimate in INR at a fixed USD rate, not a bill. Time is only known for a review run in this session."
    >
      <div className="hgr-ber-telemetry-item">
        <span className="hgr-ber-telemetry-num">{u.requests}</span>
        <span className="hgr-ber-telemetry-label">API calls</span>
      </div>
      <div className="hgr-ber-telemetry-item">
        <span className="hgr-ber-telemetry-num">{u.inputTokens.toLocaleString()}</span>
        <span className="hgr-ber-telemetry-label">Input tokens</span>
      </div>
      <div className="hgr-ber-telemetry-item">
        <span className="hgr-ber-telemetry-num">{u.outputTokens.toLocaleString()}</span>
        <span className="hgr-ber-telemetry-label">Output tokens</span>
      </div>
      <div className="hgr-ber-telemetry-item" title={describeInrCost(u.estimatedCostUsd)}>
        <span className="hgr-ber-telemetry-num">~{formatCostInr(u.estimatedCostUsd)}</span>
        <span className="hgr-ber-telemetry-label">Est. cost</span>
      </div>
      <div className="hgr-ber-telemetry-item">
        <span className="hgr-ber-telemetry-num">
          {review.durationMs !== null ? formatDuration(review.durationMs) : "—"}
        </span>
        <span className="hgr-ber-telemetry-label">Latency</span>
      </div>
    </div>
  );
}

// Per-check usage, same shape as Bay 01's per-stage table: deterministic
// checks are a real 0 (they ran, they just make no LLM call), LLM checks
// show their actual tokens and which provider answered.
function BernoulliUsageTable({ review }: { review: BernoulliReviewView }) {
  const u = review.usage;
  if (!u) return null;
  return (
    <table
      className="hgr-ber-usage-table"
      title="LLM requests and tokens per check. Cost is an estimate in INR at a fixed USD rate, not a bill."
    >
      <thead>
        <tr>
          <th>Check</th>
          <th className="hgr-ber-usage-num">Requests</th>
          <th className="hgr-ber-usage-num">Tokens</th>
        </tr>
      </thead>
      <tbody>
        {review.checks.map((c) => (
          <tr key={c.ruleId}>
            <td>
              {c.ruleId} {c.ruleName ?? BERN_RULE_NAMES[c.ruleId] ?? ""}
              {c.provider && <span className="hgr-ber-usage-provider">{PROVIDER_LABEL[c.provider]}</span>}
              {c.sourceWasMock && <span className="hgr-ber-usage-mock">simulated</span>}
            </td>
            <td className="hgr-ber-usage-num">{c.usage ? 1 : 0}</td>
            <td className="hgr-ber-usage-num">
              {c.usage ? (c.usage.inputTokens + c.usage.outputTokens).toLocaleString() : 0}
              {c.usage && (
                <span className="hgr-ber-usage-split">
                  {" "}
                  in {c.usage.inputTokens.toLocaleString()} · out {c.usage.outputTokens.toLocaleString()}
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td>Total</td>
          <td className="hgr-ber-usage-num">{u.requests}</td>
          <td className="hgr-ber-usage-num">{(u.inputTokens + u.outputTokens).toLocaleString()}</td>
        </tr>
        <tr>
          <td colSpan={2}>Estimated cost</td>
          <td className="hgr-ber-usage-num" title={describeInrCost(u.estimatedCostUsd)}>
            ~{formatCostInr(u.estimatedCostUsd)}
          </td>
        </tr>
      </tfoot>
    </table>
  );
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

// Every check bernoulliChecks.ts runs, with a human-readable name and
// one-line description -- shown as a legend before a check runs, and to
// label each row of the report after. `bay` is whose output the check
// reviews: BERN-M01-M06 for a Bay 01 mission spec (hard gates M01/M05),
// BERN-C01-C04 for a Bay 02 concept run (hard gate C02).
const BERN_RULES: { id: string; bay: "mission" | "concept"; name: string; description: string; hardGate: boolean }[] = [
  {
    id: "BERN-M01",
    bay: "mission",
    name: "Speed Consistency",
    description: "Range ÷ Endurance implies an average speed -- flagged if implausible for the vehicle class.",
    hardGate: true,
  },
  {
    id: "BERN-M02",
    bay: "mission",
    name: "Coverage Math",
    description: "For multi-unit/swarm specs: units × per-unit coverage angle should reach 360°.",
    hardGate: false,
  },
  {
    id: "BERN-M03",
    bay: "mission",
    name: "Payload/Endurance Plausibility",
    description: "TorqWings AI-judged: is this payload/endurance combination realistic for this vehicle class?",
    hardGate: false,
  },
  {
    id: "BERN-M04",
    bay: "mission",
    name: "KPI/Constraint Provenance",
    description: "Does every constraint cite a source, or are some untagged?",
    hardGate: false,
  },
  {
    id: "BERN-M05",
    bay: "mission",
    name: "Dimensional Consistency",
    description: 'Do KPI units actually match what their names imply (e.g. "Range" isn\'t given in kg)?',
    hardGate: true,
  },
  {
    id: "BERN-M06",
    bay: "mission",
    name: "Energy/Power Budget Plausibility",
    description: "TorqWings AI-judged, grounded in reference ranges: could a battery/fuel load that fits this vehicle class actually deliver this payload+endurance?",
    hardGate: false,
  },
  {
    id: "BERN-C01",
    bay: "concept",
    name: "Vehicle-Class Consistency",
    description: "Do the concepts stay within the vehicle class the mission spec calls for?",
    hardGate: false,
  },
  {
    id: "BERN-C02",
    bay: "concept",
    name: "Speed Feasibility per Concept",
    description: "Can each concept's vehicle class fly the average speed the mission's range ÷ endurance needs?",
    hardGate: true,
  },
  {
    id: "BERN-C03",
    bay: "concept",
    name: "Ranking Coherence",
    description: "Is the ranking consistent with constraint fit, and is any \"pass\" contradicted by the physics?",
    hardGate: false,
  },
  {
    id: "BERN-C04",
    bay: "concept",
    name: "Physical Feasibility per Concept",
    description: "TorqWings AI-judged, grounded in reference ranges: can each concept physically carry the payload for the required endurance?",
    hardGate: false,
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
  const [conceptSpecExpanded, setConceptSpecExpanded] = useState(true);
  const [checkTriggered, setCheckTriggered] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<"idle" | "loading" | "error">("idle");
  const [reviewResult, setReviewResult] = useState<BernoulliReviewView | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [llmStatus, setLlmStatus] = useState<"checking" | "live" | "offline">("checking");
  const [llmProvider, setLlmProvider] = useState<"anthropic" | "groq" | null>(null);

  // "AI" indicator -- same live check Bay 01's header uses, so both bays
  // show the same provider (Claude, or Groq when Anthropic is down).
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
        if (!cancelled) {
          setLlmStatus(res.ok && json.live ? "live" : "offline");
          setLlmProvider(res.ok && json.live ? json.provider ?? null : null);
        }
      } catch {
        if (!cancelled) {
          setLlmStatus("offline");
          setLlmProvider(null);
        }
      }
    }
    checkLlmStatus();
    const interval = setInterval(checkLlmStatus, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);
  // Landing here with nothing at all (e.g. clicking the Bernoulli hub
  // directly on the welcome page, not "Ask Bernoulli" from a specific
  // bay) shows just the idle hub circle -- no picker, no legend, no spec
  // -- until a caller box is clicked. `activeSource` starts at whatever
  // `search.source` already says (the real "arrived from X" case still
  // opens straight into the picker); clicking a DIFFERENT box while idle
  // only updates this local state and reveals the picker, it never
  // navigates -- only the box matching the true `search.source` is ever
  // a real back-link (see the caller-box rendering below).
  const [activeSource, setActiveSource] = useState<string>(search.source);
  const [concepts, setConcepts] = useState<ConceptListEntry[] | null>(null);
  const [conceptsStatus, setConceptsStatus] = useState<"idle" | "loading" | "error">("idle");
  const [selectedConceptId, setSelectedConceptId] = useState<string>(
    search.source === "concept" ? search.sourceId : "",
  );

  const selectedMission = missions?.find((m) => m.missionId === selectedMissionId) ?? null;

  // From Bay 02 the dropdown lists concepts, not missions: the review checks
  // the selected concept's output, judged against its source mission (which
  // is selected alongside it, so the spec block still shows the yardstick).
  const conceptMode = activeSource === "concept";
  const reviewConceptId = conceptMode && selectedConceptId ? selectedConceptId : null;
  const listedConcepts =
    concepts?.filter((c) => c.status === "spec_ready" || c.conceptId === selectedConceptId) ?? null;

  // Dropdown scoped to the calling bay: from Mission only specs still open
  // for review (spec_ready -- finalized ones have moved on to Concept), from
  // Concept the finalized specs concepts are built from. The mission the
  // caller linked with always stays listed so the preselection never blanks.
  const listedStatus = activeSource === "mission" ? "spec_ready" : activeSource === "concept" ? "finalized" : null;
  const listedMissions =
    missions?.filter(
      (m) => !listedStatus || m.status === listedStatus || m.missionId === selectedMissionId,
    ) ?? null;
  // Legend + run summary come from the check registry (Mission Hub ->
  // Agents -> Bernoulli) for the current bay; BERN_RULES is only the fallback
  // while it loads or if it can't be read.
  const ruleBay = conceptMode ? "concept" : "mission";
  const [registry, setRegistry] = useState<Record<string, RegistryRule[]>>({});
  useEffect(() => {
    if (!currentUserEmail || registry[ruleBay]) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      try {
        const res = await fetch(`/api/hangar/bernoulli-rules?bay=${ruleBay}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const json = (await res.json()) as { rules: RegistryRule[] };
        if (!cancelled) setRegistry((cur) => ({ ...cur, [ruleBay]: json.rules }));
      } catch {
        // keep the fallback legend
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserEmail, ruleBay]);
  const visibleRules: { id: string; name: string; description: string; hardGate: boolean; kind: "rule" | "llm" }[] =
    registry[ruleBay]
      ? registry[ruleBay]
          .filter((r) => r.enabled)
          .map((r) => ({ id: r.ruleId, name: r.name, description: r.description, hardGate: r.hardGate, kind: r.kind }))
      : BERN_RULES.filter((r) => r.bay === ruleBay).map((r) => ({
          ...r,
          kind: (r.id === "BERN-M03" || r.id === "BERN-M06" || r.id === "BERN-C04" ? "llm" : "rule") as "rule" | "llm",
        }));
  const aiCallCount = visibleRules.filter((r) => r.kind === "llm").length;
  const ruleCount = visibleRules.length - aiCallCount;
  const runSummary = `${visibleRules.length} check${visibleRules.length === 1 ? "" : "s"} -- ${ruleCount} rule-based plus ${aiCallCount} TorqWings AI call${aiCallCount === 1 ? "" : "s"}`;

  function activateSource(key: string) {
    setActiveSource(key);
    setSelectedMissionId("");
    setSelectedConceptId("");
    setSpecExpanded(true);
    setConceptSpecExpanded(true);
    setCheckTriggered(false);
    setReviewResult(null);
    setReviewStatus("idle");
    setReviewError(null);
  }

  async function requestCheck() {
    if (!selectedMissionId) return;
    setCheckTriggered(true);
    setSpecExpanded(false);
    setConceptSpecExpanded(false);
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
        body: JSON.stringify(
          reviewConceptId
            ? { missionId: selectedMissionId, source: "concept", sourceId: reviewConceptId }
            : { missionId: selectedMissionId },
        ),
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
  async function fetchSavedReview(missionId: string, conceptId: string | null = null) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    try {
      const qs = `missionId=${encodeURIComponent(missionId)}${conceptId ? `&conceptId=${encodeURIComponent(conceptId)}` : ""}`;
      const res = await fetch(`/api/hangar/bernoulli-review?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      if (!json) return; // nothing saved for this mission yet
      setReviewResult(json as BernoulliReviewView);
      setCheckTriggered(true);
      setSpecExpanded(false);
    setConceptSpecExpanded(false);
    } catch {
      // best-effort pre-load only
    }
  }

  function selectMission(id: string) {
    setSelectedMissionId(id);
    setSpecExpanded(true);
    setConceptSpecExpanded(true);
    setCheckTriggered(false);
    setReviewResult(null);
    setReviewStatus("idle");
    setReviewError(null);
    fetchSavedReview(id);
  }

  function selectConcept(id: string) {
    const c = concepts?.find((x) => x.conceptId === id) ?? null;
    setSelectedConceptId(id);
    setSelectedMissionId(c?.sourceMissionId ?? "");
    setSpecExpanded(true);
    setConceptSpecExpanded(true);
    setCheckTriggered(false);
    setReviewResult(null);
    setReviewStatus("idle");
    setReviewError(null);
    if (c) fetchSavedReview(c.sourceMissionId, id);
  }

  async function fetchConcepts() {
    setConceptsStatus("loading");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setConceptsStatus("error");
      return;
    }
    try {
      const res = await fetch("/api/hangar/concepts", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setConcepts(await res.json());
      setConceptsStatus("idle");
    } catch {
      setConceptsStatus("error");
    }
  }

  useEffect(() => {
    if (currentUserEmail && conceptMode && concepts === null) fetchConcepts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserEmail, conceptMode]);

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
    if (currentUserEmail && search.missionId) {
      fetchSavedReview(search.missionId, search.source === "concept" && search.sourceId ? search.sourceId : null);
    }
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

  // Collapsible spec blocks. Mission mode: mission spec above the report
  // (unchanged). Concept mode: report first, then the concept's own spec,
  // then the source mission spec it's judged against.
  const missionSpecBlock = selectedMission ? (
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
            {conceptMode ? "Source Mission Spec" : "Spec ID"}: {selectedMission.missionCode}
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

          {/* In concept mode the review targets the concept, so the run
              button lives next to the concept dropdown, not here. */}
          {!conceptMode && (
            <button
              type="button"
              className="hgr-ber-btn hgr-ber-btn-amber"
              disabled={reviewStatus === "loading"}
              onClick={requestCheck}
              style={{ marginTop: 4 }}
            >
              {reviewStatus === "loading" ? "Checking…" : "Ask Bernoulli"}
            </button>
          )}
        </div>
      )}
    </div>
  ) : null;

  const selectedConceptEntry = concepts?.find((c) => c.conceptId === selectedConceptId) ?? null;
  const conceptSpecBlock =
    conceptMode && selectedConceptEntry ? (
      <div className="hgr-ber-hub-spec">
        <button
          type="button"
          className="hgr-ber-hub-spec-header"
          onClick={() => setConceptSpecExpanded((v) => !v)}
          aria-expanded={conceptSpecExpanded}
        >
          <span className="hgr-ber-hub-spec-header-left">
            <span className={`hgr-ber-hub-spec-arrow${conceptSpecExpanded ? " hgr-ber-hub-spec-arrow-open" : ""}`}>
              ▸
            </span>
            <span className="hgr-ber-hub-spec-code">Concept Spec: {selectedConceptEntry.conceptCode}</span>
          </span>
          {selectedConceptEntry.confidenceScore !== null && (
            <span className="hgr-ber-hub-spec-confidence">
              Score: {Math.round(selectedConceptEntry.confidenceScore * 100)}%
            </span>
          )}
        </button>

        {conceptSpecExpanded && (
          <div className="hgr-ber-hub-spec-body">
            {selectedConceptEntry.rankedConcepts?.[0] && (
              <p className="hgr-ber-hub-spec-summary">
                Top concept: <b>{selectedConceptEntry.rankedConcepts[0].conceptName}</b>
                {selectedConceptEntry.rankedConcepts[0].description
                  ? ` -- ${selectedConceptEntry.rankedConcepts[0].description}`
                  : ""}
              </p>
            )}

            {selectedConceptEntry.rankedConcepts && selectedConceptEntry.rankedConcepts.length > 0 && (
              <div className="hgr-ber-hub-spec-block">
                <div className="hgr-ber-hub-spec-block-title">
                  Ranked concepts ({selectedConceptEntry.rankedConcepts.length})
                </div>
                <ul>
                  {[...selectedConceptEntry.rankedConcepts]
                    .sort((a, b) => a.rank - b.rank)
                    .map((r) => {
                      const cls = selectedConceptEntry.candidateConcepts?.find(
                        (c) => c.conceptName === r.conceptName,
                      )?.vehicleClass;
                      return (
                        <li key={r.conceptName}>
                          <b>
                            #{r.rank} {r.conceptName}
                          </b>
                          {cls ? ` (${cls})` : ""}: fit {r.constraintFit}, score {r.fitScore}/10
                        </li>
                      );
                    })}
                </ul>
              </div>
            )}

            {selectedConceptEntry.tradeOffNotes && selectedConceptEntry.tradeOffNotes.length > 0 && (
              <div className="hgr-ber-hub-spec-block">
                <div className="hgr-ber-hub-spec-block-title">
                  Trade-off notes ({selectedConceptEntry.tradeOffNotes.length})
                </div>
                <ul>
                  {selectedConceptEntry.tradeOffNotes.map((n) => (
                    <li key={n.conceptName}>
                      <b>{n.conceptName}</b>: {n.prosCons.join("; ")}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    ) : null;

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
              <span
                className={`hgr-ber-badge hgr-ber-badge-ai hgr-ber-badge-ai-${llmStatus}`}
                title={
                  llmStatus === "checking"
                    ? "Checking connection to Anthropic/Groq…"
                    : llmStatus === "live"
                      ? llmProvider === "groq"
                        ? "Live — Anthropic unreachable, falling back to Groq (gpt-oss-120b)"
                        : "Live — connected to Anthropic (Claude Sonnet 5)"
                      : "Offline — not connected to Anthropic or Groq. BERN-M03/M06 will fall back to mock output."
                }
              >
                <span className="hgr-ber-badge-ai-dot" />
                AI
                {llmStatus === "live" && llmProvider === "anthropic" && (
                  <span className="hgr-ber-badge-ai-model">
                    <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
                      <path
                        d="M8 0 L9.4 6.6 L16 8 L9.4 9.4 L8 16 L6.6 9.4 L0 8 L6.6 6.6 Z"
                        fill="currentColor"
                      />
                    </svg>
                    Claude
                  </span>
                )}
                {llmStatus === "live" && llmProvider === "groq" && (
                  <span className="hgr-ber-badge-ai-model hgr-ber-badge-ai-model-fallback">
                    <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
                      <path d="M9 0 L2 9 L7 9 L6 16 L14 6 L9 6 Z" fill="currentColor" />
                    </svg>
                    Groq
                  </span>
                )}
              </span>
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
                    // The box matching where we ACTUALLY arrived from is
                    // the way back -- no separate "Back to X" nav link
                    // anymore. Still highlighted only while it's also the
                    // active one (a later click elsewhere moves the glow,
                    // not the back-link).
                    <Link
                      key={b.bay}
                      to={b.to}
                      className={`hgr-ber-caller-chip${activeSource === b.key ? " hgr-ber-caller-highlighted" : ""}`}
                      style={{ textDecoration: "none" }}
                      title={`Back to ${b.name}`}
                    >
                      <span className="hgr-ber-caller-bay">BAY {b.bay}</span>
                      <span className="hgr-ber-caller-name">{b.name}</span>
                    </Link>
                  ) : (
                    // Not where we arrived from -- clicking just activates
                    // it locally (reveals the picker if we landed idle),
                    // it never navigates.
                    <button
                      key={b.bay}
                      type="button"
                      className={`hgr-ber-caller-chip hgr-ber-caller-clickable${activeSource === b.key ? " hgr-ber-caller-highlighted" : ""}`}
                      onClick={() => activateSource(b.key)}
                    >
                      <span className="hgr-ber-caller-bay">BAY {b.bay}</span>
                      <span className="hgr-ber-caller-name">{b.name}</span>
                    </button>
                  ),
                )}
              </div>

              <div className="hgr-ber-hub-center">
                {!activeSource ? (
                  // Landed with no source/missionId/sourceId at all --
                  // e.g. clicked the Bernoulli hub directly on the welcome
                  // page, not "Ask Bernoulli" from a specific bay. Show
                  // just the idle hub circle; clicking any caller box to
                  // the left/right reveals the picker below instead.
                  <div className="hgr-ber-hub-idle">
                    <div className="hgr-ber-hub-idle-circle">
                      <span>BERNOULLI</span>
                    </div>
                    <p className="hgr-ber-hub-idle-hint">Click a bay to pick a mission to review.</p>
                  </div>
                ) : (
                  <>
                <label className="hgr-ber-hub-select-label" htmlFor="bernoulli-mission-select">
                  {conceptMode
                    ? "Your concepts -- concept ready"
                    : listedStatus === "spec_ready"
                      ? "Your missions -- spec ready"
                      : "Your missions -- spec ready or finalized"}
                </label>
                <div className="hgr-ber-hub-select-row">
                  {conceptMode ? (
                    conceptsStatus === "error" ? (
                      <div className="hgr-ber-hub-select-error">
                        Couldn't load your concepts.{" "}
                        <button type="button" onClick={fetchConcepts}>
                          Retry
                        </button>
                      </div>
                    ) : (
                      <select
                        id="bernoulli-mission-select"
                        className="hgr-ber-hub-select"
                        value={selectedConceptId}
                        disabled={conceptsStatus === "loading" || concepts === null || (listedConcepts?.length ?? 0) === 0}
                        onChange={(e) => selectConcept(e.target.value)}
                      >
                        <option value="">
                          {conceptsStatus === "loading" || concepts === null
                            ? "Loading concepts…"
                            : (listedConcepts?.length ?? 0) === 0
                              ? "No concept-ready concepts yet"
                              : `Select a concept-ready concept (${listedConcepts?.length})`}
                        </option>
                        {listedConcepts?.map((c) => (
                          <option key={c.conceptId} value={c.conceptId}>
                            {c.conceptCode}
                            {c.rankedConcepts?.[0]?.conceptName ? ` -- ${c.rankedConcepts[0].conceptName}` : ""}
                          </option>
                        ))}
                      </select>
                    )
                  ) : missionsStatus === "error" ? (
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
                      disabled={missionsStatus === "loading" || (listedMissions?.length ?? 0) === 0}
                      onChange={(e) => selectMission(e.target.value)}
                    >
                      <option value="">
                        {missionsStatus === "loading"
                          ? "Loading missions…"
                          : (listedMissions?.length ?? 0) === 0
                            ? listedStatus === "spec_ready"
                              ? "No spec-ready missions yet"
                              : listedStatus === "finalized"
                                ? "No finalized missions yet"
                                : "No missions with a spec yet"
                            : `Select a ${listedStatus === "spec_ready" ? "spec-ready " : listedStatus === "finalized" ? "finalized " : ""}mission (${listedMissions?.length})`}
                      </option>
                      {listedMissions?.map((m) => (
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
                    ? reviewConceptId
                      ? `Runs ${runSummary} against this concept run's output, judged against the mission's KPIs.`
                      : `Runs ${runSummary} against the selected spec.`
                    : "Picking a mission doesn't run a check yet -- Ask Bernoulli opens the report below."}
                </p>

                {!conceptMode && missionSpecBlock}

                {checkTriggered && selectedMission && (
                  <div className="hgr-ber-hub-report">
                    {/* Same title -> Requests & tokens -> details order as Bay 01/02. */}
                    <div className="hgr-ber-run-title">
                      <span className="hgr-ber-run-title-code">
                        {reviewResult?.sourceBay === "concept" && reviewResult.conceptCode
                          ? reviewResult.conceptCode
                          : selectedMission.missionCode}
                      </span>
                      <h3>
                        {(reviewResult?.sourceBay ?? (reviewConceptId ? "concept" : "mission")) === "concept"
                          ? "Concept Bernoulli report"
                          : "Mission Spec Bernoulli report"}
                      </h3>
                      {reviewResult && (
                        <span className="hgr-ber-run-title-date">
                          Reviewed {new Date(reviewResult.createdAt).toLocaleString()}
                        </span>
                      )}
                    </div>

                    {reviewStatus === "loading" && (
                      <p className="hgr-ber-hub-report-placeholder">
                        {reviewConceptId
                          ? `Running ${runSummary} -- the rule-based checks are instant, the TorqWings AI calls can take a few seconds…`
                          : `Running ${runSummary} -- the rule-based checks are instant, the TorqWings AI calls can take a few seconds…`}
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
                        <BernoulliUsageDetails review={reviewResult} />
                        <div className="hgr-ber-report-summary">
                          <span className={`hgr-ber-verdict hgr-ber-verdict-${reviewResult.verdict}`}>
                            {reviewResult.verdict}
                          </span>
                          <span className="hgr-ber-report-confidence">
                            {Math.round(reviewResult.confidenceScore * 100)}% confidence
                          </span>
                          <span className="hgr-ber-report-target">
                            {reviewResult.sourceBay === "concept"
                              ? `Reviewed: Bay 02 concept run${reviewResult.conceptCode ? ` ${reviewResult.conceptCode}` : ""}`
                              : "Reviewed: Bay 01 mission spec"}
                          </span>
                        </div>
                        <ul className="hgr-ber-check-list">
                          {reviewResult.checks.map((c) => (
                            <li key={c.ruleId} className="hgr-ber-check-row">
                              <span className="hgr-ber-check-rule">
                                {c.ruleId}
                                <span className="hgr-ber-check-rule-name">
                                  {c.ruleName ?? BERN_RULE_NAMES[c.ruleId] ?? ""}
                                </span>
                              </span>
                              <span className={`hgr-ber-check-badge hgr-ber-check-badge-${c.status}`}>
                                {c.status}
                              </span>
                              <span className="hgr-ber-check-message">
                                {c.message}
                                {c.sourceWasMock && (
                                  <span className="hgr-ber-check-mock"> -- via TorqWings AI (mock)</span>
                                )}
                              </span>
                              {c.reasoning && (
                                <span className="hgr-ber-check-reasoning">{c.reasoning}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}

                {conceptMode && conceptSpecBlock}
                {conceptMode && missionSpecBlock}

                {/* Check definitions sit below the report: reference
                    material, not something to read before every run. */}
                <div className="hgr-ber-rules-legend-title">What each check does</div>
                <ul className="hgr-ber-rules-legend">
                  {visibleRules.map((r) => (
                    <li key={r.id}>
                      <span className="hgr-ber-rules-legend-id">
                        {r.id}
                        {r.hardGate && <span className="hgr-ber-rules-legend-gate">HARD GATE</span>}
                        <span className={`hgr-ber-rules-legend-kind hgr-ber-rules-legend-kind-${r.kind}`}>
                          {r.kind === "llm" ? "TORQWINGS AI" : "RULE"}
                        </span>
                      </span>
                      <span className="hgr-ber-rules-legend-name">{r.name}</span>
                      <span className="hgr-ber-rules-legend-desc">{r.description}</span>
                    </li>
                  ))}
                </ul>
                  </>
                )}
              </div>

              <div className="hgr-ber-hub-col">
                {RIGHT_CALLERS.map((b) =>
                  search.source === b.key ? (
                    <Link
                      key={b.bay}
                      to={b.to}
                      className={`hgr-ber-caller-chip${activeSource === b.key ? " hgr-ber-caller-highlighted" : ""}`}
                      style={{ textDecoration: "none" }}
                      title={`Back to ${b.name}`}
                    >
                      <span className="hgr-ber-caller-bay">BAY {b.bay}</span>
                      <span className="hgr-ber-caller-name">{b.name}</span>
                    </Link>
                  ) : (
                    <button
                      key={b.bay}
                      type="button"
                      className={`hgr-ber-caller-chip hgr-ber-caller-clickable${activeSource === b.key ? " hgr-ber-caller-highlighted" : ""}`}
                      onClick={() => activateSource(b.key)}
                    >
                      <span className="hgr-ber-caller-bay">BAY {b.bay}</span>
                      <span className="hgr-ber-caller-name">{b.name}</span>
                    </button>
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
  /* Light theme matching /the-hangar/agents -- same token swap as Bay 01's
     page (see HGR_MISSION_CSS): white page, blue grid, light panels, dark
     text, amber-bright darkened since it's only used as text. */
  --hgr-ber-navy-deep:#FFFFFF; --hgr-ber-navy-panel:#F2F7FB;
  --hgr-ber-blue-line:#3E7CA6; --hgr-ber-blue-bright:#1C74B8;
  --hgr-ber-amber:#E8A33D; --hgr-ber-amber-bright:#B4690E;
  --hgr-ber-paper:#12222F; --hgr-ber-paper-dim:#4F6B80; --hgr-ber-ink:#0A1826;
  --hgr-ber-green:#2E8B57; --hgr-ber-red:#C0392B;
  --hgr-ber-grid:rgba(62,124,166,0.14); --hgr-ber-hairline:rgba(62,124,166,0.28);

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

.hgr-ber nav{ border-bottom:1px solid var(--hgr-ber-hairline); position:sticky; top:0; background:rgba(10,24,38,0.92); backdrop-filter:blur(10px); z-index:20;
  /* Dark nav strip on the light page, same as the agents page's nav. */
  color:var(--hgr-ber-paper);
  --hgr-ber-paper:#ECEFF3; --hgr-ber-paper-dim:#8FA5BB; --hgr-ber-blue-bright:#6FB4E0; --hgr-ber-hairline:rgba(111,180,224,0.22); }
.hgr-ber nav .hgr-ber-wrap{ display:flex; align-items:center; justify-content:space-between; height:68px; }
.hgr-ber-crumbs{ font-size:14px; color:var(--hgr-ber-paper-dim); display:flex; align-items:center; gap:8px; }
.hgr-ber-crumbs a{ text-decoration:none; color:var(--hgr-ber-paper-dim); }
.hgr-ber-crumbs a:hover{ color:var(--hgr-ber-blue-bright); }
.hgr-ber-sep{ color:var(--hgr-ber-blue-line); }
.hgr-ber-cur{ color:var(--hgr-ber-paper); font-weight:500; }
.hgr-ber-exit{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-ber-paper-dim); text-decoration:none; border:1px solid var(--hgr-ber-hairline); padding:8px 15px; border-radius:2px; }
.hgr-ber-exit:hover{ color:var(--hgr-ber-paper); border-color:var(--hgr-ber-blue-bright); }

.hgr-ber main{ padding-bottom:100px; }
.hgr-ber-hero{ padding:56px 0 20px; border-bottom:1px solid var(--hgr-ber-blue-line); position:relative; overflow:hidden; }
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
.hgr-ber-badge-bay{ color:var(--hgr-ber-paper); font-weight:700; border:1px solid var(--hgr-ber-blue-line); background:#E4EEF7; }
.hgr-ber-badge-ai{ font-weight:700; }
.hgr-ber-badge-ai-dot{ width:7px; height:7px; border-radius:50%; flex-shrink:0; }
.hgr-ber-badge-ai-checking{ color:var(--hgr-ber-paper); border:1px solid var(--hgr-ber-blue-line); background:#E4EEF7; }
.hgr-ber-badge-ai-checking .hgr-ber-badge-ai-dot{ background:var(--hgr-ber-paper-dim); }
.hgr-ber-badge-ai-live{ color:#166534; border:1px solid #16A34A; background:#DCFCE7; }
.hgr-ber-badge-ai-live .hgr-ber-badge-ai-dot{ background:#16A34A; box-shadow:0 0 6px rgba(22,163,74,.7); animation:hgr-ber-ai-pulse 2s ease-in-out infinite; }
.hgr-ber-badge-ai-offline{ color:var(--hgr-ber-amber-bright); border:1px solid var(--hgr-ber-amber); background:#FDF3E3; }
.hgr-ber-badge-ai-offline .hgr-ber-badge-ai-dot{ background:var(--hgr-ber-amber); box-shadow:0 0 6px rgba(232,163,61,.6); }
.hgr-ber-badge-ai-model{ display:inline-flex; align-items:center; gap:3px; margin-left:6px; padding-left:6px; border-left:1px solid rgba(22,101,52,.35); font-weight:600; }
.hgr-ber-badge-ai-model-fallback{ border-left-color:rgba(180,105,14,.4); color:var(--hgr-ber-amber-bright); }
@keyframes hgr-ber-ai-pulse{ 0%,100%{ opacity:1; } 50%{ opacity:.45; } }
.hgr-ber-telemetry{ display:flex; flex-wrap:wrap; gap:1px; margin-top:16px; background:var(--hgr-ber-hairline); border:1px solid var(--hgr-ber-hairline); }
.hgr-ber-telemetry-item{ flex:1 1 110px; background:var(--hgr-ber-navy-panel); padding:10px 12px; display:flex; flex-direction:column; gap:2px; }
.hgr-ber-telemetry-num{ font-family:'IBM Plex Mono',monospace; font-size:15px; color:var(--hgr-ber-paper); }
.hgr-ber-telemetry-label{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-ber-paper-dim); }
.hgr-ber-usage-table{ width:100%; margin-top:12px; border-collapse:collapse; font-size:12.5px; border:1px solid var(--hgr-ber-hairline); }
.hgr-ber-usage-table th{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-ber-paper-dim); font-weight:400; text-align:left; padding:8px 12px; border-bottom:1px solid var(--hgr-ber-hairline); }
.hgr-ber-usage-table td{ padding:8px 12px; border-bottom:1px solid var(--hgr-ber-hairline); color:var(--hgr-ber-paper); }
.hgr-ber-usage-table tfoot td{ font-weight:600; }
.hgr-ber-usage-num{ text-align:right !important; font-family:'IBM Plex Mono',monospace; }
.hgr-ber-usage-split{ font-size:11px; color:var(--hgr-ber-paper-dim); }
.hgr-ber-usage-provider{ margin-left:8px; font-family:'IBM Plex Mono',monospace; font-size:10px; color:#15803D; border:1px solid rgba(21,128,61,.35); padding:1px 5px; border-radius:2px; }
.hgr-ber-usage-mock{ margin-left:8px; font-family:'IBM Plex Mono',monospace; font-size:10px; color:var(--hgr-ber-amber); border:1px solid rgba(232,163,61,.4); padding:1px 5px; border-radius:2px; }
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
.hgr-ber-caller-clickable{
  cursor:pointer; font-family:inherit; text-align:left; color:inherit;
}

.hgr-ber-hub-center{
  flex:0 0 400px; display:flex; flex-direction:column; align-items:stretch; text-align:left;
  padding-top:12px; gap:10px;
}
@media(max-width:900px){ .hgr-ber-hub-center{ padding-top:0; flex:1; } }
.hgr-ber-hub-idle{
  flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:16px; padding:40px 0;
}
.hgr-ber-hub-idle-circle{
  width:120px; height:120px; border-radius:50%; display:flex; align-items:center; justify-content:center;
  background:#E4EEF7; border:1.5px dashed var(--hgr-ber-blue-bright);
  font-family:'IBM Plex Mono',monospace; font-size:12px; font-weight:700; letter-spacing:.06em;
  color:var(--hgr-ber-blue-bright); text-align:center;
}
.hgr-ber-hub-idle-hint{ color:var(--hgr-ber-paper-dim); font-size:12.5px; line-height:1.5; margin:0; text-align:center; }
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
.hgr-ber-btn-amber{ background:var(--hgr-ber-amber); color:var(--hgr-ber-ink); }
.hgr-ber-btn-amber:hover{ background:#F6C374; }
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

/* -- Report, opened by Ask Bernoulli -- runs BERN-M01-M06 for real -- */
.hgr-ber-hub-report{
  margin-top:16px; border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.06);
  border-radius:2px; padding:20px 22px;
}
.hgr-ber-hub-report-title{ font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:var(--hgr-ber-amber-bright); margin-bottom:10px; }
.hgr-ber-rules-legend-title{ margin-top:18px; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; font-weight:700; color:var(--hgr-ber-paper); }
.hgr-ber-run-title{ display:flex; align-items:baseline; flex-wrap:wrap; gap:4px 12px; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid var(--hgr-ber-blue-line); }
.hgr-ber-run-title-code{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; font-weight:700; letter-spacing:.04em; color:var(--hgr-ber-blue-bright); }
.hgr-ber-run-title h3{ font-size:18px; margin:0; color:var(--hgr-ber-paper); }
.hgr-ber-run-title-date{ flex-basis:100%; font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--hgr-ber-paper-dim); }
.hgr-ber-usage-details{ margin:0 0 14px; border:1px solid var(--hgr-ber-hairline); border-radius:2px; background:var(--hgr-ber-navy-panel); }
.hgr-ber-usage-details > summary{
  display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;
  padding:10px 14px; cursor:pointer; list-style:none;
  background:#E4EEF7; border-left:3px solid var(--hgr-ber-blue-bright);
}
.hgr-ber-usage-details > summary::-webkit-details-marker{ display:none; }
.hgr-ber-usage-details-label{ font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; font-weight:700; color:var(--hgr-ber-paper); }
.hgr-ber-usage-details-label::before{ content:"▸ "; }
.hgr-ber-usage-details[open] .hgr-ber-usage-details-label::before{ content:"▾ "; }
.hgr-ber-usage-details-totals{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-ber-paper-dim); }
.hgr-ber-usage-details .hgr-ber-telemetry{ margin:0; border:none; border-top:1px solid var(--hgr-ber-hairline); }
.hgr-ber-usage-details .hgr-ber-usage-table{ margin:0; border:none; border-top:1px solid var(--hgr-ber-hairline); }
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
.hgr-ber-report-target{ margin-left:auto; font-family:'IBM Plex Mono',monospace; font-size:11px; font-weight:700; letter-spacing:.04em; color:var(--hgr-ber-blue-bright); border:1px solid var(--hgr-ber-blue-line); background:#E4EEF7; padding:3px 9px; border-radius:2px; }

.hgr-ber-check-list{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:1px; background:var(--hgr-ber-hairline); border:1px solid var(--hgr-ber-hairline); }
.hgr-ber-check-row{ display:grid; grid-template-columns:140px 60px 1fr; gap:10px; align-items:start; background:var(--hgr-ber-navy-panel); padding:10px 12px; }
@media(max-width:900px){ .hgr-ber-check-row{ grid-template-columns:1fr; gap:4px; } }
.hgr-ber-check-rule{ font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--hgr-ber-blue-bright); }
.hgr-ber-check-rule-name{ display:block; font-family:'IBM Plex Sans',sans-serif; font-size:10.5px; color:var(--hgr-ber-paper-dim); margin-top:2px; }

/* -- Legend: what BERN-M01-M06 each check -- */
.hgr-ber-rules-legend{ list-style:none; margin:14px 0 0; padding:0; display:flex; flex-direction:column; gap:8px; }
.hgr-ber-rules-legend li{ display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; font-size:12px; line-height:1.5; }
.hgr-ber-rules-legend-id{ font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--hgr-ber-blue-bright); flex-shrink:0; display:inline-flex; align-items:center; gap:6px; }
.hgr-ber-rules-legend-kind{ font-family:'IBM Plex Mono',monospace; font-size:8.5px; letter-spacing:.05em; border-radius:2px; padding:1px 5px; margin-left:4px; }
.hgr-ber-rules-legend-kind-rule{ color:var(--hgr-ber-blue-bright); border:1px solid rgba(28,116,184,.35); }
.hgr-ber-rules-legend-kind-llm{ color:#6A4BC4; border:1px solid rgba(106,75,196,.4); }
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
.hgr-ber-check-reasoning{ grid-column:1 / -1; font-size:11.5px; color:var(--hgr-ber-paper-dim); line-height:1.5; border-top:1px dashed var(--hgr-ber-hairline); margin-top:6px; padding-top:6px; }

.hgr-ber-hub-select-error button{
  background:none; border:none; color:var(--hgr-ber-blue-bright); text-decoration:underline; cursor:pointer; font-size:13px; padding:0;
}
`;
