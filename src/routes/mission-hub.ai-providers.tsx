import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { MissionHubShell, MhCard, requireAdminGuard } from "@/components/mission-hub/Shell";
import { useMissionHubAuth } from "@/lib/mission-hub/context";
import { supabase } from "@/integrations/supabase/client";

// Mission Hub -> Configurations -> AI Providers: which LLM provider every
// Hangar agent calls first, and which it falls back to. Saved in
// Hangar_LlmSettings and read by llmGateway.ts (cached ~30s), so a change
// applies to every agent and Bernoulli check without a redeploy.
export const Route = createFileRoute("/mission-hub/ai-providers")({
  component: AiProvidersPage,
});

type ProviderId = "anthropic" | "groq";

const PROVIDER_INFO: Record<ProviderId, { label: string; model: string; note: string }> = {
  anthropic: {
    label: "Anthropic",
    model: "Claude Sonnet 5",
    note: "Most reliable at following the agents' JSON output instructions.",
  },
  groq: {
    label: "Groq",
    model: "gpt-oss-120b",
    note: "Fast and low-cost; follows strict output formats a little less reliably.",
  },
};

interface SettingsView {
  order: ProviderId[];
  fromSettings: boolean;
  configured: Record<ProviderId, boolean>;
}

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

function AiProvidersPage() {
  const { profile, loading } = useMissionHubAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && profile) requireAdminGuard(profile.role, navigate);
  }, [loading, profile, navigate]);

  const [settings, setSettings] = useState<SettingsView | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [primary, setPrimary] = useState<ProviderId>("anthropic");
  const [secondary, setSecondary] = useState<ProviderId | "none">("groq");
  const [saving, setSaving] = useState(false);

  async function load() {
    setStatus("loading");
    try {
      const json: SettingsView = await authedFetch("/api/hangar/llm-settings");
      setSettings(json);
      setPrimary(json.order[0]);
      setSecondary(json.order[1] ?? "none");
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    if (profile) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  function choosePrimary(p: ProviderId) {
    setPrimary(p);
    if (secondary === p) setSecondary(p === "anthropic" ? "groq" : "anthropic");
  }

  const draftOrder: ProviderId[] = secondary === "none" ? [primary] : [primary, secondary];
  const dirty = settings ? draftOrder.join(",") !== settings.order.join(",") : false;
  const missingKeys = settings ? draftOrder.filter((p) => !settings.configured[p]) : [];

  async function save() {
    setSaving(true);
    try {
      const json = await authedFetch("/api/hangar/llm-settings", {
        method: "PUT",
        body: JSON.stringify({ order: draftOrder }),
      });
      setSettings((cur) => (cur ? { ...cur, order: json.order, fromSettings: true } : cur));
      toast.success("AI provider order saved -- live within about 30 seconds.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the provider order.");
    } finally {
      setSaving(false);
    }
  }

  const other = (p: ProviderId): ProviderId => (p === "anthropic" ? "groq" : "anthropic");

  return (
    <MissionHubShell title="AI Providers">
      <style>{AP_CSS}</style>
      <div className="ap">
        <p className="ap-lead">
          Which AI provider every Hangar agent and Bernoulli check calls first, and which it falls back to when the
          first one doesn't answer. Changes apply to the live site within about 30 seconds -- no redeploy.
        </p>

        <MhCard className="ap-card">
          {status === "loading" ? (
            <p className="ap-empty">Loading…</p>
          ) : status === "error" || !settings ? (
            <p className="ap-empty">
              Couldn't load the AI provider settings.{" "}
              <button type="button" className="ap-link" onClick={load}>
                Retry
              </button>
            </p>
          ) : (
            <>
              {!settings.fromSettings && (
                <div className="ap-warn">
                  Using the built-in default (Anthropic first, Groq second) -- the settings table isn't set up yet.
                  Run <code>20261030010000_hangar_llm_provider_order.sql</code> in the Supabase SQL editor before
                  saving a different order.
                </div>
              )}

              <div className="ap-current">
                Currently live:{" "}
                {settings.order.map((p, i) => (
                  <span key={p}>
                    {i > 0 && <span className="ap-arrow"> then </span>}
                    <b>{PROVIDER_INFO[p].label}</b>
                  </span>
                ))}
                {settings.order.length === 1 && <span className="ap-arrow"> only, no fallback</span>}
              </div>

              <div className="ap-slots">
                <div className="ap-slot">
                  <div className="ap-slot-label">1 · Primary</div>
                  {(["anthropic", "groq"] as ProviderId[]).map((p) => (
                    <label key={p} className={`ap-option${primary === p ? " ap-option-on" : ""}`}>
                      <input type="radio" name="primary" checked={primary === p} onChange={() => choosePrimary(p)} />
                      <span>
                        <b>{PROVIDER_INFO[p].label}</b> · {PROVIDER_INFO[p].model}
                        <small>{PROVIDER_INFO[p].note}</small>
                        {!settings.configured[p] && <em>No API key set in production</em>}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="ap-slot">
                  <div className="ap-slot-label">2 · Fallback</div>
                  <label className={`ap-option${secondary === other(primary) ? " ap-option-on" : ""}`}>
                    <input
                      type="radio"
                      name="secondary"
                      checked={secondary === other(primary)}
                      onChange={() => setSecondary(other(primary))}
                    />
                    <span>
                      <b>{PROVIDER_INFO[other(primary)].label}</b> · {PROVIDER_INFO[other(primary)].model}
                      <small>Used only when {PROVIDER_INFO[primary].label} doesn't answer.</small>
                      {!settings.configured[other(primary)] && <em>No API key set in production</em>}
                    </span>
                  </label>
                  <label className={`ap-option${secondary === "none" ? " ap-option-on" : ""}`}>
                    <input type="radio" name="secondary" checked={secondary === "none"} onChange={() => setSecondary("none")} />
                    <span>
                      <b>No fallback</b>
                      <small>If {PROVIDER_INFO[primary].label} doesn't answer, agents show simulated output.</small>
                    </span>
                  </label>
                </div>
              </div>

              {missingKeys.length > 0 && (
                <div className="ap-warn">
                  {missingKeys.map((p) => PROVIDER_INFO[p].label).join(" and ")} has no API key in production, so it
                  will be skipped. Add <code>{missingKeys.map((p) => (p === "anthropic" ? "ANTHROPIC_API_KEY" : "GROQ_API_KEY")).join(" / ")}</code>{" "}
                  in Vercel to use it.
                </div>
              )}

              <div className="ap-actions">
                <button type="button" className="ap-btn" disabled={!dirty || saving || !settings.fromSettings} onClick={save}>
                  {saving ? "Saving…" : "Save order"}
                </button>
                <span className="ap-preview">
                  New order: {draftOrder.map((p) => PROVIDER_INFO[p].label).join(" → ")}
                  {draftOrder.length === 1 ? " (no fallback)" : ""}
                </span>
              </div>

              <p className="ap-note">
                The AI badge on each agent page shows whichever provider is answering. Estimated costs on those pages
                are always worked out at Claude's list price, so they overstate the cost of Groq calls.
              </p>
            </>
          )}
        </MhCard>
      </div>
    </MissionHubShell>
  );
}

const AP_CSS = `
.ap{ display:flex; flex-direction:column; gap:16px; max-width:880px; }
.ap-lead{ margin:0; font-size:13.5px; color:var(--mh-dim); line-height:1.6; }
.ap-card{ padding:20px 22px; }
.ap-empty{ margin:0; font-size:13px; color:var(--mh-dim); }
.ap-link{ background:none; border:none; padding:0; font-weight:600; color:var(--mh-blue); cursor:pointer; }
.ap-warn{ margin-bottom:14px; padding:10px 14px; font-size:12.5px; line-height:1.6; color:#8A5A12; background:#FDF3E3; border-left:3px solid var(--mh-amber); border-radius:4px; }
.ap-warn code{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; }
.ap-current{ margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid var(--mh-blue-line); font-size:13.5px; color:var(--mh-paper); }
.ap-current b{ color:var(--mh-ink); }
.ap-arrow{ color:var(--mh-dim); }
.ap-slots{ display:grid; grid-template-columns:1fr 1fr; gap:16px; }
@media(max-width:760px){ .ap-slots{ grid-template-columns:1fr; } }
.ap-slot{ display:flex; flex-direction:column; gap:8px; }
.ap-slot-label{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; font-weight:700; color:var(--mh-paper); }
.ap-option{ display:flex; gap:10px; align-items:flex-start; padding:10px 12px; border:1px solid var(--mh-hairline); border-radius:6px; background:var(--mh-bg); cursor:pointer; }
.ap-option-on{ border-color:var(--mh-blue); background:#E4EEF7; }
.ap-option input{ margin-top:3px; }
.ap-option span{ display:flex; flex-direction:column; gap:2px; font-size:13px; color:var(--mh-paper); }
.ap-option b{ color:var(--mh-ink); }
.ap-option small{ font-size:12px; color:var(--mh-dim); }
.ap-option em{ font-size:11.5px; font-style:normal; font-weight:600; color:#B23A3A; }
.ap-actions{ display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-top:16px; }
.ap-btn{ padding:9px 18px; font-size:13px; font-weight:600; color:#FFFFFF; background:var(--mh-blue); border:1px solid var(--mh-blue); border-radius:6px; cursor:pointer; }
.ap-btn:disabled{ opacity:.45; cursor:default; }
.ap-preview{ font-family:'IBM Plex Mono',monospace; font-size:12px; color:var(--mh-dim); }
.ap-note{ margin:14px 0 0; font-size:12px; color:var(--mh-dim); line-height:1.6; }
`;
