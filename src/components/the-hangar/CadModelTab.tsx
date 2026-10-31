import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CadCheck,
  CadGroup,
  CadSummary,
  CadViewerData,
  CheckSeverity,
} from "@/lib/the-hangar/cadViewerTypes";
import { CAD_GROUPS } from "@/lib/the-hangar/cadViewerTypes";
import { GROUP_COLORS, fmtNum, isOpenFinding } from "@/lib/the-hangar/cadViewerData";
import type { CadView, CadViewportHandle, SkinMode } from "./CadViewport";

// Bay 04 STEP output viewer -- the "3D model" tab: assembly tree | viewport
// | inspector. Owns the selection, skin mode, clash mode and hidden groups;
// the viewport (three.js, lazy) just draws them.

const CadViewport = lazy(() => import("./CadViewport"));

export interface FocusRequest {
  check: CadCheck;
  nonce: number;
}

export function CadModelTab({
  data,
  flags,
  focus,
  onFocusCheck,
}: {
  data: CadViewerData;
  flags: Map<string, CheckSeverity>;
  focus: FocusRequest | null;
  onFocusCheck(check: CadCheck): void;
}) {
  const { summary, mesh } = data;
  const [selected, setSelected] = useState<string | null>(null);
  const [skinMode, setSkinMode] = useState<SkinMode>("ghost");
  const [clash, setClash] = useState(false);
  const [hiddenGroups, setHiddenGroups] = useState<Set<CadGroup>>(() => new Set());
  const [openGroups, setOpenGroups] = useState<Set<CadGroup>>(
    () => new Set(CAD_GROUPS.slice(0, 3)),
  );
  const viewportRef = useRef<CadViewportHandle | null>(null);
  const viewportReady = useRef(false);
  const pendingFrame = useRef<string[] | null>(null);
  const treeRef = useRef<HTMLDivElement | null>(null);

  const parts = useMemo(() => new Map(summary.parts.map((p) => [p.name, p])), [summary]);

  const select = useCallback(
    (name: string | null) => {
      setSelected(name);
      const group = name ? parts.get(name)?.group : undefined;
      if (group) setOpenGroups((s) => (s.has(group) ? s : new Set(s).add(group)));
    },
    [parts],
  );

  // A check card (here or on the Geometry checks tab): clash mode on, first
  // part selected, camera framed on the parts it lists.
  useEffect(() => {
    if (!focus || focus.check.parts.length === 0) return;
    setClash(true);
    setSkinMode((m) => (m === "solid" ? "ghost" : m));
    select(focus.check.parts[0]);
    if (viewportReady.current) viewportRef.current?.frameParts(focus.check.parts);
    else pendingFrame.current = focus.check.parts;
  }, [focus, select]);

  const onViewportReady = useCallback(() => {
    viewportReady.current = true;
    if (pendingFrame.current) {
      viewportRef.current?.frameParts(pendingFrame.current);
      pendingFrame.current = null;
    }
  }, []);

  useEffect(() => {
    if (!selected) return;
    treeRef.current
      ?.querySelector(`[data-part="${CSS.escape(selected)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selected, openGroups]);

  function toggleClash() {
    setClash((c) => {
      if (!c) setSkinMode((m) => (m === "solid" ? "ghost" : m));
      return !c;
    });
  }

  function toggleSet<T>(set: Set<T>, v: T): Set<T> {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    return next;
  }

  return (
    <div className="hgr-cv-bench">
      <div className="hgr-cv-pane hgr-cv-tree-pane">
        <h3>
          Assembly{" "}
          <span className="hgr-cv-num hgr-cv-pane-meta">{summary.assembly.parts} parts</span>
        </h3>
        <div className="hgr-cv-tree" ref={treeRef}>
          {CAD_GROUPS.map((g) => {
            const names = summary.assembly.groups[g] ?? [];
            const open = openGroups.has(g);
            const shown = !hiddenGroups.has(g);
            return (
              <div key={g} className="hgr-cv-grp">
                <div className="hgr-cv-ghead">
                  <span className="hgr-cv-sw" style={{ background: GROUP_COLORS[g] }} />
                  <button
                    type="button"
                    className="hgr-cv-gname"
                    aria-expanded={open}
                    onClick={() => setOpenGroups((s) => toggleSet(s, g))}
                  >
                    <span className="hgr-cv-caret" aria-hidden>
                      {open ? "▾" : "▸"}
                    </span>
                    {g} <span className="hgr-cv-num hgr-cv-n">{names.length}</span>
                  </button>
                  <button
                    type="button"
                    className="hgr-cv-eye"
                    aria-pressed={shown}
                    title={shown ? `Hide ${g}` : `Show ${g}`}
                    onClick={() => setHiddenGroups((s) => toggleSet(s, g))}
                  >
                    {shown ? "Hide" : "Show"}
                  </button>
                </div>
                {open && (
                  <div className="hgr-cv-rows">
                    {names.map((n) => {
                      const f = flags.get(n);
                      return (
                        <button
                          key={n}
                          type="button"
                          data-part={n}
                          className={`hgr-cv-row${selected === n ? " hgr-cv-row-sel" : ""}`}
                          aria-current={selected === n}
                          onClick={() => select(n)}
                        >
                          <span className="hgr-cv-row-name">{n}</span>
                          {f && f !== "pass" && (
                            <span className={`hgr-cv-flag hgr-cv-bg-${f}`} title={f} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="hgr-cv-vp">
        <Suspense fallback={<div className="hgr-cv-vp-msg">Loading the 3D viewer…</div>}>
          <CadViewport
            ref={viewportRef}
            mesh={mesh}
            skinMode={skinMode}
            clash={clash}
            flags={flags}
            hiddenGroups={hiddenGroups}
            selected={selected}
            onSelect={select}
            onReady={onViewportReady}
          />
        </Suspense>
        <div className="hgr-cv-toolbar">
          <div className="hgr-cv-tg" role="group" aria-label="View">
            {(["iso", "top", "side", "front"] as CadView[]).map((v) => (
              <button
                key={v}
                type="button"
                className="hgr-cv-tbtn"
                onClick={() => viewportRef.current?.setView(v)}
              >
                {v[0].toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <div className="hgr-cv-tg" role="group" aria-label="Outer mould line">
            {(
              [
                ["solid", "Skin solid"],
                ["ghost", "Ghost"],
                ["off", "Hide"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                className="hgr-cv-tbtn"
                aria-pressed={skinMode === m}
                onClick={() => setSkinMode(m)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="hgr-cv-tg">
            <button
              type="button"
              className="hgr-cv-tbtn"
              aria-pressed={clash}
              onClick={toggleClash}
            >
              Show clashes
            </button>
          </div>
        </div>
        <div className="hgr-cv-axes">X → aft · Y → right wing · Z ↑ · mm</div>
        <div className="hgr-cv-hint">Drag to orbit · scroll to zoom · click a part</div>
      </div>

      <div className="hgr-cv-pane hgr-cv-insp-pane">
        <h3>Inspector</h3>
        <div className="hgr-cv-insp">
          {selected && parts.get(selected) ? (
            <PartInspector summary={summary} name={selected} onBack={() => select(null)} />
          ) : (
            <AssemblyOverview summary={summary} onFocusCheck={onFocusCheck} />
          )}
        </div>
      </div>
    </div>
  );
}

function AssemblyOverview({
  summary,
  onFocusCheck,
}: {
  summary: CadSummary;
  onFocusCheck(check: CadCheck): void;
}) {
  const s = summary.source;
  const open = summary.checks.filter(isOpenFinding);
  return (
    <>
      <div className="hgr-cv-pname">{summary.assembly.root}</div>
      <dl className="hgr-cv-kv">
        <dt>Schema</dt>
        <dd>{s.schema.split(" ")[0]}</dd>
        <dt>Units</dt>
        <dd>
          {summary.units.length} · {summary.units.angle}
        </dd>
        <dt>Tolerance</dt>
        <dd>{summary.units.tolerance_mm} mm</dd>
        <dt>Generator</dt>
        <dd>{s.generator.split(" · ")[0]}</dd>
        <dt>Created</dt>
        <dd>{formatDate(s.created)}</dd>
        <dt>Entities</dt>
        <dd>{fmtNum(s.entities)}</dd>
        <dt>B-rep faces</dt>
        <dd>{fmtNum(summary.assembly.faces)}</dd>
      </dl>
      {open.length > 0 && (
        <>
          <div className="hgr-cv-sect">Open findings</div>
          {open.map((c) => (
            <button
              key={c.title}
              type="button"
              className="hgr-cv-chk hgr-cv-chk-compact"
              onClick={() => onFocusCheck(c)}
            >
              <span className={`hgr-cv-bar hgr-cv-bg-${c.severity}`} />
              <span className="hgr-cv-chk-body">
                <SeverityPill severity={c.severity} />
                <span className="hgr-cv-chk-t">{c.title}</span>
              </span>
            </button>
          ))}
        </>
      )}
      <div className="hgr-cv-empty">
        Select a part in the tree or the viewport to see its properties.
      </div>
    </>
  );
}

function PartInspector({
  summary,
  name,
  onBack,
}: {
  summary: CadSummary;
  name: string;
  onBack(): void;
}) {
  const p = summary.parts.find((x) => x.name === name)!;
  const b = p.bbox_mm;
  const related = summary.checks.filter((c) => c.parts.includes(name));
  return (
    <>
      <div>
        <div className="hgr-cv-pname">{p.name}</div>
        <div className="hgr-cv-sub">{p.group}</div>
      </div>
      <dl className="hgr-cv-kv">
        <dt>Volume</dt>
        <dd>{fmtNum(p.volume_mm3)} mm³</dd>
        <dt>Surface area</dt>
        <dd>{fmtNum(p.area_mm2)} mm²</dd>
        <dt>B-rep faces</dt>
        <dd>{p.faces}</dd>
      </dl>
      <div className="hgr-cv-sect">Bounding box (mm)</div>
      <dl className="hgr-cv-kv">
        <dt>X</dt>
        <dd>
          {fmtNum(b[0], 1)} → {fmtNum(b[3], 1)}
        </dd>
        <dt>Y</dt>
        <dd>
          {fmtNum(b[1], 1)} → {fmtNum(b[4], 1)}
        </dd>
        <dt>Z</dt>
        <dd>
          {fmtNum(b[2], 1)} → {fmtNum(b[5], 1)}
        </dd>
        <dt>Size</dt>
        <dd>
          {fmtNum(b[3] - b[0], 1)} × {fmtNum(b[4] - b[1], 1)} × {fmtNum(b[5] - b[2], 1)}
        </dd>
      </dl>
      <div className="hgr-cv-sect">Centroid (mm)</div>
      <dl className="hgr-cv-kv">
        <dt>x, y, z</dt>
        <dd>{p.centroid_mm.map((v) => fmtNum(v, 1)).join(", ")}</dd>
      </dl>
      <div className="hgr-cv-sect">Material</div>
      <div className="hgr-cv-empty">Not in STEP · assigned by Bay 10</div>
      {related.length > 0 && (
        <>
          <div className="hgr-cv-sect">Findings</div>
          {related.map((c) => (
            <div key={c.title} className="hgr-cv-finding">
              <SeverityPill severity={c.severity} /> <span>{c.title}</span>
            </div>
          ))}
        </>
      )}
      <button type="button" className="hgr-cv-btn" onClick={onBack}>
        ← Back to assembly
      </button>
    </>
  );
}

export function SeverityPill({ severity }: { severity: CheckSeverity }) {
  return <span className={`hgr-cv-pill hgr-cv-bg-${severity}`}>{severity}</span>;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
