import { createFileRoute } from "@tanstack/react-router";
import { StudioStepNav } from "@/components/design-studio/step-nav";
import { useCurrentProject } from "@/lib/design-studio/store";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/design-studio/sidebar";
import { riskColor } from "@/lib/design-studio/engine";
import { toast } from "sonner";

export const Route = createFileRoute("/control-center/aerospawn-design-studio/report")({
  component: Report,
});

function Report() {
  const project = useCurrentProject();
  if (!project) return <div className="text-sm text-muted-foreground">No active project.</div>;

  function exportJSON() {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `${project!.projectName}-report.json`; a.click();
    toast.success("Exported JSON");
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <header className="flex justify-between items-end flex-wrap gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold">Design Report</h1>
          <p className="text-sm text-muted-foreground mt-1">Investor-ready summary of the project.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>Download PDF</Button>
          <Button variant="outline" onClick={exportJSON}>Export JSON</Button>
          <Button variant="outline" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); }}>Share</Button>
          <Button className="bg-sky-500 hover:bg-sky-600 text-white" onClick={() => toast.success("Saved to project history")}>Save</Button>
        </div>
      </header>

      <article className="rounded-xl border border-border/60 bg-card/60 p-8 space-y-6 print:bg-white print:text-black">
        <div className="border-b border-border/60 pb-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">AeroSpawn Design Studio Report</div>
          <h2 className="text-2xl font-bold mt-1">{project.projectName}</h2>
          <div className="text-sm text-muted-foreground mt-1">{project.vertical} · {project.purpose} · {project.userType}</div>
        </div>

        <Section title="1. Project Overview">
          <KV k="Project" v={project.projectName} /><KV k="Vertical" v={project.vertical} />
          <KV k="Purpose" v={project.purpose} /><KV k="User type" v={project.userType} />
          <KV k="Status" v={project.status} /><KV k="Risk level" v={project.riskLevel ?? "—"} />
        </Section>

        <Section title="2. User Requirements">
          {project.requirements ? <pre className="text-xs bg-muted/40 print:bg-gray-100 rounded p-3 overflow-auto">{JSON.stringify(project.requirements, null, 2)}</pre> : <Empty />}
        </Section>

        <Section title="3. Recommended Drone Architecture">
          {project.recommendedDesign ? (
            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              {Object.entries(project.recommendedDesign).filter(([k]) => k !== "notes" && k !== "estimatedCost").map(([k, v]) => <KV key={k} k={k} v={String(v)} />)}
              <KV k="Estimated cost" v={`$${project.recommendedDesign.estimatedCost.min.toLocaleString()} – $${project.recommendedDesign.estimatedCost.max.toLocaleString()}`} />
            </div>
          ) : <Empty />}
        </Section>

        <Section title="4. Component List">
          {project.componentList ? (
            <table className="w-full text-xs">
              <thead><tr className="text-left text-muted-foreground"><th className="py-1">Category</th><th>Component</th><th>Qty</th><th>$</th></tr></thead>
              <tbody>{project.componentList.map((c, i) => (
                <tr key={i} className="border-t border-border/40"><td className="py-1">{c.category}</td><td>{c.name}</td><td>{c.quantity}</td><td>${c.estimatedCost}</td></tr>
              ))}</tbody>
            </table>
          ) : <Empty />}
        </Section>

        <Section title="5. Simulation Parameters">
          {project.simulationParameters ? <pre className="text-xs bg-muted/40 print:bg-gray-100 rounded p-3 overflow-auto">{JSON.stringify(project.simulationParameters, null, 2)}</pre> : <Empty />}
        </Section>

        <Section title="6. Simulation Results">
          {project.simulationResults ? (
            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              {Object.entries(project.simulationResults).map(([k, v]) => <KV key={k} k={k} v={String(v)} />)}
            </div>
          ) : <Empty />}
        </Section>

        <Section title="7. Safety & Risk Score">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${riskColor(project.riskLevel)}`}>
            <span className="font-semibold">{project.riskLevel ?? "Not evaluated"}</span>
            {project.simulationResults && <span className="text-xs">· TWR {project.simulationResults.thrustToWeightRatio.toFixed(2)}</span>}
          </div>
        </Section>

        <Section title="8. AI Advisor Summary">
          {project.advisorMessages && project.advisorMessages.length > 0 ? (
            <div className="space-y-2 text-xs">
              {project.advisorMessages.slice(-4).map((m, i) => (
                <div key={i} className="border border-border/40 rounded p-2"><div className="font-semibold uppercase text-[10px] text-muted-foreground">{m.role}</div>{m.content}</div>
              ))}
            </div>
          ) : <Empty msg="No advisor conversation yet." />}
        </Section>

        <Section title="9. Cost Estimate">
          {project.componentList ? <div className="text-lg font-semibold">${project.componentList.reduce((s, c) => s + c.estimatedCost * c.quantity, 0).toLocaleString()}</div> : <Empty />}
        </Section>

        <Section title="10. Engineering Recommendations">
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            {(project.recommendedDesign?.notes ?? []).map((n, i) => <li key={i}>{n}</li>)}
            <li>Validate motor and ESC thermals under sustained payload.</li>
            <li>Perform bench thrust test before first flight.</li>
            <li>Cross-check airspace and operational permissions.</li>
          </ul>
        </Section>

        <Section title="11. Next Steps">
          <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
            <li>Procure BOM and assemble prototype.</li>
            <li>Conduct hover trial in controlled environment.</li>
            <li>Iterate on motor/propeller pairing based on real telemetry.</li>
            <li>Run mission rehearsal at planned site.</li>
          </ol>
        </Section>

        <Section title="12. Disclaimer">
          <p className="text-xs text-muted-foreground">This portal provides design assistance and simulation estimates only. It does not certify that a drone is safe, legal, or flight-ready. Final design must be reviewed by qualified drone engineers and tested under safe and compliant conditions.</p>
        </Section>
      </article>

      <div className="print:hidden"><Disclaimer /></div>
      <div className="print:hidden"><StudioStepNav /></div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</h3>
      {children}
    </section>
  );
}
function KV({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3 text-sm border-b border-border/40 py-1"><span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1").trim()}</span><span className="font-medium text-right">{v}</span></div>;
}
function Empty({ msg = "Not generated yet." }: { msg?: string }) {
  return <div className="text-xs text-muted-foreground italic">{msg}</div>;
}
