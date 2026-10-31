import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useHangarSession } from "@/lib/the-hangar/session";
import type { CadCheck, CadViewerData } from "@/lib/the-hangar/cadViewerTypes";
import { fmtBytes, fmtNum, loadCadViewerData, partFlags } from "@/lib/the-hangar/cadViewerData";
import { CadModelTab, type FocusRequest } from "@/components/the-hangar/CadModelTab";
import {
  ChecksTab,
  JsonTab,
  ReportTab,
  StepHeaderTab,
} from "@/components/the-hangar/CadOutputDocs";

// ─────────────────────────────────────────────────────────────────────────
// The Hangar — Bay 04 (CAD Agent) STEP output viewer. Presents one STEP
// file the way Bay 03 presents its .md and .json: tabs over one output,
// with an interactive 3D model as the main view.
//
// Phase 1 reads static fixtures (public/hangar-fixtures/bay04/) through
// loadCadViewerData(); the Cloud Run STEP converter will later write the
// same two files to Supabase Storage. three.js loads only with the 3D tab's
// viewport (React.lazy in CadModelTab), so it stays out of the main bundle.
//
// Same Hangar look as Bay 03/04 (dark nav strip, white page, blue grid),
// plus dark-scheme tokens scoped to this screen.
// ─────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/the-hangar/cad-outputs")({
  validateSearch: (s: Record<string, unknown>) => ({
    designId: (s.designId as string) || "agile_recon",
    // The vehicle design code Bay 04 generated from, when it came from there.
    from: (s.from as string) || "",
  }),
  component: TheHangarCADOutputs,
});

type TabId = "model" | "checks" | "report" | "json" | "src";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; data: CadViewerData }
  | { status: "error"; message: string };

function TheHangarCADOutputs() {
  const ready = useHangarSession();
  const { designId, from } = Route.useSearch();
  const [load, setLoad] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let live = true;
    setLoad({ status: "loading" });
    loadCadViewerData(designId)
      .then((data) => live && setLoad({ status: "ready", data }))
      .catch(
        (err) =>
          live &&
          setLoad({ status: "error", message: err instanceof Error ? err.message : String(err) }),
      );
    return () => {
      live = false;
    };
  }, [designId]);

  if (!ready) return null;

  const designName = load.status === "ready" ? load.data.summary.design.name : designId;

  return (
    <div className="hgr-cv">
      <style>{HGR_CAD_OUTPUTS_CSS}</style>

      <nav>
        <div className="hgr-cv-wrap">
          <div className="hgr-cv-crumbs">
            <Link to="/the-hangar/welcome">The Hangar</Link>
            <span className="hgr-cv-sep">/</span>
            <span>{designName}</span>
            <span className="hgr-cv-sep">/</span>
            <Link to="/the-hangar/cad-design" className="hgr-cv-crumb-bay">
              Bay 04 · CAD Agent
            </Link>
            <span className="hgr-cv-sep">/</span>
            <span className="hgr-cv-cur">Outputs</span>
          </div>
          <Link to="/the-hangar/cad-design" className="hgr-cv-exit">
            ← Back to Bay 04
          </Link>
        </div>
      </nav>

      <main className="hgr-cv-wrap hgr-cv-main">
        {load.status === "loading" && (
          <div className="hgr-cv-state" role="status">
            <span className="hgr-cv-spinner" /> Loading the CAD outputs…
          </div>
        )}
        {load.status === "error" && (
          <div className="hgr-cv-state hgr-cv-state-error" role="alert">
            {load.message}
          </div>
        )}
        {load.status === "ready" && <CadOutputs data={load.data} from={from} />}
      </main>
    </div>
  );
}

const TABS: { id: TabId; label: string; ext?: string }[] = [
  { id: "model", label: "3D model", ext: ".step" },
  { id: "checks", label: "Geometry checks" },
  { id: "report", label: "CAD report", ext: ".md" },
  { id: "json", label: "Parsed data", ext: ".json" },
  { id: "src", label: "STEP header", ext: "raw" },
];

function CadOutputs({ data, from }: { data: CadViewerData; from: string }) {
  const { summary } = data;
  // Phase 1: every design opens the one sample STEP output -- say so.
  const isSample = from !== "" && from.toLowerCase() !== summary.design.id.toLowerCase();
  const [tab, setTab] = useState<TabId>("model");
  const [focus, setFocus] = useState<FocusRequest | null>(null);
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});
  const flags = useMemo(() => partFlags(summary.checks), [summary]);
  const critical = summary.status.critical ?? 0;
  const warning = summary.status.warning ?? 0;

  function focusCheck(check: CadCheck) {
    setTab("model");
    setFocus((f) => ({ check, nonce: (f?.nonce ?? 0) + 1 }));
  }

  function onTabKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = TABS.findIndex((t) => t.id === tab);
    const next = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length].id;
    setTab(next);
    tabRefs.current[next]?.focus();
  }

  const e = summary.envelope_mm;
  const w = summary.wing_derived;

  return (
    <>
      <div className="hgr-cv-head">
        <div className="hgr-cv-head-main">
          <div className="hgr-cv-kicker">Bay 04 · CAD Agent · Outputs</div>
          <h1>{summary.design.title}</h1>
          <div className="hgr-cv-sub">{summary.design.subtitle}</div>
        </div>
        <div className="hgr-cv-file" title={summary.source.file}>
          <span className="hgr-cv-tag">STEP</span>
          <span className="hgr-cv-file-name">{summary.source.file}</span>
          <span className="hgr-cv-file-size">{fmtBytes(summary.source.size_bytes)}</span>
        </div>
      </div>

      {isSample && (
        <div className="hgr-cv-banner" role="note">
          CAD model for <b>{from}</b> saved. The STEP converter isn't connected yet, so this view
          shows the sample STEP output ({summary.design.name}) — per-design STEP files come with the
          converter.
        </div>
      )}

      <div className="hgr-cv-kpis">
        <Kpi label="Length" value={fmtNum(e.length)} unit="mm" />
        <Kpi label="Wingspan" value={fmtNum(e.span)} unit="mm" />
        <Kpi label="Height" value={fmtNum(e.height)} unit="mm" />
        <Kpi label="Wing area*" value={w.ref_area_m2.toFixed(3)} unit="m²" />
        <Kpi label="Aspect ratio*" value={w.aspect_ratio.toFixed(2)} />
        <Kpi
          label="Parts / solids"
          value={fmtNum(summary.assembly.parts)}
          unit={`/ ${fmtNum(summary.assembly.brep_solids)}`}
        />
        <div className="hgr-cv-kpi">
          <div className="hgr-cv-kpi-l">Checks</div>
          <div className="hgr-cv-kpi-v">
            <span className="hgr-cv-c-critical">{critical}</span>
            <small>critical</small> <span className="hgr-cv-c-warning">{warning}</span>
            <small>warn</small>
          </div>
        </div>
      </div>

      <div className="hgr-cv-tabs" role="tablist" aria-label="CAD outputs" onKeyDown={onTabKey}>
        {TABS.map((t) => (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[t.id] = el;
            }}
            type="button"
            role="tab"
            id={`hgr-cv-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`hgr-cv-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            className="hgr-cv-tab"
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.ext && <span className="hgr-cv-ext">{t.ext}</span>}
            {t.id === "checks" && critical + warning > 0 && (
              <span className="hgr-cv-cnt">{critical + warning}</span>
            )}
          </button>
        ))}
      </div>

      {/* The 3D tab stays mounted once opened (hidden, not unmounted) so the
          camera and the WebGL context survive tab switches. */}
      <section
        id="hgr-cv-panel-model"
        role="tabpanel"
        aria-labelledby="hgr-cv-tab-model"
        hidden={tab !== "model"}
      >
        <CadModelTab data={data} flags={flags} focus={focus} onFocusCheck={focusCheck} />
        <p className="hgr-cv-note">
          * Wing area, aspect ratio and taper are derived from the rib stations (root chord{" "}
          {fmtNum(w.root_chord_mm)} mm, tip chord {fmtNum(w.tip_chord_mm)} mm, taper{" "}
          {w.taper_ratio.toFixed(2)}). The mesh is a display tessellation; properties come from the
          exact B-rep.
        </p>
      </section>
      {tab !== "model" && (
        <section id={`hgr-cv-panel-${tab}`} role="tabpanel" aria-labelledby={`hgr-cv-tab-${tab}`}>
          {tab === "checks" && <ChecksTab checks={summary.checks} onFocusCheck={focusCheck} />}
          {tab === "report" && <ReportTab summary={summary} />}
          {tab === "json" && <JsonTab summary={summary} />}
          {tab === "src" && <StepHeaderTab summary={summary} />}
        </section>
      )}
    </>
  );
}

function Kpi({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="hgr-cv-kpi">
      <div className="hgr-cv-kpi-l">{label}</div>
      <div className="hgr-cv-kpi-v">
        {value}
        {unit && <small>{unit}</small>}
      </div>
    </div>
  );
}

const HGR_CAD_OUTPUTS_CSS = `
.hgr-cv{
  /* Same light theme as Bay 03/04 (white page, blue grid, light panels).
     Severity tokens (crit/warn/info/pass) are separate from the brand
     accent; --hgr-cv-sel (teal) is the 3D selection and must stay distinct
     from --hgr-cv-warn (amber). */
  --hgr-cv-bg:#FFFFFF; --hgr-cv-grid-bg:rgba(62,124,166,0.14);
  --hgr-cv-panel:#FFFFFF; --hgr-cv-sunk:#F2F7FB; --hgr-cv-sunk-2:#E4EEF7; --hgr-cv-line:rgba(62,124,166,0.28);
  --hgr-cv-fg:#12222F; --hgr-cv-muted:#4F6B80;
  --hgr-cv-accent:#1C74B8; --hgr-cv-accent-soft:#DCEBF7; --hgr-cv-sel:#0F9FA8;
  --hgr-cv-crit:#C0392B; --hgr-cv-warn:#B4690E; --hgr-cv-info:#2E6F9E; --hgr-cv-pass:#2E8B57;
  --hgr-cv-vp-top:#E8EEF4; --hgr-cv-vp-bot:#CDD8E3; --hgr-cv-grid:#AAB6C4; --hgr-cv-edge:#223344;
  --hgr-cv-j-key:#1C74B8; --hgr-cv-j-str:#1F6E43; --hgr-cv-j-num:#0F7C84; --hgr-cv-j-lit:#B4690E;

  background:var(--hgr-cv-bg); color:var(--hgr-cv-fg); font-family:'IBM Plex Sans', sans-serif; font-size:14px; line-height:1.45;
  background-image:linear-gradient(var(--hgr-cv-grid-bg) 1px, transparent 1px), linear-gradient(90deg, var(--hgr-cv-grid-bg) 1px, transparent 1px);
  background-size:44px 44px;
  min-height:100vh;
}
@media (prefers-color-scheme: dark){
  .hgr-cv{
    --hgr-cv-bg:#0F141B; --hgr-cv-grid-bg:rgba(111,180,224,0.06);
    --hgr-cv-panel:#161D26; --hgr-cv-sunk:#1D2631; --hgr-cv-sunk-2:#232E3B; --hgr-cv-line:#2A3644;
    --hgr-cv-fg:#E4E9EF; --hgr-cv-muted:#8E9BAB;
    --hgr-cv-accent:#6AA7E8; --hgr-cv-accent-soft:#1D3047; --hgr-cv-sel:#3FD3DC;
    --hgr-cv-crit:#EF6B60; --hgr-cv-warn:#E2AD45; --hgr-cv-info:#6AA7E8; --hgr-cv-pass:#5CC488;
    --hgr-cv-vp-top:#1B2430; --hgr-cv-vp-bot:#0E131A; --hgr-cv-grid:#334255; --hgr-cv-edge:#0A0F14;
    --hgr-cv-j-key:#6AA7E8; --hgr-cv-j-str:#5CC488; --hgr-cv-j-num:#3FD3DC; --hgr-cv-j-lit:#E2AD45;
    color-scheme:dark;
  }
}
.hgr-cv *{ box-sizing:border-box; }
.hgr-cv h1,.hgr-cv h2,.hgr-cv h3{ font-family:'Space Grotesk', sans-serif; font-weight:600; letter-spacing:-0.01em; margin:0; }
.hgr-cv a{ color:inherit; }
.hgr-cv-wrap{ max-width:1480px; margin:0 auto; padding:0 max(16px, env(safe-area-inset-left, 0px)); }
.hgr-cv-num{ font-variant-numeric:tabular-nums; }

/* Dark nav strip, same as Bay 03/04. */
.hgr-cv nav{ border-bottom:1px solid rgba(111,180,224,0.22); position:sticky; top:0; background:rgba(10,24,38,0.92); backdrop-filter:blur(10px); z-index:20; color:#ECEFF3; }
.hgr-cv nav .hgr-cv-wrap{ display:flex; align-items:center; justify-content:space-between; gap:12px; min-height:68px; flex-wrap:wrap; padding-top:10px; padding-bottom:10px; }
.hgr-cv-crumbs{ font-size:14px; color:#8FA5BB; display:flex; align-items:center; gap:8px; flex-wrap:wrap; min-width:0; }
.hgr-cv-crumbs a{ text-decoration:none; color:#8FA5BB; }
.hgr-cv-crumbs a:hover{ color:#6FB4E0; }
.hgr-cv-crumbs .hgr-cv-crumb-bay{ color:#6FB4E0; font-weight:600; }
.hgr-cv-sep{ color:#3E7CA6; }
.hgr-cv-cur{ color:#ECEFF3; font-weight:500; }
.hgr-cv-exit{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:#8FA5BB; text-decoration:none; border:1px solid rgba(111,180,224,0.22); padding:8px 15px; border-radius:2px; white-space:nowrap; }
.hgr-cv-exit:hover{ color:#ECEFF3; border-color:#6FB4E0; }

.hgr-cv-main{ display:flex; flex-direction:column; gap:14px; padding-top:24px; padding-bottom:64px; }
.hgr-cv-state{ display:flex; align-items:center; gap:10px; padding:40px 0; font-family:'IBM Plex Mono',monospace; font-size:13px; color:var(--hgr-cv-muted); }
.hgr-cv-state-error{ color:var(--hgr-cv-crit); }
.hgr-cv-spinner{ width:13px; height:13px; border-radius:50%; border:2px solid var(--hgr-cv-line); border-top-color:var(--hgr-cv-accent); animation:hgr-cv-spin .8s linear infinite; flex-shrink:0; }
@keyframes hgr-cv-spin{ to{ transform:rotate(360deg); } }

.hgr-cv-head{ display:flex; flex-wrap:wrap; gap:12px 24px; align-items:flex-end; justify-content:space-between; }
.hgr-cv-head-main{ min-width:0; }
.hgr-cv-kicker{ font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--hgr-cv-warn); }
.hgr-cv h1{ font-size:28px; line-height:1.15; margin-top:4px; text-wrap:balance; }
.hgr-cv-sub{ color:var(--hgr-cv-muted); font-size:13px; margin-top:4px; }
.hgr-cv-banner{ font-size:13px; color:var(--hgr-cv-fg); background:var(--hgr-cv-sunk); border:1px solid var(--hgr-cv-line); border-left:3px solid var(--hgr-cv-info); padding:9px 14px; }
.hgr-cv-banner b{ font-family:'IBM Plex Mono',monospace; font-weight:600; }
.hgr-cv-file{ display:inline-flex; align-items:center; gap:8px; font-family:'IBM Plex Mono',monospace; font-size:12px; background:var(--hgr-cv-panel); border:1px solid var(--hgr-cv-line); border-radius:2px; padding:6px 10px; max-width:100%; min-width:0; }
.hgr-cv-file-name{ white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; }
.hgr-cv-file-size{ color:var(--hgr-cv-muted); white-space:nowrap; font-variant-numeric:tabular-nums; }
.hgr-cv-tag{ font-family:'IBM Plex Mono',monospace; font-weight:700; font-size:10.5px; letter-spacing:.08em; padding:2px 6px; border-radius:2px; background:var(--hgr-cv-accent-soft); color:var(--hgr-cv-accent); }

.hgr-cv-kpis{ display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:1px; background:var(--hgr-cv-line); border:1px solid var(--hgr-cv-line); overflow:hidden; }
.hgr-cv-kpi{ background:var(--hgr-cv-panel); padding:10px 12px; min-width:0; }
.hgr-cv-kpi-l{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-cv-muted); }
.hgr-cv-kpi-v{ font-family:'Space Grotesk',sans-serif; font-weight:600; font-size:22px; font-variant-numeric:tabular-nums; margin-top:2px; }
.hgr-cv-kpi-v small{ font-family:'IBM Plex Sans',sans-serif; font-size:12px; color:var(--hgr-cv-muted); font-weight:400; margin-left:3px; }
.hgr-cv-c-critical{ color:var(--hgr-cv-crit); }
.hgr-cv-c-warning{ color:var(--hgr-cv-warn); }

.hgr-cv-tabs{ display:flex; gap:2px; border-bottom:1px solid var(--hgr-cv-line); overflow-x:auto; }
.hgr-cv-tab{ font-family:'IBM Plex Mono',monospace; font-size:12px; font-weight:700; letter-spacing:.04em; padding:10px 14px; border:none; background:none; color:var(--hgr-cv-muted); cursor:pointer; border-bottom:3px solid transparent; margin-bottom:-1px; white-space:nowrap; display:flex; gap:7px; align-items:center; }
.hgr-cv-tab:hover{ color:var(--hgr-cv-fg); }
.hgr-cv-tab[aria-selected="true"]{ color:var(--hgr-cv-fg); border-bottom-color:var(--hgr-cv-accent); }
.hgr-cv-ext{ font-weight:500; font-size:11px; color:var(--hgr-cv-muted); }
.hgr-cv-cnt{ font-family:'IBM Plex Sans',sans-serif; font-weight:600; font-size:11px; background:var(--hgr-cv-crit); color:#fff; border-radius:9px; padding:0 6px; font-variant-numeric:tabular-nums; }
.hgr-cv button:focus-visible{ outline:2px solid var(--hgr-cv-accent); outline-offset:2px; }

/* 3D tab: tree | viewport | inspector; stacks on phones, viewport first. */
.hgr-cv-bench{ display:grid; grid-template-columns:250px minmax(0,1fr) 290px; gap:12px; align-items:stretch; }
.hgr-cv-pane{ background:var(--hgr-cv-panel); border:1px solid var(--hgr-cv-line); min-width:0; display:flex; flex-direction:column; }
.hgr-cv-pane h3{ font-family:'IBM Plex Mono',monospace; font-weight:700; font-size:11.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-cv-muted); padding:10px 12px; border-bottom:1px solid var(--hgr-cv-line); display:flex; justify-content:space-between; align-items:center; }
.hgr-cv-pane-meta{ font-weight:400; }
.hgr-cv-tree{ overflow:auto; max-height:600px; padding:4px 0; }
.hgr-cv-grp{ border-bottom:1px solid var(--hgr-cv-line); }
.hgr-cv-grp:last-child{ border-bottom:0; }
.hgr-cv-ghead{ display:flex; align-items:center; gap:8px; padding:7px 10px; }
.hgr-cv-sw{ width:10px; height:10px; border-radius:2px; flex:none; }
.hgr-cv-gname{ flex:1; min-width:0; text-align:left; background:none; border:0; padding:0; color:var(--hgr-cv-fg); font:600 13px 'IBM Plex Sans',sans-serif; cursor:pointer; display:flex; gap:6px; align-items:baseline; }
.hgr-cv-caret{ color:var(--hgr-cv-muted); font-size:10px; width:8px; }
.hgr-cv-n{ color:var(--hgr-cv-muted); font-weight:400; font-size:12px; }
.hgr-cv-eye{ border:1px solid var(--hgr-cv-line); background:var(--hgr-cv-sunk); color:var(--hgr-cv-muted); font:500 11px 'IBM Plex Sans',sans-serif; border-radius:2px; padding:1px 6px; cursor:pointer; min-width:42px; }
.hgr-cv-eye[aria-pressed="false"]{ color:var(--hgr-cv-accent); border-color:var(--hgr-cv-accent); }
.hgr-cv-rows{ display:flex; flex-direction:column; padding-bottom:4px; }
.hgr-cv-row{ display:flex; justify-content:space-between; gap:8px; padding:4px 10px 4px 34px; font-family:'IBM Plex Mono',monospace; font-size:11.5px; cursor:pointer; color:var(--hgr-cv-fg); background:none; border:0; text-align:left; width:100%; }
.hgr-cv-row:hover{ background:var(--hgr-cv-sunk); }
.hgr-cv-row-sel,.hgr-cv-row-sel:hover{ background:var(--hgr-cv-accent-soft); color:var(--hgr-cv-accent); }
.hgr-cv-row-name{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; }
.hgr-cv-flag{ width:7px; height:7px; border-radius:50%; flex:none; align-self:center; }

.hgr-cv-vp{ position:relative; min-height:600px; overflow:hidden; background:linear-gradient(var(--hgr-cv-vp-top), var(--hgr-cv-vp-bot)); border:1px solid var(--hgr-cv-line); min-width:0; }
.hgr-cv-canvas{ position:absolute; inset:0; }
.hgr-cv-canvas canvas{ display:block; width:100%; height:100%; touch-action:none; }
.hgr-cv-vp-msg{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; padding:24px; text-align:center; font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-cv-muted); }
.hgr-cv-vp-msg[role="alert"]{ color:var(--hgr-cv-crit); }
.hgr-cv-toolbar{ position:absolute; top:10px; left:10px; right:10px; display:flex; gap:6px; flex-wrap:wrap; pointer-events:none; }
.hgr-cv-tg{ display:flex; background:var(--hgr-cv-panel); border:1px solid var(--hgr-cv-line); border-radius:2px; overflow:hidden; pointer-events:auto; }
.hgr-cv-tbtn{ border:0; border-right:1px solid var(--hgr-cv-line); background:none; color:var(--hgr-cv-fg); font:500 12px 'IBM Plex Sans',sans-serif; padding:5px 9px; cursor:pointer; }
.hgr-cv-tbtn:last-child{ border-right:0; }
.hgr-cv-tbtn:hover{ background:var(--hgr-cv-sunk); }
.hgr-cv-tbtn[aria-pressed="true"]{ background:var(--hgr-cv-accent); color:#fff; }
.hgr-cv-axes{ position:absolute; left:12px; bottom:10px; font:500 11px 'IBM Plex Mono',monospace; color:var(--hgr-cv-muted); pointer-events:none; }
.hgr-cv-hint{ position:absolute; right:12px; bottom:10px; font-size:11px; color:var(--hgr-cv-muted); pointer-events:none; text-align:right; }

.hgr-cv-insp{ padding:12px; display:flex; flex-direction:column; gap:12px; overflow:auto; max-height:600px; }
.hgr-cv-pname{ font-family:'IBM Plex Mono',monospace; font-size:13px; font-weight:500; word-break:break-all; }
.hgr-cv-kv{ margin:0; display:grid; grid-template-columns:auto 1fr; gap:5px 12px; font-size:12.5px; }
.hgr-cv-kv dt{ color:var(--hgr-cv-muted); }
.hgr-cv-kv dd{ margin:0; text-align:right; font-family:'IBM Plex Mono',monospace; font-variant-numeric:tabular-nums; }
.hgr-cv-sect{ font-family:'IBM Plex Mono',monospace; font-weight:700; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-cv-muted); border-top:1px solid var(--hgr-cv-line); padding-top:10px; }
.hgr-cv-empty{ color:var(--hgr-cv-muted); font-size:13px; }
.hgr-cv-finding{ font-size:13px; display:flex; gap:6px; align-items:baseline; }
.hgr-cv-btn{ align-self:flex-start; font-family:'IBM Plex Mono',monospace; font-size:12px; color:var(--hgr-cv-accent); background:var(--hgr-cv-panel); border:1px solid var(--hgr-cv-line); border-radius:2px; padding:6px 12px; cursor:pointer; }
.hgr-cv-btn:hover{ background:var(--hgr-cv-sunk); }

/* Check cards (Geometry checks tab + inspector). */
.hgr-cv-checks{ display:flex; flex-direction:column; gap:8px; }
.hgr-cv-chk{ display:grid; grid-template-columns:4px 1fr; gap:0 10px; background:var(--hgr-cv-panel); border:1px solid var(--hgr-cv-line); border-radius:2px; padding:9px 10px 9px 0; cursor:pointer; text-align:left; color:var(--hgr-cv-fg); font:inherit; width:100%; }
.hgr-cv-chk:hover{ border-color:var(--hgr-cv-accent); }
.hgr-cv-chk-static{ cursor:default; }
.hgr-cv-chk-static:hover{ border-color:var(--hgr-cv-line); }
.hgr-cv-bar{ border-radius:0 2px 2px 0; }
.hgr-cv-chk-body{ display:flex; flex-direction:column; gap:2px; min-width:0; }
.hgr-cv-chk-compact .hgr-cv-chk-body{ align-items:flex-start; gap:4px; }
.hgr-cv-chk-t{ font-weight:600; font-size:13px; display:flex; gap:8px; align-items:baseline; flex-wrap:wrap; }
.hgr-cv-chk-d{ font-size:12.5px; color:var(--hgr-cv-muted); font-variant-numeric:tabular-nums; }
.hgr-cv-chk-r{ font-size:11.5px; color:var(--hgr-cv-accent); margin-top:2px; font-family:'IBM Plex Mono',monospace; }
.hgr-cv-pill{ font:700 10px 'IBM Plex Sans',sans-serif; letter-spacing:.07em; text-transform:uppercase; padding:1px 6px; border-radius:9px; color:#fff; white-space:nowrap; }
.hgr-cv-bg-critical{ background:var(--hgr-cv-crit); }
.hgr-cv-bg-warning{ background:var(--hgr-cv-warn); }
.hgr-cv-bg-info{ background:var(--hgr-cv-info); }
.hgr-cv-bg-pass{ background:var(--hgr-cv-pass); }
@media (prefers-color-scheme: dark){ .hgr-cv-pill{ color:#0F141B; } }

/* Document tabs. */
.hgr-cv-doc{ background:var(--hgr-cv-panel); border:1px solid var(--hgr-cv-line); padding:20px max(16px,3vw); min-width:0; }
.hgr-cv-dochead{ display:flex; justify-content:space-between; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:12px; }
.hgr-cv-meta{ font-family:'IBM Plex Mono',monospace; font-size:12px; color:var(--hgr-cv-muted); font-variant-numeric:tabular-nums; }
.hgr-cv-md{ max-width:86ch; font-size:14px; line-height:1.6; }
.hgr-cv-md h2{ font-size:22px; margin:0 0 4px; }
.hgr-cv-md h3{ font-size:16px; margin:22px 0 6px; padding-top:12px; border-top:1px solid var(--hgr-cv-line); }
.hgr-cv-md table{ border-collapse:collapse; font-size:13px; width:100%; display:block; overflow-x:auto; }
.hgr-cv-md th,.hgr-cv-md td{ border-bottom:1px solid var(--hgr-cv-line); padding:5px 8px; text-align:left; font-variant-numeric:tabular-nums; }
.hgr-cv-md td[style*="right"]{ font-family:'IBM Plex Mono',monospace; }
.hgr-cv-md th{ color:var(--hgr-cv-muted); font-weight:500; font-size:12px; }
.hgr-cv-md code{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; background:var(--hgr-cv-sunk); padding:1px 5px; border-radius:2px; }
.hgr-cv-md ul,.hgr-cv-md ol{ padding-left:22px; }
.hgr-cv-entity-table{ margin-top:16px; }
.hgr-cv-tw{ overflow-x:auto; }
.hgr-cv-entity-table table{ display:table; }
.hgr-cv-td-num{ text-align:right !important; font-family:'IBM Plex Mono',monospace; }
.hgr-cv-code{ margin:0; font:12px/1.5 'IBM Plex Mono',monospace; background:var(--hgr-cv-sunk); border:1px solid var(--hgr-cv-line); border-radius:2px; padding:14px; overflow:auto; max-height:640px; color:var(--hgr-cv-fg); white-space:pre; }
.hgr-cv-j-key{ color:var(--hgr-cv-j-key); }
.hgr-cv-j-str{ color:var(--hgr-cv-j-str); }
.hgr-cv-j-num{ color:var(--hgr-cv-j-num); }
.hgr-cv-j-lit{ color:var(--hgr-cv-j-lit); }
.hgr-cv-note{ font-size:12px; color:var(--hgr-cv-muted); margin:8px 0 0; }

@media (max-width:1100px){
  .hgr-cv-bench{ grid-template-columns:220px minmax(0,1fr); }
  .hgr-cv-insp-pane{ grid-column:1 / -1; }
  .hgr-cv-insp,.hgr-cv-tree{ max-height:none; }
}
@media (max-width:720px){
  .hgr-cv-bench{ grid-template-columns:1fr; }
  .hgr-cv-vp{ min-height:420px; order:-1; }
  .hgr-cv-tree{ max-height:320px; }
  .hgr-cv h1{ font-size:23px; }
  .hgr-cv-hint{ left:12px; right:auto; bottom:28px; text-align:left; }
}
@media (prefers-reduced-motion: reduce){ .hgr-cv *{ animation:none !important; transition:none !important; } }
`;
