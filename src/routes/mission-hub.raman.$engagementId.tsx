import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, History, IndianRupee, Lock, X } from "lucide-react";
import { RamanBrand, RamanFrame } from "@/components/raman/RamanFrame";
import { InputsTab, type InputForm } from "@/components/raman/InputsTab";
import { NoiseCheckTab, PaymentPanel } from "@/components/raman/NoiseCheckTab";
import { FixRunTab } from "@/components/raman/FixRunTab";
import { TuneTab } from "@/components/raman/TuneTab";
import { FinalTab } from "@/components/raman/FinalTab";
import { Card, ErrorNote, fmt } from "@/components/raman/ui";
import { ramanApi, type EngagementBundle } from "@/lib/raman/ramanBrowserApi";
import type { RamanDesignChanges } from "@/lib/raman/ramanTypes";

// Raman workspace (spec §0.1, §0.5 "Shell"): one engagement (cycle) with
// five tabs. Opens at the furthest tab reached; completed tabs are frozen
// but viewable; Tab 3 waits for Payment 2; closing freezes everything.
export const Route = createFileRoute("/mission-hub/raman/$engagementId")({
  validateSearch: (s: Record<string, unknown>): { tab?: number } => {
    const tab = Number(s.tab);
    return tab >= 1 && tab <= 5 ? { tab } : {};
  },
  component: RamanWorkspace,
});

const TAB_NAMES = ["Inputs", "Noise Check", "Fix Options", "Agentic Noise Fix", "Final Report"];
const PREFILL_KEY = (id: string) => `raman-prefill-${id}`;

type TabState = "locked" | "available" | "done" | "awaiting_payment";

function tabStates(b: EngagementBundle): TabState[] {
  const closed = b.engagement.status === "closed";
  const hasBaseline = !!b.baseline;
  const paid2 = b.engagement.payment2_status !== "pending";
  const finishedRun = b.runs.some((r) => r.status !== "running");
  const hasFix = !!b.fix_prediction;
  return [
    hasBaseline ? "done" : "available",
    hasBaseline ? "done" : "locked",
    !hasBaseline ? "locked" : !paid2 ? "awaiting_payment" : finishedRun ? "done" : "available",
    hasFix ? "done" : finishedRun ? "available" : "locked",
    !hasFix ? "locked" : closed ? "done" : "available",
  ];
}

function readPrefill(id: string): { form: InputForm; focus?: string } | null {
  try {
    const raw = sessionStorage.getItem(PREFILL_KEY(id));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function RamanWorkspace() {
  const { engagementId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [bundle, setBundle] = useState<EngagementBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [tune, setTune] = useState<{ changes: RamanDesignChanges; runId: string } | null>(null);
  const prefill = useMemo(() => readPrefill(engagementId), [engagementId]);

  const load = useCallback(async () => {
    try {
      setBundle(await ramanApi.engagement(engagementId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [engagementId]);

  useEffect(() => {
    setBundle(null);
    setTune(null);
    void load();
  }, [load]);

  const tab = search.tab ?? bundle?.engagement.furthest_tab ?? 1;
  const goTab = useCallback(
    (n: number) => navigate({ to: "/mission-hub/raman/$engagementId", params: { engagementId }, search: { tab: n } }),
    [navigate, engagementId],
  );

  const newCycle = async (form: InputForm, focus?: string) => {
    if (!bundle?.vehicle) return;
    try {
      const e = await ramanApi.startEngagement(bundle.vehicle.id);
      try {
        sessionStorage.setItem(PREFILL_KEY(e.id), JSON.stringify({ form, focus }));
      } catch {
        /* prefill is a convenience only */
      }
      navigate({ to: "/mission-hub/raman/$engagementId", params: { engagementId: e.id }, search: { tab: 1 } });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  if (!bundle) {
    return (
      <RamanFrame title="Ask Raman">
        <RamanBrand />
        <div className="mt-6">{error ? <ErrorNote>{error}</ErrorNote> : <p style={{ color: "var(--rmn-on-navy-dim)" }}>Loading…</p>}</div>
      </RamanFrame>
    );
  }

  const states = tabStates(bundle);
  const e = bundle.engagement;
  const reachable = (n: number) => states[n - 1] !== "locked";
  const activeTab = reachable(tab) ? tab : 1;

  return (
    <RamanFrame title="Ask Raman">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <RamanBrand>
          <span className="text-sm" style={{ color: "var(--rmn-on-navy)" }}>
            {bundle.customer?.name ?? "--"} <span style={{ color: "var(--rmn-on-navy-dim)" }}>/</span> {bundle.vehicle?.name ?? "--"}
          </span>
          <span className="rmn-num rounded-full px-2.5 py-0.5 text-sm" style={{ background: "var(--rmn-accent)", color: "var(--rmn-accent-ink)" }}>
            v{e.cycle}
          </span>
          {e.status === "closed" && (
            <span className="inline-flex items-center gap-1 text-xs" style={{ color: "var(--rmn-on-navy-dim)" }}>
              <Lock className="h-3 w-3" aria-hidden="true" /> Closed
            </span>
          )}
        </RamanBrand>
        <div className="flex items-center gap-3 text-sm">
          <button type="button" className="inline-flex items-center gap-1.5" style={{ color: "var(--rmn-on-navy)" }} onClick={() => setHistoryOpen(true)}>
            <History className="h-4 w-4" /> History
          </button>
          <Link to="/mission-hub/raman" className="inline-flex items-center gap-1.5" style={{ color: "var(--rmn-on-navy-dim)" }}>
            <ArrowLeft className="h-4 w-4" /> Customers
          </Link>
        </div>
      </div>

      {/* Tab strip -- Bay 01's stage tracker: numbered steps, blue tick when
          completed and frozen, amber when active, rupee when awaiting payment. */}
      <nav className="rmn-tracker mt-5" aria-label="Ask Raman tabs">
        {TAB_NAMES.map((name, i) => {
          const n = i + 1;
          const st = states[i];
          const active = n === activeTab;
          const cls = [
            "rmn-tracker-item",
            st === "done" && "rmn-tracker-item-done",
            st === "locked" && "rmn-tracker-item-locked",
            st === "awaiting_payment" && "rmn-tracker-item-pay",
            active && "rmn-tracker-item-active",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={n}
              type="button"
              disabled={st === "locked"}
              onClick={() => goTab(n)}
              aria-current={active ? "page" : undefined}
              title={st === "locked" ? "Locked" : st === "awaiting_payment" ? "Awaiting Payment 2" : st === "done" ? "Completed · frozen" : "Open"}
              className={cls}
            >
              <span className="rmn-tracker-num">
                {st === "done" ? <Check className="h-3.5 w-3.5" /> : st === "awaiting_payment" ? <IndianRupee className="h-3.5 w-3.5" /> : st === "locked" ? <Lock className="h-3 w-3" /> : n}
              </span>
              <span className="rmn-tracker-label">
                <span className="rmn-mono text-[11px]" style={{ color: "var(--rmn-dim)" }}>{n}</span> {name}
              </span>
            </button>
          );
        })}
      </nav>

      {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}

      <div className="mt-5">
        {activeTab === 1 && (
          <InputsTab
            key={e.id}
            bundle={bundle}
            initial={prefill?.form ?? null}
            focusField={prefill?.focus ?? null}
            onIssued={async () => {
              try {
                sessionStorage.removeItem(PREFILL_KEY(e.id));
              } catch {
                /* ignore */
              }
              await load();
              goTab(2);
            }}
            onNewCycle={newCycle}
          />
        )}
        {activeTab === 2 && bundle.baseline && (
          <NoiseCheckTab bundle={bundle} onChanged={load} onGoTab={goTab} onNewCycle={newCycle} />
        )}
        {activeTab === 3 && states[2] === "awaiting_payment" && (
          <Card>
            <PaymentPanel engagementId={e.id} stage={2} onDone={load} />
          </Card>
        )}
        {activeTab === 3 && states[2] !== "awaiting_payment" && bundle.baseline && (
          <FixRunTab
            key={e.id}
            bundle={bundle}
            onChanged={load}
            onTune={(changes, runId) => {
              setTune({ changes, runId });
              goTab(4);
            }}
          />
        )}
        {activeTab === 4 && bundle.baseline && (
          <TuneTab
            key={`${e.id}-${JSON.stringify(tune)}`}
            bundle={bundle}
            seed={tune?.changes ?? null}
            runId={tune?.runId ?? null}
            onLocked={async () => {
              await load();
              goTab(5);
            }}
          />
        )}
        {activeTab === 5 && bundle.fix_prediction && (
          <FinalTab bundle={bundle} onChanged={load} onReplay={() => goTab(3)} />
        )}
      </div>

      {/* History drawer */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-label="Cycle history">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close history" onClick={() => setHistoryOpen(false)} />
          <div className="relative h-full w-full max-w-md overflow-y-auto p-5" style={{ background: "#fff", color: "var(--rmn-ink)" }}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{bundle.vehicle?.name} · cycle history</h3>
              <button type="button" onClick={() => setHistoryOpen(false)} aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <table className="rmn-table mt-4">
              <thead>
                <tr><th>Cycle</th><th>Date</th><th>Before</th><th>After</th><th>Reduction</th><th>Status</th></tr>
              </thead>
              <tbody>
                {bundle.history.map((h) => (
                  <tr key={h.id} style={{ background: h.id === e.id ? "#F2F7FB" : undefined }}>
                    <td>
                      <Link to="/mission-hub/raman/$engagementId" params={{ engagementId: h.id }} onClick={() => setHistoryOpen(false)} className="font-medium underline">
                        v{h.cycle}
                      </Link>
                    </td>
                    <td>{new Date(h.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric", day: "numeric" })}</td>
                    <td>{h.before_dba != null ? fmt(h.before_dba) : "--"}</td>
                    <td>{h.after_dba != null ? fmt(h.after_dba) : "--"}</td>
                    <td>{h.reduction_db != null ? `${fmt(h.reduction_db)} dB` : "--"}</td>
                    <td>{h.status === "closed" ? "Closed" : "In progress"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="rmn-label mt-3">Levels are hover dBA at the target distance. Reductions are in dB, not percent.</p>
          </div>
        </div>
      )}
    </RamanFrame>
  );
}
