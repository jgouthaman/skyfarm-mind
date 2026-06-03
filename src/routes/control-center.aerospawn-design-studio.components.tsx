import { createFileRoute, Link } from "@tanstack/react-router";
import { StudioStepNav } from "@/components/design-studio/step-nav";
import { useMemo, useState } from "react";
import { useCurrentProject } from "@/lib/design-studio/store";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/control-center/aerospawn-design-studio/components")({
  component: Components,
});

const SAFETY = new Set(["Safety buzzer", "Voltage monitor", "Obstacle sensor", "Parachute", "Landing gear"]);
const PAYLOAD = new Set(["Payload module", "Camera module", "Spray system", "Pump", "Nozzles", "Tank"]);

function Components() {
  const project = useCurrentProject();
  const [filter, setFilter] = useState<"all" | "mandatory" | "optional" | "safety" | "payload">("all");

  const filtered = useMemo(() => {
    const list = project?.componentList ?? [];
    if (filter === "mandatory") return list.filter((c) => c.priority === "Mandatory");
    if (filter === "optional") return list.filter((c) => c.priority === "Optional" || c.priority === "Recommended");
    if (filter === "safety") return list.filter((c) => SAFETY.has(c.category));
    if (filter === "payload") return list.filter((c) => PAYLOAD.has(c.category));
    return list;
  }, [project, filter]);

  if (!project?.componentList) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/60 p-10 text-center">
        <p className="text-sm text-muted-foreground">No component list yet. Generate a design first.</p>
        <Button asChild className="mt-4"><Link to="/control-center/aerospawn-design-studio/requirements">Open requirements</Link></Button>
      </div>
    );
  }

  const total = filtered.reduce((s, c) => s + c.estimatedCost * c.quantity, 0);

  function exportCSV() {
    const header = ["Category", "Name", "Specification", "Quantity", "Unit Cost", "Total Cost", "Priority", "Notes"];
    const rows = filtered.map((c) => [c.category, c.name, c.specification, c.quantity, c.estimatedCost, c.quantity * c.estimatedCost, c.priority, c.notes ?? ""]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `${project!.projectName}-BOM.csv`; a.click();
    toast.success("BOM exported as CSV");
  }

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Bill of Materials</h1>
          <p className="text-sm text-muted-foreground mt-1">{project.projectName} · {filtered.length} items · Est. total ${total.toLocaleString()}</p>
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
              <tr>{["Category", "Component", "Specification", "Qty", "Unit $", "Total $", "Priority"].map((h) => <th key={h} className="text-left font-medium px-4 py-3">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={i} className="border-t border-border/60">
                  <td className="px-4 py-2.5 text-muted-foreground">{c.category}</td>
                  <td className="px-4 py-2.5 font-medium">{c.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{c.specification}</td>
                  <td className="px-4 py-2.5">{c.quantity}</td>
                  <td className="px-4 py-2.5">${c.estimatedCost}</td>
                  <td className="px-4 py-2.5">${(c.quantity * c.estimatedCost).toLocaleString()}</td>
                  <td className="px-4 py-2.5"><span className={`text-xs px-2 py-0.5 rounded-full border ${c.priority === "Mandatory" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : c.priority === "Recommended" ? "bg-sky-500/10 text-sky-400 border-sky-500/30" : c.priority === "Advanced" ? "bg-violet-500/10 text-violet-400 border-violet-500/30" : "bg-muted/40 text-muted-foreground border-border"}`}>{c.priority}</span></td>
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
