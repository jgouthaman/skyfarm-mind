import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useSeedDemo, useStudioStore, studioActions } from "@/lib/design-studio/store";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/design-studio/sidebar";
import { riskColor } from "@/lib/design-studio/engine";
import { FilePlus, FlaskConical, Sparkles, FileText, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/control-center/aerospawn-design-studio/")({
  component: Dashboard,
});

function Dashboard() {
  useSeedDemo();
  const { projects } = useStudioStore();
  const nav = useNavigate();

  const kpis = useMemo(() => {
    const safe = projects.filter((p) => p.riskLevel === "Safe").length;
    const warn = projects.filter((p) => p.riskLevel === "Warning").length;
    const unsafe = projects.filter((p) => p.riskLevel === "Unsafe").length;
    const sims = projects.filter((p) => p.simulationResults).length;
    const ai = projects.reduce((n, p) => n + (p.advisorMessages?.length ?? 0), 0);
    return [
      { label: "Total Drone Designs", value: projects.length, tone: "text-sky-700" },
      { label: "Simulations Completed", value: sims, tone: "text-indigo-700" },
      { label: "Safe Designs", value: safe, tone: "text-emerald-700" },
      { label: "Warning Designs", value: warn, tone: "text-amber-700" },
      { label: "Unsafe Designs", value: unsafe, tone: "text-red-700" },
      { label: "AI Reviews Generated", value: ai, tone: "text-violet-700" },
    ];
  }, [projects]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">TorqWings Design Studio</h1>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
          Design drone architectures from mission requirements, simulate performance, and generate component lists.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border/60 bg-card/60 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</div>
            <div className={`mt-2 text-2xl font-semibold ${k.tone}`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => nav({ to: "/control-center/aerospawn-design-studio/new" })} className="bg-sky-500 hover:bg-sky-600 text-white"><FilePlus className="h-4 w-4 mr-1" /> Create New Drone Design</Button>
        <Button variant="outline" onClick={() => nav({ to: "/control-center/aerospawn-design-studio/simulation" })}><FlaskConical className="h-4 w-4 mr-1" /> Open Simulation Lab</Button>
        <Button variant="outline" onClick={() => nav({ to: "/control-center/aerospawn-design-studio/advisor" })}><Sparkles className="h-4 w-4 mr-1" /> Ask AI Advisor</Button>
        <Button variant="outline" onClick={() => nav({ to: "/control-center/aerospawn-design-studio/report" })}><FileText className="h-4 w-4 mr-1" /> View Reports</Button>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Recent Projects</h2>
        <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>{["Project", "Vertical", "Drone Type", "Payload", "Est. Flight", "Risk", "Status", "Updated", ""].map((h) => <th key={h} className="text-left font-medium px-4 py-3">{h}</th>)}</tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} className="border-t border-border/60 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{p.projectName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.vertical}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.recommendedDesign?.droneType ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.requirements?.payloadWeight ? `${p.requirements.payloadWeight} kg` : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.recommendedDesign?.estimatedFlightTime ? `${p.recommendedDesign.estimatedFlightTime} min` : "—"}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full border ${riskColor(p.riskLevel)}`}>{p.riskLevel ?? "—"}</span></td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-muted/40 border border-border">{p.status}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(p.updatedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <Link to="/control-center/aerospawn-design-studio/design" onClick={() => studioActions.select(p.id)} className="text-primary text-xs inline-flex items-center">Open <ChevronRight className="h-3 w-3" /></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <Disclaimer />
    </div>
  );
}
