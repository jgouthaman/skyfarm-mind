import { createFileRoute, Link } from "@tanstack/react-router";
import { StudioStepNav } from "@/components/design-studio/step-nav";
import { StudioTabNav } from "@/components/design-studio/StudioTabNav";
import { useMemo, useState, useEffect } from "react";
import { useCurrentProject } from "@/lib/design-studio/store";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/mission-hub/torqwings-design-studio/components")({
  component: Components,
});

const SAFETY = new Set(["Safety buzzer", "Voltage monitor", "Obstacle sensor", "Parachute", "Landing gear"]);
const PAYLOAD = new Set(["Payload module", "Camera module", "Spray system", "Pump", "Nozzles", "Tank"]);

const DARK_VARS = {
  '--foreground':       'oklch(0.95 0.01 250)',
  '--muted-foreground': 'oklch(0.58 0.04 250)',
  '--border':           'oklch(0.95 0.01 250 / 15%)',
  '--card':             'oklch(0.14 0.04 250)',
} as React.CSSProperties;

const COMP_KEYS = ['frame', 'motors', 'esc', 'battery', 'flight_controller', 'gps', 'payload', 'propellers'];

const COMP_BADGE: Record<string, string> = {
  frame:             'bg-blue-500/20 text-blue-300 border-blue-500/30',
  motors:            'bg-green-500/20 text-green-300 border-green-500/30',
  esc:               'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  battery:           'bg-orange-500/20 text-orange-300 border-orange-500/30',
  flight_controller: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  gps:               'bg-teal-500/20 text-teal-300 border-teal-500/30',
  payload:           'bg-pink-500/20 text-pink-300 border-pink-500/30',
  propellers:        'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
};

const CONFIDENCE_BADGE: Record<string, string> = {
  high:   'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
  medium: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
  low:    'bg-red-500/15 border-red-500/30 text-red-400',
};

function Components() {
  const project = useCurrentProject();
  const rec = project?.design_recommendation ?? null;
  const hasOldList = !!project?.componentList;
  const [liveComponentList, setLiveComponentList] = useState<Record<string, unknown> | null>(null);
  const [refNotFound, setRefNotFound] = useState(false);
  const [filter, setFilter] = useState<"all" | "mandatory" | "optional" | "safety" | "payload">("all");

  const filtered = useMemo(() => {
    const list = project?.componentList ?? [];
    if (filter === "mandatory") return list.filter((c) => c.priority === "Mandatory");
    if (filter === "optional") return list.filter((c) => c.priority === "Optional" || c.priority === "Recommended");
    if (filter === "safety") return list.filter((c) => SAFETY.has(c.category));
    if (filter === "payload") return list.filter((c) => PAYLOAD.has(c.category));
    return list;
  }, [project, filter]);

  useEffect(() => {
    const refId = rec?.matched_reference?.id;
    if (!refId) return;

    const saved = rec?.matched_reference?.component_list;
    const isEmpty = !saved ||
      Array.isArray(saved) ||
      Object.keys(saved as object).length === 0;

    if (!isEmpty) {
      setLiveComponentList(saved as Record<string, unknown>);
      return;
    }

    supabase
      .from('reference_designs')
      .select('component_list')
      .eq('id', refId)
      .eq('approval_status', 'approved')
      .limit(1)
      .then(({ data }) => {
        const row = Array.isArray(data) ? data[0] : data;
        if (row?.component_list) {
          setLiveComponentList(row.component_list as Record<string, unknown>);
        } else {
          setRefNotFound(true);
        }
      });
  }, [rec?.matched_reference?.id]);

  const hasNewRec = rec !== null && (
    (rec.matched_reference?.component_list != null && !Array.isArray(rec.matched_reference.component_list)) ||
    liveComponentList !== null
  );

  if (refNotFound && !hasOldList) {
    return (
      <div className="py-12 text-center text-white/40 text-sm">
        Reference design no longer available.
        <a href="/mission-hub/torqwings-design-studio/new" className="text-[#378ADD] ml-1 hover:underline">
          Regenerate this design →
        </a>
      </div>
    );
  }

  if (!hasOldList && !hasNewRec) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/60 p-10 text-center">
        <p className="text-sm text-muted-foreground">No component list yet. Generate a design first.</p>
        <Button asChild className="mt-4"><Link to="/mission-hub/torqwings-design-studio/requirements">Open requirements</Link></Button>
      </div>
    );
  }

  if (hasNewRec) {
    const compList = (liveComponentList ?? rec!.matched_reference!.component_list) as Record<string, Record<string, unknown>>;
    const rows = COMP_KEYS.filter(k => compList[k]);
    return (
      <div className="space-y-5" style={DARK_VARS}>
        <StudioTabNav />
        <header className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Bill of Materials</h1>
            <p className="text-sm text-white/50 mt-1">
              {project!.projectName} · Based on:{' '}
              <span className="text-white/70">{rec!.matched_reference!.name}</span>
            </p>
          </div>
          <span className={`text-[11px] px-2.5 py-1 rounded-full border font-medium capitalize ${CONFIDENCE_BADGE[rec!.confidence] ?? CONFIDENCE_BADGE.low}`}>
            {rec!.confidence} confidence
          </span>
        </header>

        <div className="rounded-xl border border-white/[0.08] bg-[#0a0f1c] overflow-hidden">
          <div className="grid grid-cols-[140px_1fr_1fr_110px] gap-4 bg-[#0d1117] text-[11px] uppercase tracking-wider text-white/40 px-4 py-3">
            <span>Category</span>
            <span>Model</span>
            <span>Specs</span>
            <span></span>
          </div>
          {rows.map(key => {
            const val = compList[key];
            const model = (val?.model as string) ?? '—';
            const extras = Object.entries(val ?? {})
              .filter(([k]) => k !== 'model')
              .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
              .join(' · ');
            const badgeCls = COMP_BADGE[key] ?? 'bg-white/10 text-white/50 border-white/10';
            return (
              <div key={key} className="grid grid-cols-[140px_1fr_1fr_110px] gap-4 border-t border-white/[0.05] px-4 py-3.5 items-center">
                <span className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full border w-fit ${badgeCls}`}>
                  {key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}
                </span>
                <span className="text-white font-medium text-sm">{model}</span>
                <span className="text-white/45 text-[12px]">{extras || '—'}</span>
                <Link
                  to="/mission-hub/twbc-drone-components-library"
                  className="text-[12px] text-[#378ADD] hover:underline whitespace-nowrap"
                >
                  Find in Library →
                </Link>
              </div>
            );
          })}
        </div>
        <StudioStepNav />
      </div>
    );
  }

  const total = filtered.reduce((s, c) => s + c.estimatedCost * c.quantity, 0);
  const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  function exportCSV() {
    const header = ["Category", "Name", "Specification", "Quantity", "Unit Cost (INR)", "Total Cost (INR)", "Priority", "Source", "Source URL", "Notes"];
    const rows = filtered.map((c) => [c.category, c.name, c.specification, c.quantity, c.estimatedCost, c.quantity * c.estimatedCost, c.priority, c.sourceName ?? "", c.sourceUrl ?? "", c.notes ?? ""]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `${project!.projectName}-BOM.csv`; a.click();
    toast.success("BOM exported as CSV");
  }

  return (
    <div className="space-y-5">
      <StudioTabNav />
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Bill of Materials</h1>
          <p className="text-sm text-muted-foreground mt-1">{project.projectName} · {filtered.length} items · Est. total {inr(total)}</p>
          <p className="text-xs text-muted-foreground mt-1">Indicative pricing in INR sourced from <a href="https://robu.in" target="_blank" rel="noreferrer" className="underline text-sky-700">robu.in</a>. Click any row's source link for the latest live price.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>Export CSV</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>Download PDF</Button>
          <Button size="sm" className="bg-sky-500 hover:bg-sky-600 text-white" onClick={() => toast.success("Sent for engineering review")}>Send for Review</Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {[["all", "All"], ["mandatory", "Mandatory only"], ["optional", "Optional / Recommended"], ["safety", "Safety components"], ["payload", "Payload-specific"]].map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k as typeof filter)}
            className={`text-xs px-3 py-1.5 rounded-full border ${filter === k ? "bg-primary/15 text-primary border-primary/30" : "border-border text-muted-foreground hover:text-foreground"}`}>{label}</button>
        ))}
      </div>

      <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>{["Category", "Component", "Specification", "Qty", "Unit ₹", "Total ₹", "Priority", "Source"].map((h) => <th key={h} className="text-left font-medium px-4 py-3">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={i} className="border-t border-border/60">
                  <td className="px-4 py-2.5 text-muted-foreground">{c.category}</td>
                  <td className="px-4 py-2.5 font-medium">{c.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{c.specification}</td>
                  <td className="px-4 py-2.5">{c.quantity}</td>
                  <td className="px-4 py-2.5">{inr(c.estimatedCost)}</td>
                  <td className="px-4 py-2.5">{inr(c.quantity * c.estimatedCost)}</td>
                  <td className="px-4 py-2.5"><span className={`text-xs px-2 py-0.5 rounded-full border ${c.priority === "Mandatory" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" : c.priority === "Recommended" ? "bg-sky-500/10 text-sky-700 border-sky-500/30" : c.priority === "Advanced" ? "bg-violet-500/10 text-violet-700 border-violet-500/30" : "bg-muted/40 text-muted-foreground border-border"}`}>{c.priority}</span></td>
                  <td className="px-4 py-2.5">
                    {c.sourceUrl ? (
                      <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-sky-700 hover:underline">{c.sourceName ?? "view"} ↗</a>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <StudioStepNav />
    </div>
  );
}
