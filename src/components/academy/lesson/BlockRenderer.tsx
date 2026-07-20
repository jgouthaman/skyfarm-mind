import { useEffect, useRef, useState, type ComponentType } from "react";
import type {
  SlideBlock, RichText, InlineNode, CalloutVariant,
} from "@/lib/academy/lesson-schema";
import { RegimeBar } from "./RegimeBar";

// ---------- inline rich text (plain / em / strong / glossary term) ----------

function Term({ node }: { node: Extract<InlineNode, { kind: "term" }> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  return (
    <span
      ref={ref}
      className="lv-term"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
    >
      {node.text}
      <span className={`lv-tooltip${open ? " lv-open" : ""}`}>
        <b>{node.glossary.term}</b>
        {node.glossary.definition}
      </span>
    </span>
  );
}

export function RichTextView({ nodes }: { nodes: RichText }) {
  return (
    <>
      {nodes.map((node, i) => {
        if (node.kind === "term") return <Term key={i} node={node} />;
        if (node.kind === "em") return <em key={i}>{node.text}</em>;
        if (node.kind === "strong") return <strong key={i}>{node.text}</strong>;
        return <span key={i}>{node.text}</span>;
      })}
    </>
  );
}

// ---------- per-type block views ----------

function CalloutIcon({ variant }: { variant: CalloutVariant }) {
  const fallback: Record<CalloutVariant, string> = {
    tip: "💡", analogy: "🌀", key: "⚡", problem: "📋", note: "📝",
  };
  return <>{fallback[variant]}</>;
}

export function BlockRenderer({
  block, customComponents,
}: {
  block: SlideBlock;
  customComponents?: Record<string, ComponentType<{ props?: Record<string, unknown> }>>;
}) {
  switch (block.type) {
    case "heading": {
      const Tag = (`h${block.level}` as unknown) as "h1" | "h2" | "h3";
      return <Tag>{block.text}</Tag>;
    }

    case "lede":
      return <p className="lv-lede"><RichTextView nodes={block.text} /></p>;

    case "paragraph":
      return <p><RichTextView nodes={block.text} /></p>;

    case "formula":
      return <p className={`lv-formula lv-${block.size ?? "md"}`}>{block.expression}</p>;

    case "callout":
      return (
        <div className={`lv-callout lv-${block.variant}`}>
          <div className="lv-ico"><CalloutIcon variant={block.variant} /></div>
          <div>
            <p className="lv-h">{block.heading}</p>
            <p><RichTextView nodes={block.text} /></p>
          </div>
        </div>
      );

    case "specList":
      return (
        <div className={`lv-spec${block.variant === "red" ? " lv-red" : ""}`}>
          <div className="lv-head"><span className="lv-dot" /><h3>{block.heading}</h3></div>
          <ul>{block.items.map((item, i) => <li key={i}>{item}</li>)}</ul>
        </div>
      );

    case "markList":
      return (
        <ul className="lv-marklist">
          {block.items.map((item, i) => (
            <li key={i}>
              <span style={{ color: item.tone === "warn" ? "var(--lv-warn)" : item.tone === "ok" ? "var(--lv-ok)" : undefined }}>
                {item.icon}
              </span>
              <span><RichTextView nodes={item.text} /></span>
            </li>
          ))}
        </ul>
      );

    case "dataTable":
      return (
        <div className="lv-tbl-wrap">
          <table>
            <thead><tr>{block.columns.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "illustration":
      return (
        <div className="lv-illus">
          {block.svg && <div dangerouslySetInnerHTML={{ __html: block.svg }} />}
          {block.chart?.kind === "regimeBar" && (
            <RegimeBar
              id={`regime-${Math.random().toString(36).slice(2)}`}
              markerLog10={block.chart.markerLog10}
              minLabel={block.chart.minLabel}
              maxLabel={block.chart.maxLabel}
              bandStartLog10={block.chart.bandStartLog10}
              bandEndLog10={block.chart.bandEndLog10}
              bandLabel={block.chart.bandLabel}
            />
          )}
          <p className="lv-cap">{block.caption}</p>
        </div>
      );

    case "quickCheck":
      return <QuickCheck block={block} />;

    case "row":
      return (
        <div className="lv-grid2">
          {block.blocks.map((child, i) => <BlockRenderer key={i} block={child} customComponents={customComponents} />)}
        </div>
      );

    case "custom": {
      const Custom = customComponents?.[block.component];
      if (!Custom) {
        console.warn(`[Academy] no custom slide component registered for "${block.component}"`);
        return null;
      }
      return <Custom props={block.props} />;
    }

    default:
      return null;
  }
}

function QuickCheck({ block }: { block: Extract<SlideBlock, { type: "quickCheck" }> }) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="lv-qcheck">
      <p className="lv-q">✅ {block.question}</p>
      <div className="lv-opts">
        {block.options.map((opt, i) => {
          const classes = ["lv-opt"];
          if (selected != null) {
            if (i === block.correctIndex) classes.push("lv-correct");
            else if (i === selected) classes.push("lv-wrong");
          }
          return (
            <button
              key={i}
              className={classes.join(" ")}
              disabled={selected != null}
              onClick={() => setSelected(i)}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {selected != null && (
        <p className="lv-fb">
          {selected === block.correctIndex ? "Correct — nice intuition." : "Not quite — correct answer highlighted above."}
        </p>
      )}
    </div>
  );
}
