import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { MissionHubShell, MhCard, requireAdminGuard } from "@/components/mission-hub/Shell";
import { useMissionHubAuth } from "@/lib/mission-hub/context";
import { supabase } from "@/integrations/supabase/client";
import { describeInrCost, estimateCostUsd, formatCostInr } from "@/lib/the-hangar/missionUsage";

// Mission Hub -> Agents -> Bernoulli: the Bernoulli check registry
// (Hangar_BernoulliRules) per calling agent ("Bernoulli: Rule Editor UI and
// Review Flow", 29 Oct 2026). Mission and Concept share one editor; only the
// suggestions, the "This rule sees" list and the test picker change by bay.
// Reads/writes go through /api/hangar/bernoulli-rules and
// /api/hangar/bernoulli-rules-test (admin-checked server-side).
export const Route = createFileRoute("/mission-hub/agents/bernoulli")({
  component: BernoulliRulesPage,
});

// ---------------------------------------------------------------- types --
// Mirrors bernoulliRules.ts's BernoulliRuleDef -- duplicated across the
// client/server boundary, same convention as the Hangar pages.
type Category = "physics" | "regulatory" | "data_quality" | "consistency";
type Severity = "FAIL" | "WARN";
type Status = "PASS" | "WARN" | "FAIL" | "INFO";

interface RuleView {
  ruleId: string;
  bay: string;
  name: string;
  description: string;
  kind: "rule" | "llm";
  category: Category;
  hardGate: boolean;
  maxSeverity: Severity;
  enabled: boolean;
  builtin: boolean;
  instruction: string | null;
  sortOrder: number;
  version: number;
  updatedAt: string | null;
  updatedBy: string | null;
}

interface RegistryResponse {
  rules: RuleView[];
  fromRegistry: boolean;
  limits: { name: number; description: number; instruction: number };
  stats?: Record<string, Record<Status, number>>;
  reviews?: number;
  avgAiCostUsd?: number | null;
  avgAiSeconds?: number | null;
  editors?: Record<string, string>;
}

interface TestResult {
  result: {
    ruleId: string;
    status: Status;
    message: string;
    reasoning?: string;
    provider?: "anthropic" | "groq";
    sourceWasMock: boolean;
    capped?: boolean;
    targets?: string[];
  };
  usage: { requests: number; inputTokens: number; outputTokens: number; estimatedCostUsd: number };
  durationMs: number;
}

interface TargetOption {
  id: string;
  label: string;
}

// ---------------------------------------------------------------- static --
const AGENTS: { num: string; name: string; bay: string; wired: boolean }[] = [
  { num: "01", name: "Mission", bay: "mission", wired: true },
  { num: "02", name: "Concept", bay: "concept", wired: true },
  { num: "03", name: "Vehicle Design", bay: "aircraft-design", wired: false },
  { num: "04", name: "CAD", bay: "cad", wired: false },
  { num: "05", name: "Flight Dynamics", bay: "simulation", wired: false },
  { num: "06", name: "CFD", bay: "cfd", wired: false },
  { num: "07", name: "Structural", bay: "structural", wired: false },
  { num: "08", name: "Optimization", bay: "optimization", wired: false },
  { num: "09", name: "Validation", bay: "validation", wired: false },
  { num: "10", name: "Materials", bay: "materials", wired: false },
  { num: "11", name: "Manufacturing", bay: "manufacturing", wired: false },
  { num: "12", name: "Certification", bay: "certification", wired: false },
  { num: "13", name: "Documentation", bay: "documentation", wired: false },
  { num: "14", name: "Bernoulli", bay: "bernoulli", wired: false },
  { num: "15", name: "Knowledge", bay: "knowledge", wired: false },
];

const CATEGORY_LABEL: Record<Category, string> = {
  physics: "Physics & performance",
  regulatory: "Regulatory & safety",
  data_quality: "Data quality",
  consistency: "Consistency",
};
const CATEGORY_ORDER: Category[] = ["physics", "regulatory", "data_quality", "consistency"];

// What a custom rule's prompt is given, per bay (bernoulliChecks.ts's
// describeMissionInput / describeConceptInput + earlier findings).
const RULE_SEES: Record<string, string[]> = {
  mission: [
    "Vehicle class, mission type, domain / vertical, phase, operating environment",
    "Every KPI (name, target, unit)",
    "Every constraint (name, value)",
    "Findings of the checks that ran before it",
  ],
  concept: [
    "Vehicle class, mission type, domain / vertical, phase, operating environment of the source mission",
    "Every KPI and constraint of the source mission",
    "The ranked concepts: name, vehicle class, description, trade-off verdict and fit score",
    "Findings of the checks that ran before it",
  ],
};

interface Suggestion {
  name: string;
  description: string;
  category: Category;
  instruction: string;
}

const SUGGESTIONS: Record<string, Suggestion[]> = {
  mission: [
    {
      name: "Summary faithfulness",
      description: "Does the summary match the KPIs and constraints it describes?",
      category: "consistency",
      instruction:
        "Compare the mission's KPIs and constraints with what a summary of this mission would have to say. FAIL if any KPI or constraint contradicts another one in a way a summary couldn't reconcile (for example two different payload targets); WARN if a critical KPI such as payload, range or endurance is missing entirely.",
    },
    {
      name: "Small-UAS regulatory fit",
      description: "Do the KPIs respect FAR Part 107-style limits when the spec cites them?",
      category: "regulatory",
      instruction:
        "If the constraints cite FAR Part 107 or a similar small-UAS regulation, check the KPIs against it: maximum altitude 400 ft AGL, visual line of sight, maximum ground speed about 100 mph (161 km/h), takeoff weight under 25 kg. FAIL if a KPI clearly breaks a cited limit; WARN if the range implies flying beyond visual line of sight. INFO if no such regulation is cited.",
    },
    {
      name: "Wind tolerance",
      description: "Can the vehicle hold its mission in the operating environment's typical winds?",
      category: "physics",
      instruction:
        "Given the vehicle class, payload and operating environment, check whether typical sustained winds and gusts for that environment would exceed what this vehicle class can hold station or track in. FAIL if clearly beyond, WARN if marginal, INFO if no operating environment is given.",
    },
    {
      name: "Cost realism",
      description: "Is the cost target plausible for this vehicle class, payload and endurance?",
      category: "consistency",
      instruction:
        "Check whether the cost KPI is plausible for a vehicle of this class carrying this payload for this endurance, using typical market price ranges for comparable UAS. WARN if it's well outside the typical range in either direction; FAIL only if it's off by an order of magnitude. INFO if there's no cost KPI.",
    },
    {
      name: "Missing critical KPIs",
      description: "Does the spec carry the KPIs this mission type needs?",
      category: "data_quality",
      instruction:
        "For this mission type, check that the spec carries the KPIs needed to design the vehicle: payload, range, endurance, and a speed or altitude KPI where the mission depends on it. WARN listing each missing one; PASS if none is missing.",
    },
  ],
  concept: [
    {
      name: "Top concept meets critical KPIs",
      description: "Does the top-ranked concept meet every critical KPI, not just most of them?",
      category: "physics",
      instruction:
        "For the top-ranked concept only, check each critical KPI of the source mission (payload, range, endurance, and any KPI marked critical) against what that concept's vehicle class and description can deliver. FAIL if it clearly misses one; WARN if one is marginal.",
    },
    {
      name: "Concept diversity",
      description: "Are the candidates genuinely different options, or near-duplicates?",
      category: "consistency",
      instruction:
        "Check whether the candidate concepts are meaningfully different configurations (vehicle class, propulsion, layout) or near-duplicates of each other. WARN if two or more are essentially the same design, naming them.",
    },
    {
      name: "Regulatory fit of the top concept",
      description: "Does the top concept stay inside the regulations the mission cites?",
      category: "regulatory",
      instruction:
        "If the source mission's constraints cite a regulation (for example FAR Part 107), check whether the top-ranked concept's vehicle class and implied size, speed and operating mode can comply. FAIL if it clearly can't; INFO if no regulation is cited.",
    },
    {
      name: "Rationale matches the ranking",
      description: "Do the trade-off notes actually support the order the concepts are ranked in?",
      category: "consistency",
      instruction:
        "Read each concept's trade-off verdict and fit score and check that the ranking order follows from them. WARN if a lower-ranked concept is described more favourably than a higher-ranked one, naming both.",
    },
    {
      name: "Payload integration feasibility",
      description: "Can each concept physically mount and power the mission's payload?",
      category: "physics",
      instruction:
        "For each concept, check whether its vehicle class and described layout can mount, power and (where relevant) stabilise the mission's payload, given the payload KPI and mission type. WARN for marginal cases, FAIL if a top-ranked concept clearly can't.",
    },
  ],
};

const STATUS_GUIDE: [Status, string][] = [
  ["PASS", "fine"],
  ["WARN", "doubtful, review it"],
  ["FAIL", "clearly wrong"],
  ["INFO", "not applicable or not enough data"],
];

// Used for the header estimate until a bay has review history.
const FALLBACK_AI_CALL = { inputTokens: 1800, outputTokens: 450, seconds: 5 };

// --------------------------------------------------------------- helpers --
async function authedFetch(url: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your session has expired -- sign in again.");
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? `Request failed (HTTP ${res.status}).`);
  return json;
}

function formatDay(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function statsLabel(s: Record<Status, number> | undefined): string {
  if (!s) return "—";
  const parts = (["FAIL", "WARN", "PASS", "INFO"] as Status[]).filter((k) => s[k] > 0).map((k) => `${s[k]} ${k}`);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

// ------------------------------------------------------------------ page --
type Filter = "all" | "rule" | "llm" | "gate" | "disabled";

const EMPTY_FORM = {
  name: "",
  description: "",
  category: "physics" as Category,
  instruction: "",
  maxSeverity: "WARN" as Severity,
  hardGate: false,
  enableAfterSaving: false,
};

function BernoulliRulesPage() {
  const { profile, loading } = useMissionHubAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && profile) requireAdminGuard(profile.role, navigate);
  }, [loading, profile, navigate]);

  const [agentBay, setAgentBay] = useState("mission");
  const agent = AGENTS.find((a) => a.bay === agentBay)!;
  const [data, setData] = useState<RegistryResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [busyRule, setBusyRule] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RuleView | null>(null);
  const [testingRule, setTestingRule] = useState<RuleView | null>(null);
  const [targets, setTargets] = useState<Record<string, TargetOption[] | null>>({});

  async function loadRules(bay: string) {
    setStatus("loading");
    try {
      setData(await authedFetch(`/api/hangar/bernoulli-rules?bay=${encodeURIComponent(bay)}&stats=1`));
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  // Missions / concepts to test against -- the admin's own, Spec Ready or
  // finalized missions, and Concept Ready (or finalized) concepts.
  async function loadTargets(bay: string) {
    if (targets[bay] !== undefined) return;
    setTargets((t) => ({ ...t, [bay]: null }));
    try {
      if (bay === "mission") {
        const list = (await authedFetch("/api/hangar/missions")) as {
          missionId: string;
          missionCode: string;
          status: string;
          missionSpecs: { missionType?: string } | null;
        }[];
        setTargets((t) => ({
          ...t,
          mission: list
            .filter((m) => m.missionSpecs && (m.status === "spec_ready" || m.status === "finalized"))
            .map((m) => ({
              id: m.missionId,
              label: `${m.missionCode} -- ${m.missionSpecs?.missionType ?? "mission"} (${m.status === "finalized" ? "finalized" : "Spec Ready"})`,
            })),
        }));
      } else {
        const list = (await authedFetch("/api/hangar/concepts")) as {
          conceptId: string;
          conceptCode: string;
          status: string;
          rankedConcepts: { conceptName: string }[] | null;
        }[];
        setTargets((t) => ({
          ...t,
          concept: list
            .filter((c) => c.rankedConcepts && c.rankedConcepts.length > 0 && (c.status === "spec_ready" || c.status === "finalized"))
            .map((c) => ({
              id: c.conceptId,
              label: `${c.conceptCode} -- ${c.rankedConcepts?.[0]?.conceptName ?? "concept"} (${c.status === "finalized" ? "finalized" : "Concept Ready"})`,
            })),
        }));
      }
    } catch {
      setTargets((t) => ({ ...t, [bay]: [] }));
    }
  }

  useEffect(() => {
    setData(null);
    setFormOpen(false);
    setEditing(null);
    setTestingRule(null);
    setFilter("all");
    if (agent.wired && profile) {
      loadRules(agent.bay);
      loadTargets(agent.bay);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentBay, profile?.id]);

  async function patchRule(rule: RuleView, patch: Partial<RuleView>) {
    setBusyRule(rule.ruleId);
    try {
      const updated: RuleView = await authedFetch("/api/hangar/bernoulli-rules", {
        method: "PATCH",
        body: JSON.stringify({ ruleId: rule.ruleId, ...patch }),
      });
      setData((d) => (d ? { ...d, rules: d.rules.map((r) => (r.ruleId === updated.ruleId ? updated : r)) } : d));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update the rule.");
    } finally {
      setBusyRule(null);
    }
  }

  async function deleteRule(rule: RuleView) {
    if (!window.confirm(`Delete ${rule.ruleId} "${rule.name}"? Past reports keep their results.`)) return;
    setBusyRule(rule.ruleId);
    try {
      await authedFetch(`/api/hangar/bernoulli-rules?ruleId=${encodeURIComponent(rule.ruleId)}`, { method: "DELETE" });
      setData((d) => (d ? { ...d, rules: d.rules.filter((r) => r.ruleId !== rule.ruleId) } : d));
      toast.success(`Deleted ${rule.ruleId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete the rule.");
    } finally {
      setBusyRule(null);
    }
  }

  const rules = data?.rules ?? [];
  const canEdit = data?.fromRegistry ?? false;

  // Header estimate: AI calls per review, cost and time. Custom rules run in
  // parallel, so they add about one AI call's worth of time, not one each.
  const enabled = rules.filter((r) => r.enabled);
  const builtinAi = enabled.filter((r) => r.builtin && r.kind === "llm").length;
  const customAi = enabled.filter((r) => !r.builtin).length;
  const aiCalls = builtinAi + customAi;
  const perCallUsd =
    data?.avgAiCostUsd ?? estimateCostUsd(FALLBACK_AI_CALL.inputTokens, FALLBACK_AI_CALL.outputTokens);
  const perCallSec = data?.avgAiSeconds ?? FALLBACK_AI_CALL.seconds;
  const reviewUsd = aiCalls * perCallUsd;
  const reviewSec = Math.max(1, Math.round((builtinAi + (customAi > 0 ? 1 : 0)) * perCallSec));

  const visible = rules.filter((r) =>
    filter === "all"
      ? true
      : filter === "rule"
        ? r.kind === "rule"
        : filter === "llm"
          ? r.kind === "llm"
          : filter === "gate"
            ? r.hardGate
            : !r.enabled,
  );
  const grouped = CATEGORY_ORDER.map((cat) => ({ cat, rules: visible.filter((r) => r.category === cat) })).filter(
    (g) => g.rules.length > 0,
  );

  return (
    <MissionHubShell title="Bernoulli checks">
      <style>{BR_CSS}</style>
      <div className="br">
        <p className="br-lead">
          The checks Bernoulli runs when it's called from each agent. Every review reads this list when it runs, so
          a change here takes effect on the next Ask Bernoulli.
        </p>

        <div className="br-agents" role="tablist" aria-label="Agents">
          {AGENTS.map((a) => (
            <button
              key={a.bay}
              type="button"
              role="tab"
              aria-selected={a.bay === agentBay}
              className={`br-agent${a.bay === agentBay ? " br-agent-active" : ""}${a.wired ? "" : " br-agent-off"}`}
              onClick={() => setAgentBay(a.bay)}
              title={a.wired ? `Bernoulli checks for ${a.name}` : `Bernoulli isn't wired into ${a.name} yet`}
            >
              <span className="br-agent-num">{a.num}</span>
              {a.name}
              {a.wired && <span className="br-agent-dot" aria-hidden="true" />}
            </button>
          ))}
        </div>

        <MhCard className="br-card">
          <div className="br-card-head">
            <div>
              <div className="br-kicker">Bay {agent.num}</div>
              <h2 className="br-title">{agent.name} Agent -- Bernoulli checks</h2>
            </div>
            {agent.wired && data && (
              <div className="br-counts" title={`${describeInrCost(reviewUsd)}. Averages from the last ${data.reviews ?? 0} reviews.`}>
                {enabled.length} enabled · {aiCalls} TorqWings AI call{aiCalls === 1 ? "" : "s"} · ≈ {formatCostInr(reviewUsd)} · ~
                {reviewSec} s per review
              </div>
            )}
          </div>

          {!agent.wired ? (
            <p className="br-empty">
              Bernoulli isn't wired into the {agent.name} Agent yet, so it has no checks to manage here. Its checks will
              appear on this tab once Bernoulli reviews that agent's output.
            </p>
          ) : status === "loading" || (!data && status !== "error") ? (
            <p className="br-empty">Loading checks…</p>
          ) : status === "error" || !data ? (
            <p className="br-empty">
              Couldn't load the checks.{" "}
              <button type="button" className="br-link" onClick={() => loadRules(agent.bay)}>
                Retry
              </button>
            </p>
          ) : (
            <>
              {!data.fromRegistry && (
                <div className="br-warn">
                  Showing the built-in defaults -- the rules table isn't set up yet. Run the Bernoulli rules migrations
                  in the Supabase SQL editor to start managing checks here.
                </div>
              )}

              <div className="br-filters" role="group" aria-label="Filter checks">
                {(
                  [
                    ["all", "All"],
                    ["rule", "Rule-based"],
                    ["llm", "TorqWings AI"],
                    ["gate", "Hard gates"],
                    ["disabled", "Disabled"],
                  ] as [Filter, string][]
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    className={`br-chip${filter === k ? " br-chip-on" : ""}`}
                    onClick={() => setFilter(k)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="br-table-wrap">
                <table className="br-table">
                  <thead>
                    <tr>
                      <th>Check</th>
                      <th>What it checks</th>
                      <th>Type</th>
                      <th className="br-center">Max result</th>
                      <th className="br-center">Hard gate</th>
                      <th className="br-center">Enabled</th>
                      <th>Last {data.reviews ? Math.min(30, data.reviews) : 30} reviews</th>
                      <th>Updated</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {grouped.length === 0 && (
                      <tr>
                        <td colSpan={9} className="br-none">
                          No checks match this filter.
                        </td>
                      </tr>
                    )}
                    {grouped.map((g) => (
                      <CategoryRows
                        key={g.cat}
                        category={g.cat}
                        rules={g.rules}
                        stats={data.stats}
                        editors={data.editors ?? {}}
                        canEdit={canEdit}
                        busyRule={busyRule}
                        onPatch={patchRule}
                        onEdit={(r) => {
                          setEditing(r);
                          setFormOpen(true);
                          setTestingRule(null);
                        }}
                        onDelete={deleteRule}
                        onTest={(r) => {
                          setTestingRule(r);
                          setFormOpen(false);
                          setEditing(null);
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="br-note">
                <b>Hard gate</b>: a FAIL on this check fails the whole review. <b>Max result</b>: the worst result a
                check can give -- a "WARN only" rule can never fail a review. Built-in checks run fixed code, so only
                their hard gate and enabled switches change.
              </p>

              {testingRule && (
                <TestPanel
                  bay={agent.bay}
                  title={`Test ${testingRule.ruleId} ${testingRule.name}`}
                  rule={{ ruleId: testingRule.ruleId }}
                  targets={targets[agent.bay] ?? null}
                  onClose={() => setTestingRule(null)}
                />
              )}

              {canEdit && !formOpen && (
                <button
                  type="button"
                  className="br-btn"
                  onClick={() => {
                    setEditing(null);
                    setTestingRule(null);
                    setFormOpen(true);
                  }}
                >
                  + Add a rule
                </button>
              )}

              {canEdit && formOpen && (
                <RuleForm
                  key={editing?.ruleId ?? "new"}
                  bay={agent.bay}
                  agentName={agent.name}
                  rules={rules}
                  editing={editing}
                  editors={data.editors ?? {}}
                  limits={data.limits}
                  targets={targets[agent.bay] ?? null}
                  onCancel={() => {
                    setFormOpen(false);
                    setEditing(null);
                  }}
                  onSaved={(saved, isNew) => {
                    setData((d) =>
                      d
                        ? {
                            ...d,
                            rules: isNew ? [...d.rules, saved] : d.rules.map((r) => (r.ruleId === saved.ruleId ? saved : r)),
                          }
                        : d,
                    );
                    setFormOpen(false);
                    setEditing(null);
                  }}
                />
              )}
            </>
          )}
        </MhCard>
      </div>
    </MissionHubShell>
  );
}

// ----------------------------------------------------------------- table --
function CategoryRows({
  category,
  rules,
  stats,
  editors,
  canEdit,
  busyRule,
  onPatch,
  onEdit,
  onDelete,
  onTest,
}: {
  category: Category;
  rules: RuleView[];
  stats: RegistryResponse["stats"];
  editors: Record<string, string>;
  canEdit: boolean;
  busyRule: string | null;
  onPatch: (r: RuleView, p: Partial<RuleView>) => void;
  onEdit: (r: RuleView) => void;
  onDelete: (r: RuleView) => void;
  onTest: (r: RuleView) => void;
}) {
  return (
    <>
      <tr className="br-group">
        <td colSpan={9}>
          {CATEGORY_LABEL[category]} <span>({rules.length})</span>
        </td>
      </tr>
      {rules.map((r) => {
        const busy = busyRule === r.ruleId;
        return (
          <tr key={r.ruleId} className={r.enabled ? undefined : "br-row-off"}>
            <td className="br-id">
              {r.ruleId}
              <span className="br-source">{r.builtin ? "built-in" : "custom"}</span>
            </td>
            <td>
              <div className="br-name">{r.name}</div>
              {r.description && <div className="br-desc">{r.description}</div>}
              {!r.builtin && r.instruction && <div className="br-instruction">“{r.instruction}”</div>}
            </td>
            <td>
              <span className={`br-type br-type-${r.kind}`}>{r.kind === "llm" ? "TorqWings AI" : "Rule-based"}</span>
            </td>
            <td className="br-center">
              <span className={`br-sev br-sev-${r.maxSeverity}`}>{r.maxSeverity === "WARN" ? "WARN only" : "FAIL"}</span>
            </td>
            <td className="br-center">
              <input
                type="checkbox"
                checked={r.hardGate}
                disabled={!canEdit || busy || r.maxSeverity === "WARN"}
                onChange={(e) => onPatch(r, { hardGate: e.target.checked })}
                aria-label={`Hard gate for ${r.ruleId}`}
                title={r.maxSeverity === "WARN" ? "A WARN-only rule can't fail a review, so it can't be a hard gate" : undefined}
              />
            </td>
            <td className="br-center">
              <input
                type="checkbox"
                checked={r.enabled}
                disabled={!canEdit || busy}
                onChange={(e) => onPatch(r, { enabled: e.target.checked })}
                aria-label={`Enable ${r.ruleId}`}
              />
            </td>
            <td className="br-stats">{statsLabel(stats?.[r.ruleId])}</td>
            <td className="br-updated">
              {r.builtin ? "—" : (
                <>
                  v{r.version}
                  <span>{formatDay(r.updatedAt)}</span>
                  {r.updatedBy && editors[r.updatedBy] && <span>{editors[r.updatedBy]}</span>}
                </>
              )}
            </td>
            <td className="br-actions">
              {r.kind === "llm" && (
                <button type="button" className="br-link" onClick={() => onTest(r)} disabled={busy}>
                  Test
                </button>
              )}
              {!r.builtin && canEdit && (
                <>
                  <button type="button" className="br-link" onClick={() => onEdit(r)} disabled={busy}>
                    Edit
                  </button>
                  <button type="button" className="br-link br-link-danger" onClick={() => onDelete(r)} disabled={busy}>
                    Delete
                  </button>
                </>
              )}
            </td>
          </tr>
        );
      })}
    </>
  );
}

// ------------------------------------------------------------ test panel --
function TestPanel({
  bay,
  title,
  rule,
  targets,
  onClose,
  onTested,
}: {
  bay: string;
  title?: string;
  rule: { ruleId: string } | { draft: Record<string, unknown> };
  targets: TargetOption[] | null;
  onClose?: () => void;
  onTested?: () => void;
}) {
  const [targetId, setTargetId] = useState("");
  const [running, setRunning] = useState(false);
  const [out, setOut] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    setOut(null);
    try {
      const json: TestResult = await authedFetch("/api/hangar/bernoulli-rules-test", {
        method: "POST",
        body: JSON.stringify({
          bay,
          ...rule,
          ...(bay === "concept" ? { conceptId: targetId } : { missionId: targetId }),
        }),
      });
      setOut(json);
      onTested?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The test couldn't run.");
    } finally {
      setRunning(false);
    }
  }

  const noun = bay === "concept" ? "concept" : "mission";
  return (
    <div className="br-test">
      {title && (
        <div className="br-test-head">
          <span>{title}</span>
          {onClose && (
            <button type="button" className="br-link" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      )}
      <div className="br-test-row">
        <label>
          Test on
          <select value={targetId} onChange={(e) => setTargetId(e.target.value)} disabled={targets === null || running}>
            <option value="">
              {targets === null
                ? `Loading your ${noun}s…`
                : targets.length === 0
                  ? `No ${bay === "concept" ? "Concept Ready" : "Spec Ready or finalized"} ${noun}s yet`
                  : `Pick a ${noun}`}
            </option>
            {targets?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="br-btn br-btn-test" disabled={!targetId || running} onClick={run}>
          {running ? "Running…" : "Run test"}
        </button>
      </div>
      <p className="br-test-hint">Runs only this rule, once. Nothing is saved and no review is created.</p>
      {error && <div className="br-test-error">{error}</div>}
      {out && (
        <div className="br-test-result">
          <div className="br-test-summary">
            <span className={`br-status br-status-${out.result.status}`}>{out.result.status}</span>
            {out.result.capped && <span className="br-tag">capped from FAIL</span>}
            {out.result.sourceWasMock && <span className="br-tag br-tag-warn">simulated -- no live AI reply</span>}
            <span className="br-test-meta">
              {out.result.provider ? (out.result.provider === "groq" ? "Groq" : "Claude") : "no provider"} ·{" "}
              {(out.usage.inputTokens + out.usage.outputTokens).toLocaleString()} tokens ·{" "}
              <span title={describeInrCost(out.usage.estimatedCostUsd)}>~{formatCostInr(out.usage.estimatedCostUsd)}</span> ·{" "}
              {(out.durationMs / 1000).toFixed(1)} s
            </span>
          </div>
          <div className="br-test-message">{out.result.message}</div>
          {out.result.reasoning && <div className="br-test-reasoning">{out.result.reasoning}</div>}
          {out.result.targets && out.result.targets.length > 0 && (
            <div className="br-test-targets">About: {out.result.targets.map((t) => t.replace(/^(\w+):/, "$1 ")).join(" · ")}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ form --
function RuleForm({
  bay,
  agentName,
  rules,
  editing,
  editors,
  limits,
  targets,
  onCancel,
  onSaved,
}: {
  bay: string;
  agentName: string;
  rules: RuleView[];
  editing: RuleView | null;
  editors: Record<string, string>;
  limits: RegistryResponse["limits"];
  targets: TargetOption[] | null;
  onCancel: () => void;
  onSaved: (rule: RuleView, isNew: boolean) => void;
}) {
  const [form, setForm] = useState(() =>
    editing
      ? {
          name: editing.name,
          description: editing.description,
          category: editing.category,
          instruction: editing.instruction ?? "",
          maxSeverity: editing.maxSeverity,
          hardGate: editing.hardGate,
          enableAfterSaving: editing.enabled,
        }
      : EMPTY_FORM,
  );
  const [tested, setTested] = useState(false);
  const [saving, setSaving] = useState(false);

  // Any change to what the AI is asked invalidates an earlier test.
  function update(patch: Partial<typeof form>) {
    setForm((f) => {
      const next = { ...f, ...patch };
      if (next.maxSeverity === "WARN") next.hardGate = false;
      return next;
    });
    if (
      patch.name !== undefined ||
      patch.instruction !== undefined ||
      patch.maxSeverity !== undefined ||
      patch.category !== undefined
    ) {
      setTested(false);
    }
  }

  const takenNames = useMemo(
    () => new Set(rules.filter((r) => r.ruleId !== editing?.ruleId).map((r) => r.name.trim().toLowerCase())),
    [rules, editing],
  );
  const duplicate = form.name.trim() !== "" && takenNames.has(form.name.trim().toLowerCase());
  const suggestions = SUGGESTIONS[bay] ?? [];

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (duplicate) return;
    if (!tested && !window.confirm("You haven't run a test on this rule. Save without testing?")) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        category: form.category,
        instruction: form.instruction,
        maxSeverity: form.maxSeverity,
        hardGate: form.hardGate,
      };
      if (editing) {
        const saved: RuleView = await authedFetch("/api/hangar/bernoulli-rules", {
          method: "PATCH",
          body: JSON.stringify({ ruleId: editing.ruleId, ...payload, enabled: form.enableAfterSaving }),
        });
        toast.success(`Updated ${saved.ruleId} (v${saved.version})`);
        onSaved(saved, false);
      } else {
        const saved: RuleView = await authedFetch("/api/hangar/bernoulli-rules", {
          method: "POST",
          body: JSON.stringify({ bay, ...payload, enabled: form.enableAfterSaving }),
        });
        toast.success(`Added ${saved.ruleId}${saved.enabled ? "" : " -- disabled until you enable it"}`);
        onSaved(saved, true);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the rule.");
    } finally {
      setSaving(false);
    }
  }

  const counter = (n: number, max: number) => (
    <span className={`br-counter${n > max ? " br-counter-over" : ""}`}>
      {n} / {max}
    </span>
  );

  return (
    <form className="br-form" onSubmit={submit}>
      <div className="br-form-title">
        {editing ? `Edit ${editing.ruleId}` : `New TorqWings AI rule for the ${agentName} Agent`}
      </div>
      {editing && (
        <p className="br-form-version">
          v{editing.version}
          {editing.updatedAt ? ` · edited ${formatDay(editing.updatedAt)}` : ""}
          {editing.updatedBy && editors[editing.updatedBy] ? ` by ${editors[editing.updatedBy]}` : ""} · Changes apply
          to future reviews only.
        </p>
      )}

      {!editing && (
        <label>
          Start from a suggestion
          <select
            value=""
            onChange={(e) => {
              const s = suggestions.find((x) => x.name === e.target.value);
              if (s) update({ name: s.name, description: s.description, category: s.category, instruction: s.instruction });
            }}
          >
            <option value="">Pick a suggested rule (optional)</option>
            {suggestions.map((s) => {
              const added = takenNames.has(s.name.toLowerCase());
              return (
                <option key={s.name} value={s.name} disabled={added}>
                  {s.name}
                  {added ? " (already added)" : ""}
                </option>
              );
            })}
          </select>
        </label>
      )}

      <label>
        <span className="br-label-row">
          Name {counter(form.name.length, limits.name)}
        </span>
        <input
          value={form.name}
          maxLength={limits.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="e.g. Wind tolerance"
          required
        />
        {duplicate && <span className="br-field-error">A rule with this name already exists for this agent.</span>}
      </label>

      <label>
        <span className="br-label-row">
          Short description {counter(form.description.length, limits.description)}
        </span>
        <input
          value={form.description}
          maxLength={limits.description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="Shown in the check list"
        />
      </label>

      <label>
        Category
        <select value={form.category} onChange={(e) => update({ category: e.target.value as Category })}>
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="br-label-row">
          What TorqWings AI should check {counter(form.instruction.length, limits.instruction)}
        </span>
        <textarea
          value={form.instruction}
          maxLength={limits.instruction}
          rows={5}
          onChange={(e) => update({ instruction: e.target.value })}
          placeholder="Say what to check, and when it's a FAIL, a WARN, or not applicable."
          required
        />
      </label>

      <div className="br-form-grid">
        <div className="br-sees">
          <div className="br-sees-title">This rule sees</div>
          <ul>
            {(RULE_SEES[bay] ?? []).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <div className="br-sees-foot">It can't look up other data, such as other missions.</div>
        </div>
        <div className="br-guide">
          <div className="br-sees-title">Status guide</div>
          <ul>
            {STATUS_GUIDE.map(([s, text]) => (
              <li key={s}>
                <span className={`br-status br-status-${s}`}>{s}</span> {text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <fieldset className="br-sev-pick">
        <legend>Most severe result</legend>
        <label className="br-radio">
          <input type="radio" checked={form.maxSeverity === "FAIL"} onChange={() => update({ maxSeverity: "FAIL" })} />
          FAIL -- the rule can fail the review's checks
        </label>
        <label className="br-radio">
          <input type="radio" checked={form.maxSeverity === "WARN"} onChange={() => update({ maxSeverity: "WARN" })} />
          WARN only -- never fails a review even if the AI says FAIL (safer default for new AI rules)
        </label>
      </fieldset>

      <label className="br-check">
        <input
          type="checkbox"
          checked={form.hardGate}
          disabled={form.maxSeverity === "WARN"}
          onChange={(e) => update({ hardGate: e.target.checked })}
        />
        Hard gate
        {form.maxSeverity === "WARN" && <span className="br-check-note">(not available for WARN-only rules)</span>}
      </label>
      {form.hardGate && (
        <div className="br-gate-warn">TorqWings AI can be wrong; a FAIL here fails the whole review.</div>
      )}

      <label className="br-check">
        <input
          type="checkbox"
          checked={form.enableAfterSaving}
          onChange={(e) => update({ enableAfterSaving: e.target.checked })}
        />
        {editing ? "Enabled" : "Enable after saving"}
        {!editing && <span className="br-check-note">(off by default, so you can save and test before it affects real reviews)</span>}
      </label>

      <TestPanel
        bay={bay}
        rule={{
          draft: {
            name: form.name,
            description: form.description,
            category: form.category,
            instruction: form.instruction,
            maxSeverity: form.maxSeverity,
            hardGate: form.hardGate,
          },
        }}
        targets={targets}
        onTested={() => setTested(true)}
      />

      <div className="br-form-actions">
        <button type="submit" className="br-btn" disabled={saving || duplicate}>
          {saving ? "Saving…" : editing ? "Save changes" : "Add rule"}
        </button>
        <button type="button" className="br-btn br-btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        {tested && <span className="br-tested">✓ tested</span>}
      </div>
    </form>
  );
}

const BR_CSS = `
.br{ display:flex; flex-direction:column; gap:16px; }
.br-lead{ margin:0; font-size:13.5px; color:var(--mh-dim); max-width:760px; line-height:1.6; }
.br-agents{ display:flex; flex-wrap:wrap; gap:6px; }
.br-agent{ display:inline-flex; align-items:center; gap:6px; padding:7px 12px; font-size:12.5px; font-weight:600; color:var(--mh-paper); background:var(--mh-bg); border:1px solid var(--mh-hairline); border-radius:6px; cursor:pointer; }
.br-agent:hover{ border-color:var(--mh-blue); }
.br-agent-num{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; color:var(--mh-dim); }
.br-agent-off{ color:var(--mh-dim); font-weight:500; }
.br-agent-active{ background:var(--mh-blue); border-color:var(--mh-blue); color:#FFFFFF; }
.br-agent-active .br-agent-num{ color:rgba(255,255,255,.8); }
.br-agent-dot{ width:6px; height:6px; border-radius:50%; background:#16A34A; }
.br-card{ padding:20px 22px; }
.br-card-head{ display:flex; align-items:flex-end; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:14px; padding-bottom:12px; border-bottom:1px solid var(--mh-blue-line); }
.br-kicker{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--mh-dim); }
.br-title{ margin:2px 0 0; font-family:'Space Grotesk',sans-serif; font-size:19px; font-weight:600; color:var(--mh-ink); }
.br-counts{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; font-weight:600; color:var(--mh-paper); background:#E4EEF7; padding:5px 10px; border-radius:4px; }
.br-empty{ margin:0; font-size:13px; color:var(--mh-dim); line-height:1.6; }
.br-warn{ margin-bottom:14px; padding:10px 14px; font-size:12.5px; line-height:1.6; color:#8A5A12; background:#FDF3E3; border-left:3px solid var(--mh-amber); border-radius:4px; }
.br-filters{ display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px; }
.br-chip{ padding:5px 12px; font-size:12px; font-weight:600; color:var(--mh-dim); background:var(--mh-bg); border:1px solid var(--mh-hairline); border-radius:999px; cursor:pointer; }
.br-chip-on{ color:#FFFFFF; background:var(--mh-ink); border-color:var(--mh-ink); }
.br-table-wrap{ overflow-x:auto; }
.br-table{ width:100%; border-collapse:collapse; font-size:13px; min-width:980px; }
.br-table th{ text-align:left; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; font-weight:600; color:var(--mh-dim); padding:8px 10px; border-bottom:1px solid var(--mh-hairline); background:var(--mh-panel); white-space:nowrap; }
.br-table td{ padding:10px; border-bottom:1px solid var(--mh-hairline); vertical-align:top; color:var(--mh-paper); }
.br-group td{ padding:8px 10px; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.06em; text-transform:uppercase; font-weight:700; color:var(--mh-ink); background:#E4EEF7; border-left:3px solid var(--mh-blue); }
.br-group td span{ font-weight:400; color:var(--mh-dim); }
.br-none{ text-align:center; color:var(--mh-dim); }
.br-row-off td{ opacity:.55; }
.br-center{ text-align:center !important; }
.br-id{ font-family:'IBM Plex Mono',monospace; font-size:12px; font-weight:700; white-space:nowrap; }
.br-source{ display:block; margin-top:2px; font-weight:400; font-size:10.5px; color:var(--mh-dim); }
.br-name{ font-weight:600; color:var(--mh-ink); }
.br-desc{ margin-top:2px; font-size:12.5px; color:var(--mh-dim); line-height:1.5; }
.br-instruction{ margin-top:4px; font-size:12px; color:var(--mh-paper); line-height:1.5; font-style:italic; }
.br-type{ display:inline-block; font-family:'IBM Plex Mono',monospace; font-size:10.5px; font-weight:700; padding:3px 8px; border-radius:3px; white-space:nowrap; }
.br-type-rule{ background:#E4EEF7; color:var(--mh-blue); }
.br-type-llm{ background:#EDE7FB; color:#6A4BC4; }
.br-sev{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; font-weight:700; white-space:nowrap; }
.br-sev-FAIL{ color:#B23A3A; }
.br-sev-WARN{ color:#B4690E; }
.br-stats{ font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--mh-dim); white-space:nowrap; }
.br-updated{ font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--mh-paper); white-space:nowrap; }
.br-updated span{ display:block; color:var(--mh-dim); }
.br-actions{ white-space:nowrap; text-align:right; }
.br-link{ background:none; border:none; padding:0 0 0 10px; font-size:12.5px; font-weight:600; color:var(--mh-blue); cursor:pointer; }
.br-link:disabled{ opacity:.4; cursor:default; }
.br-link-danger{ color:#B23A3A; }
.br-note{ margin:12px 0 0; font-size:12px; color:var(--mh-dim); line-height:1.6; }
.br-btn{ margin-top:14px; padding:9px 16px; font-size:13px; font-weight:600; color:#FFFFFF; background:var(--mh-blue); border:1px solid var(--mh-blue); border-radius:6px; cursor:pointer; }
.br-btn:disabled{ opacity:.5; cursor:default; }
.br-btn-ghost{ color:var(--mh-paper); background:var(--mh-bg); border-color:var(--mh-hairline); }
.br-btn-test{ margin-top:0; background:#6A4BC4; border-color:#6A4BC4; }
.br-form{ margin-top:16px; padding:16px 18px; display:flex; flex-direction:column; gap:12px; background:var(--mh-panel); border:1px solid var(--mh-hairline); border-left:3px solid #6A4BC4; border-radius:6px; }
.br-form-title{ font-family:'Space Grotesk',sans-serif; font-size:15px; font-weight:600; color:var(--mh-ink); }
.br-form-version{ margin:-6px 0 0; font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--mh-dim); }
.br-form label{ display:flex; flex-direction:column; gap:5px; font-size:12.5px; font-weight:600; color:var(--mh-paper); }
.br-label-row{ display:flex; justify-content:space-between; gap:10px; }
.br-counter{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; font-weight:400; color:var(--mh-dim); }
.br-counter-over{ color:#B23A3A; font-weight:700; }
.br-field-error{ font-size:12px; font-weight:500; color:#B23A3A; }
.br-form input:not([type="checkbox"]):not([type="radio"]), .br-form textarea, .br-form select, .br-test select{ font:inherit; font-weight:400; font-size:13px; padding:8px 10px; color:var(--mh-paper); background:var(--mh-bg); border:1px solid var(--mh-hairline); border-radius:5px; }
.br-form input:focus, .br-form textarea:focus, .br-form select:focus{ outline:none; border-color:var(--mh-blue); }
.br-form-grid{ display:grid; grid-template-columns:3fr 2fr; gap:12px; }
@media(max-width:820px){ .br-form-grid{ grid-template-columns:1fr; } }
.br-sees, .br-guide{ padding:10px 12px; background:var(--mh-bg); border:1px solid var(--mh-hairline); border-radius:5px; }
.br-sees-title{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; font-weight:700; color:var(--mh-ink); margin-bottom:6px; }
.br-sees ul, .br-guide ul{ margin:0; padding-left:16px; font-size:12.5px; color:var(--mh-paper); line-height:1.6; }
.br-guide ul{ list-style:none; padding-left:0; }
.br-sees-foot{ margin-top:6px; font-size:11.5px; color:var(--mh-dim); }
.br-status{ display:inline-block; min-width:42px; text-align:center; font-family:'IBM Plex Mono',monospace; font-size:10px; font-weight:700; padding:2px 6px; border-radius:3px; }
.br-status-PASS{ background:#DCFCE7; color:#166534; }
.br-status-WARN{ background:#FDF3E3; color:#B4690E; }
.br-status-FAIL{ background:#FDE8E6; color:#B23A3A; }
.br-status-INFO{ background:#E4EEF7; color:var(--mh-dim); }
.br-sev-pick{ margin:0; padding:10px 12px; border:1px solid var(--mh-hairline); border-radius:5px; background:var(--mh-bg); }
.br-sev-pick legend{ padding:0 4px; font-size:12.5px; font-weight:600; color:var(--mh-paper); }
.br-form .br-radio, .br-form .br-check{ flex-direction:row; align-items:center; gap:8px; font-weight:500; }
.br-check-note{ font-weight:400; color:var(--mh-dim); }
.br-gate-warn{ margin-top:-6px; padding:8px 12px; font-size:12.5px; color:#8A2A2A; background:#FDE8E6; border-left:3px solid #B23A3A; border-radius:4px; }
.br-form-actions{ display:flex; align-items:center; gap:10px; }
.br-form-actions .br-btn{ margin-top:0; }
.br-tested{ font-size:12.5px; font-weight:600; color:#166534; }
.br-test{ margin-top:12px; padding:12px 14px; background:var(--mh-bg); border:1px dashed #6A4BC4; border-radius:6px; }
.br-form .br-test{ margin-top:0; }
.br-test-head{ display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; font-weight:600; color:var(--mh-ink); }
.br-test-row{ display:flex; align-items:flex-end; gap:10px; flex-wrap:wrap; }
.br-test-row label{ flex:1; min-width:240px; display:flex; flex-direction:column; gap:5px; font-size:12.5px; font-weight:600; color:var(--mh-paper); }
.br-test-hint{ margin:6px 0 0; font-size:11.5px; color:var(--mh-dim); }
.br-test-error{ margin-top:8px; padding:8px 12px; font-size:12.5px; color:#8A2A2A; background:#FDE8E6; border-radius:4px; }
.br-test-result{ margin-top:10px; padding:10px 12px; background:var(--mh-panel); border-radius:5px; display:flex; flex-direction:column; gap:6px; }
.br-test-summary{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.br-test-meta{ margin-left:auto; font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--mh-dim); }
.br-tag{ font-family:'IBM Plex Mono',monospace; font-size:10px; padding:2px 6px; border-radius:3px; background:#E4EEF7; color:var(--mh-dim); }
.br-tag-warn{ background:#FDF3E3; color:#B4690E; }
.br-test-message{ font-size:13px; color:var(--mh-ink); line-height:1.5; }
.br-test-reasoning{ font-size:12px; color:var(--mh-dim); line-height:1.5; border-top:1px dashed var(--mh-hairline); padding-top:6px; }
.br-test-targets{ font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--mh-paper); }
`;
