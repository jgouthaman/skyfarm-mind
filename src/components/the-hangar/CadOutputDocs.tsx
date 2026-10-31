import { useMemo, useRef, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { CadCheck, CadSummary, CheckSeverity } from "@/lib/the-hangar/cadViewerTypes";
import { CAD_GROUPS } from "@/lib/the-hangar/cadViewerTypes";
import { SEVERITY_RANK, fmtNum } from "@/lib/the-hangar/cadViewerData";
import { SeverityPill } from "./CadModelTab";

// Bay 04 STEP output viewer -- the document tabs: Geometry checks, CAD
// report (.md, rendered with the same react-markdown + remark-gfm as Bay
// 03's report), Parsed data (.json) and the raw STEP header.

// ── Geometry checks ───────────────────────────────────────────────────────

export function ChecksTab({
  checks,
  onFocusCheck,
}: {
  checks: CadCheck[];
  onFocusCheck(check: CadCheck): void;
}) {
  return (
    <div className="hgr-cv-checks">
      {checks.map((c) => {
        const viewable = c.parts.length > 0;
        return (
          <button
            key={c.title}
            type="button"
            className={`hgr-cv-chk${viewable ? "" : " hgr-cv-chk-static"}`}
            onClick={viewable ? () => onFocusCheck(c) : undefined}
            aria-disabled={!viewable}
          >
            <span className={`hgr-cv-bar hgr-cv-bg-${c.severity}`} />
            <span className="hgr-cv-chk-body">
              <span className="hgr-cv-chk-t">
                <SeverityPill severity={c.severity} />
                {c.title}
              </span>
              <span className="hgr-cv-chk-d">{c.detail}</span>
              {(c.route || viewable) && (
                <span className="hgr-cv-chk-r">
                  {c.route && <>Route to {c.route}</>}
                  {c.route && viewable && " · "}
                  {viewable && "View in model →"}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── CAD report (.md) ──────────────────────────────────────────────────────

const SEVERITIES: CheckSeverity[] = ["critical", "warning", "info", "pass"];

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function buildCadReport(s: CadSummary): string {
  const e = s.envelope_mm;
  const w = s.wing_derived;
  const counts = SEVERITIES.map((sev) => `${s.status[sev] ?? 0} ${sev}`).join(", ");
  const critical = s.checks.filter((c) => c.severity === "critical");
  const largest = [...s.parts].sort((a, b) => b.volume_mm3 - a.volume_mm3).slice(0, 8);
  const actions = s.checks
    .filter((c) => c.route && c.severity !== "pass")
    .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);

  const lines = [
    `## CAD Report — ${s.design.name}`,
    ``,
    `Source: \`${s.source.file}\` · ${s.source.schema} · ${s.units.length} · ${s.source.generator}`,
    ``,
    `### Summary`,
    ``,
    `\`${s.assembly.root}\` is a single-root assembly of ${s.assembly.parts} parts (${fmtNum(s.assembly.brep_solids)} B-rep solids, ${fmtNum(s.assembly.faces)} faces). ` +
      `The overall envelope is ${fmtNum(e.length)} × ${fmtNum(e.span)} × ${fmtNum(e.height)} mm (length × span × height). ` +
      `Geometry checks: ${counts}.` +
      (critical.length
        ? ` ${critical.length === 1 ? "The critical finding" : "The critical findings"} — ${critical.map((c) => c.title.toLowerCase()).join("; ")} — must be resolved before hand-off.`
        : ""),
    ``,
    `### Configuration`,
    ``,
    `- Main wing: root chord ${fmtNum(w.root_chord_mm)} mm, tip chord ${fmtNum(w.tip_chord_mm)} mm, taper ${w.taper_ratio.toFixed(2)}, LE sweep ≈${fmtNum(w.le_sweep_deg)}°.`,
    `- Reference wing area ${w.ref_area_m2.toFixed(3)} m², aspect ratio ${w.aspect_ratio.toFixed(2)} (${w.note}).`,
    ...CAD_GROUPS.map((g) => {
      const names = s.assembly.groups[g] ?? [];
      return `- ${g}: ${names.length <= 4 ? names.map((n) => `\`${n}\``).join(", ") : plural(names.length, "part")}.`;
    }),
    ``,
    `### Findings`,
    ``,
    `| Check | Status | Route |`,
    `| --- | --- | --- |`,
    ...s.checks.map((c) => `| ${c.title} | \`${c.severity}\` | ${c.route ?? "—"} |`),
    ``,
    `### Largest parts by volume`,
    ``,
    `| Part | Group | Volume (mm³) | Area (mm²) |`,
    `| --- | --- | ---: | ---: |`,
    ...largest.map(
      (p) => `| \`${p.name}\` | ${p.group} | ${fmtNum(p.volume_mm3)} | ${fmtNum(p.area_mm2)} |`,
    ),
    ``,
    `### Recommended next steps`,
    ``,
    ...(actions.length
      ? actions.map(
          (c, i) => `${i + 1}. **${c.route}** — ${c.title} (\`${c.severity}\`). ${c.detail}`,
        )
      : ["1. No open findings — hand off to Bay 05."]),
  ];
  return lines.join("\n");
}

const isSeverity = (v: string): v is CheckSeverity => (SEVERITIES as string[]).includes(v);

export function ReportTab({ summary }: { summary: CadSummary }) {
  const md = useMemo(() => buildCadReport(summary), [summary]);
  return (
    <div className="hgr-cv-doc">
      <DocHead meta={`${summary.design.id.toUpperCase()}_cad_report.md · generated by Bay 04`}>
        <DownloadButton
          name={`${summary.design.id}_cad_report.md`}
          type="text/markdown"
          body={md}
          label="Download .md"
        />
      </DocHead>
      <div className="hgr-cv-md">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // `critical` etc. in the report render as severity pills.
            code: ({ children }) => {
              const text = String(children);
              return isSeverity(text) ? <SeverityPill severity={text} /> : <code>{children}</code>;
            },
          }}
        >
          {md}
        </ReactMarkdown>
      </div>
    </div>
  );
}

// ── Parsed data (.json) ───────────────────────────────────────────────────

const JSON_TOKEN =
  /("(?:\\.|[^"\\])*")(\s*:)?|\b(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|\b(true|false|null)\b/g;

function highlightJson(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(JSON_TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const [whole, str, colon, num, lit] = m;
    if (str !== undefined) {
      out.push(
        <span key={i++} className={colon ? "hgr-cv-j-key" : "hgr-cv-j-str"}>
          {str}
        </span>,
      );
      if (colon) out.push(colon);
    } else if (num !== undefined) {
      out.push(
        <span key={i++} className="hgr-cv-j-num">
          {num}
        </span>,
      );
    } else if (lit !== undefined) {
      out.push(
        <span key={i++} className="hgr-cv-j-lit">
          {lit}
        </span>,
      );
    }
    last = at + whole.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function JsonTab({ summary }: { summary: CadSummary }) {
  const raw = useMemo(() => JSON.stringify(summary, null, 2), [summary]);
  const highlighted = useMemo(() => highlightJson(raw), [raw]);
  const preRef = useRef<HTMLPreElement | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy JSON");

  function copy() {
    navigator.clipboard
      .writeText(raw)
      .then(() => setCopyLabel("Copied"))
      .catch(() => {
        // No clipboard permission: select the block so Ctrl+C works.
        const range = document.createRange();
        range.selectNodeContents(preRef.current!);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        setCopyLabel("Selected — press Ctrl+C");
      })
      .finally(() => window.setTimeout(() => setCopyLabel("Copy JSON"), 2000));
  }

  return (
    <div className="hgr-cv-doc">
      <DocHead meta={`${summary.design.id.toUpperCase()}_cad_summary.json · handed to Bays 05–13`}>
        <button type="button" className="hgr-cv-btn" onClick={copy}>
          {copyLabel}
        </button>
      </DocHead>
      <pre className="hgr-cv-code" ref={preRef}>
        {highlighted}
      </pre>
    </div>
  );
}

// ── STEP header (raw) ─────────────────────────────────────────────────────

export function StepHeaderTab({ summary }: { summary: CadSummary }) {
  const { lines } = summary.step_header;
  return (
    <div className="hgr-cv-doc">
      <DocHead
        meta={`ISO 10303-21 · first ${lines.length} lines of ${fmtNum(summary.source.line_count)} · ${fmtNum(summary.source.entities)} entities`}
      />
      <pre className="hgr-cv-code">{lines.join("\n")}</pre>
      <div className="hgr-cv-md hgr-cv-entity-table">
        <div className="hgr-cv-tw">
          <table>
            <thead>
              <tr>
                <th>Entity type</th>
                <th style={{ textAlign: "right" }}>Count</th>
              </tr>
            </thead>
            <tbody>
              {summary.entity_counts.map((e) => (
                <tr key={e.type}>
                  <td>
                    <code>{e.type}</code>
                  </td>
                  <td className="hgr-cv-td-num">{fmtNum(e.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Small pieces ──────────────────────────────────────────────────────────

function DocHead({ meta, children }: { meta: string; children?: ReactNode }) {
  return (
    <div className="hgr-cv-dochead">
      <span className="hgr-cv-meta">{meta}</span>
      {children}
    </div>
  );
}

// Same blob download as Bay 03's VehicleDesignReport.
function DownloadButton({
  name,
  type,
  body,
  label,
}: {
  name: string;
  type: string;
  body: string;
  label: string;
}) {
  function download() {
    const url = URL.createObjectURL(new Blob([body], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <button type="button" className="hgr-cv-btn" onClick={download}>
      ↓ {label}
    </button>
  );
}
