import { createFileRoute, Link } from "@tanstack/react-router";
import { StudioTabNav } from "@/components/design-studio/StudioTabNav";
import { useSeedDemo, useStudioStore, studioActions } from "@/lib/design-studio/store";
import { Button } from "@/components/ui/button";
import { riskColor } from "@/lib/design-studio/engine";
import { toast } from "sonner";

export const Route = createFileRoute("/mission-hub/torqwings-design-studio/history")({
  component: History,
});

function History() {
  useSeedDemo();
  const { projects } = useStudioStore();
  return (
    <div className="space-y-4">
      <StudioTabNav />
      <header>
        <h1 className="text-2xl font-semibold">Project History</h1>
        <p className="text-sm text-muted-foreground mt-1">All saved TorqWings Design Studio projects.</p>
      </header>
      <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>{["Project", "Vertical", "Drone Type", "Payload", "Flight Time", "Risk", "Created", "Last Sim", "Status", "Actions"].map((h) => <th key={h} className="text-left font-medium px-4 py-3">{h}</th>)}</tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-t border-border/60">
                  <td className="px-4 py-2.5 font-medium">{p.projectName}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{p.vertical}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{p.recommendedDesign?.droneType ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{p.requirements?.payloadWeight ? `${p.requirements.payloadWeight} kg` : "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{p.recommendedDesign?.estimatedFlightTime ?? "—"}</td>
                  <td className="px-4 py-2.5"><span className={`text-xs px-2 py-0.5 rounded-full border ${riskColor(p.riskLevel)}`}>{p.riskLevel ?? "—"}</span></td>
                  <td className="px-4 py-2.5 text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{p.simulationResults ? new Date(p.updatedAt).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-2.5"><span className="text-xs px-2 py-0.5 rounded-full bg-muted/40 border border-border">{p.status}</span></td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1.5">
                      <Button asChild size="sm" variant="outline" onClick={() => studioActions.select(p.id)}><Link to="/mission-hub/torqwings-design-studio/design">Open</Link></Button>
                      <Button size="sm" variant="outline" onClick={() => { studioActions.duplicate(p.id); toast.success("Duplicated"); }}>Duplicate</Button>
                      <Button size="sm" variant="outline" onClick={() => { if (confirm("Delete?")) { studioActions.remove(p.id); toast.success("Deleted"); } }}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
