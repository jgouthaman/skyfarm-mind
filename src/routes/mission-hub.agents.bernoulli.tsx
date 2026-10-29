import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { MissionHubShell, MhCard, requireAdminGuard } from "@/components/mission-hub/Shell";
import { useMissionHubAuth } from "@/lib/mission-hub/context";
import { supabase } from "@/integrations/supabase/client";

// Mission Hub -> Agents -> Bernoulli: the Bernoulli check registry
// (Hangar_BernoulliRules) per calling agent. Admins pick an agent in the top
// bar, see its checks (type, hard gate, enabled), toggle them, and add custom
// TorqWings AI rules. Every Bernoulli review reads this registry at run time.
// Reads/writes go through /api/hangar/bernoulli-rules (admin-checked server-side).
export const Route = createFileRoute("/mission-hub/agents/bernoulli")({
  component: BernoulliRulesPage,
});

// Mirrors bernoulliRules.ts's BernoulliRuleDef -- duplicated across the
// client/server boundary, same convention as the Hangar pages.
interface RuleView {
  ruleId: string;
  bay: string;
  name: string;
  description: string;
  kind: "rule" | "llm";
  hardGate: boolean;
  enabled: boolean;
  builtin: boolean;
  instruction: string | null;
  sortOrder: number;
}

// All 15 Hangar agents. `bay` is the registry key; only `wired` ones have
// Bernoulli call points today (bernoulliRules.ts's WIRED_BERNOULLI_BAYS).
const AGENTS: { num: string; name: string; bay: string; wired: boolean }[] = [
  { num: "01", name: "Mission", bay: "mission", wired: true },
  { num: "02", name: "Concept", bay: "concept", wired: true },
  { num: "03", name: "Aircraft Design", bay: "aircraft-design", wired: false },
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

const EMPTY_FORM = { name: "", description: "", instruction: "", hardGate: false };

function BernoulliRulesPage() {
  const { profile, loading } = useMissionHubAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && profile) requireAdminGuard(profile.role, navigate);
  }, [loading, profile, navigate]);

  const [agentBay, setAgentBay] = useState("mission");
  const agent = AGENTS.find((a) => a.bay === agentBay)!;
  const [rules, setRules] = useState<RuleView[] | null>(null);
  const [fromRegistry, setFromRegistry] = useState(true);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [busyRule, setBusyRule] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function loadRules(bay: string) {
    setStatus("loading");
    try {
      const json = await authedFetch(`/api/hangar/bernoulli-rules?bay=${encodeURIComponent(bay)}`);
      setRules(json.rules);
      setFromRegistry(json.fromRegistry);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    setRules(null);
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    if (agent.wired && profile) loadRules(agent.bay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentBay, profile?.id]);

  async function patchRule(rule: RuleView, patch: Partial<RuleView>) {
    setBusyRule(rule.ruleId);
    try {
      const updated: RuleView = await authedFetch("/api/hangar/bernoulli-rules", {
        method: "PATCH",
        body: JSON.stringify({ ruleId: rule.ruleId, ...patch }),
      });
      setRules((cur) => cur?.map((r) => (r.ruleId === updated.ruleId ? updated : r)) ?? cur);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update the rule.");
    } finally {
      setBusyRule(null);
    }
  }

  async function deleteRule(rule: RuleView) {
    if (!window.confirm(`Delete ${rule.ruleId} "${rule.name}"? Past reports that used it keep their results.`)) return;
    setBusyRule(rule.ruleId);
    try {
      await authedFetch(`/api/hangar/bernoulli-rules?ruleId=${encodeURIComponent(rule.ruleId)}`, { method: "DELETE" });
      setRules((cur) => cur?.filter((r) => r.ruleId !== rule.ruleId) ?? cur);
      toast.success(`Deleted ${rule.ruleId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete the rule.");
    } finally {
      setBusyRule(null);
    }
  }

  function startEdit(rule: RuleView) {
    setEditingId(rule.ruleId);
    setForm({
      name: rule.name,
      description: rule.description,
      instruction: rule.instruction ?? "",
      hardGate: rule.hardGate,
    });
    setFormOpen(true);
  }

  async function submitForm(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        const updated: RuleView = await authedFetch("/api/hangar/bernoulli-rules", {
          method: "PATCH",
          body: JSON.stringify({ ruleId: editingId, ...form }),
        });
        setRules((cur) => cur?.map((r) => (r.ruleId === updated.ruleId ? updated : r)) ?? cur);
        toast.success(`Updated ${updated.ruleId}`);
      } else {
        const created: RuleView = await authedFetch("/api/hangar/bernoulli-rules", {
          method: "POST",
          body: JSON.stringify({ bay: agent.bay, ...form }),
        });
        setRules((cur) => [...(cur ?? []), created]);
        toast.success(`Added ${created.ruleId}`);
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      setFormOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the rule.");
    } finally {
      setSaving(false);
    }
  }

  const llmCount = rules?.filter((r) => r.enabled && r.kind === "llm").length ?? 0;
  const enabledCount = rules?.filter((r) => r.enabled).length ?? 0;
  const canEdit = fromRegistry;

  return (
    <MissionHubShell title="Bernoulli checks">
      <style>{BR_CSS}</style>
      <div className="br">
        <p className="br-lead">
          The checks Bernoulli runs when it's called from each agent. Every review reads this list when it runs, so
          switching a check off, changing its hard gate, or adding a rule takes effect on the next Ask Bernoulli.
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
            {agent.wired && rules && (
              <div className="br-counts">
                {enabledCount} enabled · {llmCount} TorqWings AI call{llmCount === 1 ? "" : "s"} per review
              </div>
            )}
          </div>

          {!agent.wired ? (
            <p className="br-empty">
              Bernoulli isn't wired into the {agent.name} Agent yet, so it has no checks to manage here. Its checks will
              appear on this tab once Bernoulli reviews that agent's output.
            </p>
          ) : status === "loading" || (rules === null && status !== "error") ? (
            <p className="br-empty">Loading checks…</p>
          ) : status === "error" ? (
            <p className="br-empty">
              Couldn't load the checks.{" "}
              <button type="button" className="br-link" onClick={() => loadRules(agent.bay)}>
                Retry
              </button>
            </p>
          ) : (
            <>
              {!fromRegistry && (
                <div className="br-warn">
                  Showing the built-in defaults -- the rules table isn't set up yet. Run the migration
                  <code> 20261030000000_hangar_bernoulli_rules.sql </code>
                  in the Supabase SQL editor to start managing checks here. Reviews keep running these defaults
                  until then.
                </div>
              )}

              <table className="br-table">
                <thead>
                  <tr>
                    <th>Check</th>
                    <th>What it checks</th>
                    <th>Type</th>
                    <th className="br-center">Hard gate</th>
                    <th className="br-center">Enabled</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rules!.map((r) => (
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
                        <span className={`br-type br-type-${r.kind}`}>
                          {r.kind === "llm" ? "TorqWings AI" : "Rule-based"}
                        </span>
                      </td>
                      <td className="br-center">
                        <input
                          type="checkbox"
                          checked={r.hardGate}
                          disabled={!canEdit || busyRule === r.ruleId}
                          onChange={(e) => patchRule(r, { hardGate: e.target.checked })}
                          aria-label={`Hard gate for ${r.ruleId}`}
                        />
                      </td>
                      <td className="br-center">
                        <input
                          type="checkbox"
                          checked={r.enabled}
                          disabled={!canEdit || busyRule === r.ruleId}
                          onChange={(e) => patchRule(r, { enabled: e.target.checked })}
                          aria-label={`Enable ${r.ruleId}`}
                        />
                      </td>
                      <td className="br-actions">
                        {!r.builtin && canEdit && (
                          <>
                            <button type="button" className="br-link" onClick={() => startEdit(r)} disabled={busyRule === r.ruleId}>
                              Edit
                            </button>
                            <button type="button" className="br-link br-link-danger" onClick={() => deleteRule(r)} disabled={busyRule === r.ruleId}>
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="br-note">
                <b>Hard gate</b>: a FAIL on this check fails the whole review. Other checks can only lower it to WARN.
                Built-in checks run fixed code, so only their hard gate and enabled switches change.
              </p>

              {canEdit && !formOpen && (
                <button
                  type="button"
                  className="br-btn"
                  onClick={() => {
                    setEditingId(null);
                    setForm(EMPTY_FORM);
                    setFormOpen(true);
                  }}
                >
                  + Add a rule
                </button>
              )}

              {canEdit && formOpen && (
                <form className="br-form" onSubmit={submitForm}>
                  <div className="br-form-title">
                    {editingId ? `Edit ${editingId}` : `New TorqWings AI rule for the ${agent.name} Agent`}
                  </div>
                  <p className="br-form-hint">
                    New rules are TorqWings AI checks: Bernoulli gives TorqWings AI your instruction, this agent's
                    output, and the other checks' findings, and asks for PASS / WARN / FAIL with its reasoning. Each
                    rule adds one AI call to every review. A new rule-based (formula) check needs code.
                  </p>
                  <label>
                    Name
                    <input
                      value={form.name}
                      maxLength={120}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Wind tolerance for the operating environment"
                      required
                    />
                  </label>
                  <label>
                    Short description <span>(shown in the check list)</span>
                    <input
                      value={form.description}
                      maxLength={500}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="e.g. Can the vehicle hold its mission in the stated operating environment's typical winds?"
                    />
                  </label>
                  <label>
                    What TorqWings AI should check
                    <textarea
                      value={form.instruction}
                      maxLength={2000}
                      rows={4}
                      onChange={(e) => setForm({ ...form, instruction: e.target.value })}
                      placeholder="e.g. Given the vehicle class, payload and operating environment, check whether typical wind speeds for that environment would exceed what this vehicle class can hold station in. FAIL if clearly beyond, WARN if marginal."
                      required
                    />
                  </label>
                  <label className="br-check">
                    <input
                      type="checkbox"
                      checked={form.hardGate}
                      onChange={(e) => setForm({ ...form, hardGate: e.target.checked })}
                    />
                    Hard gate -- a FAIL on this rule fails the whole review
                  </label>
                  <div className="br-form-actions">
                    <button type="submit" className="br-btn" disabled={saving}>
                      {saving ? "Saving…" : editingId ? "Save changes" : "Add rule"}
                    </button>
                    <button
                      type="button"
                      className="br-btn br-btn-ghost"
                      onClick={() => {
                        setFormOpen(false);
                        setEditingId(null);
                        setForm(EMPTY_FORM);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </MhCard>
      </div>
    </MissionHubShell>
  );
}

const BR_CSS = `
.br{ display:flex; flex-direction:column; gap:16px; }
.br-lead{ margin:0; font-size:13.5px; color:var(--mh-dim); max-width:760px; line-height:1.6; }
.br-agents{ display:flex; flex-wrap:wrap; gap:6px; }
.br-agent{
  display:inline-flex; align-items:center; gap:6px; padding:7px 12px; font-size:12.5px; font-weight:600;
  color:var(--mh-paper); background:var(--mh-bg); border:1px solid var(--mh-hairline); border-radius:6px; cursor:pointer;
}
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
.br-counts{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--mh-dim); }
.br-empty{ margin:0; font-size:13px; color:var(--mh-dim); line-height:1.6; }
.br-warn{ margin-bottom:14px; padding:10px 14px; font-size:12.5px; line-height:1.6; color:#8A5A12; background:#FDF3E3; border-left:3px solid var(--mh-amber); border-radius:4px; }
.br-warn code{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; }
.br-table{ width:100%; border-collapse:collapse; font-size:13px; }
.br-table th{ text-align:left; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; font-weight:600; color:var(--mh-dim); padding:8px 10px; border-bottom:1px solid var(--mh-hairline); background:var(--mh-panel); }
.br-table td{ padding:10px; border-bottom:1px solid var(--mh-hairline); vertical-align:top; color:var(--mh-paper); }
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
.br-actions{ white-space:nowrap; text-align:right; }
.br-link{ background:none; border:none; padding:0 0 0 10px; font-size:12.5px; font-weight:600; color:var(--mh-blue); cursor:pointer; }
.br-link:disabled{ opacity:.4; cursor:default; }
.br-link-danger{ color:#B23A3A; }
.br-note{ margin:12px 0 0; font-size:12px; color:var(--mh-dim); line-height:1.6; }
.br-btn{ margin-top:14px; padding:9px 16px; font-size:13px; font-weight:600; color:#FFFFFF; background:var(--mh-blue); border:1px solid var(--mh-blue); border-radius:6px; cursor:pointer; }
.br-btn:disabled{ opacity:.5; cursor:default; }
.br-btn-ghost{ color:var(--mh-paper); background:var(--mh-bg); border-color:var(--mh-hairline); }
.br-form{ margin-top:16px; padding:16px 18px; display:flex; flex-direction:column; gap:12px; background:var(--mh-panel); border:1px solid var(--mh-hairline); border-left:3px solid #6A4BC4; border-radius:6px; }
.br-form-title{ font-family:'Space Grotesk',sans-serif; font-size:15px; font-weight:600; color:var(--mh-ink); }
.br-form-hint{ margin:0; font-size:12.5px; color:var(--mh-dim); line-height:1.6; }
.br-form label{ display:flex; flex-direction:column; gap:5px; font-size:12.5px; font-weight:600; color:var(--mh-paper); }
.br-form label span{ font-weight:400; color:var(--mh-dim); }
.br-form input:not([type="checkbox"]), .br-form textarea{ font:inherit; font-weight:400; font-size:13px; padding:8px 10px; color:var(--mh-paper); background:var(--mh-bg); border:1px solid var(--mh-hairline); border-radius:5px; }
.br-form input:focus, .br-form textarea:focus{ outline:none; border-color:var(--mh-blue); }
.br-form .br-check{ flex-direction:row; align-items:center; gap:8px; font-weight:500; }
.br-form-actions{ display:flex; gap:10px; }
.br-form-actions .br-btn{ margin-top:0; }
`;
