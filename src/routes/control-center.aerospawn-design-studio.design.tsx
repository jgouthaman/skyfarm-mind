import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCurrentProject } from "@/lib/design-studio/store";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/design-studio/sidebar";
import { riskColor } from "@/lib/design-studio/engine";
import { ListChecks, FlaskConical, Sparkles, FileText } from "lucide-react";

export const Route = createFileRoute("/control-center/aerospawn-design-studio/design")({
  component: DesignResult,
});

function DesignResult() {
  const project = useCurrentProject();
  const nav = useNavigate();
  if (!project?.recommendedDesign) {
    return <Empty msg="No design generated yet. Capture mission requirements first." cta="/control-center/aerospawn-design-studio/requirements" ctaLabel="Open requirements" />;
  }
  const d = project.recommendedDesign;
  const cards: Array<[string, string]> = [
    ["Recommended Drone Type", d.droneType],
    ["Frame Size", d.frameSize],
    ["Motor Class", d.motorClass],
    ["ESC Rating", d.escRating],
    ["Propeller Size", d.propellerSize],
    ["Battery", d.battery],
    ["Flight Controller", d.flightController],
    ["GPS & Navigation", d.gps],
    ["Payload System", d.payloadSystem],
    ["Estimated Flight Time", `${d.estimatedFlightTime} min`],
    ["Estimated Cost Range", `$${d.estimatedCost.min.toLocaleString()} – $${d.estimatedCost.max.toLocaleString()}`],
    ["Risk Level", d.riskLevel],
  ];
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Drone Design Result</h1>
        <p className="text-sm text-muted-foreground mt-1">{project.projectName} · {project.vertical}</p>
      </header>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map(([k, v]) => (
          <div key={k} className="rounded-xl border border-border/60 bg-card/60 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{k}</div>
            <div className={`mt-1.5 text-base font-medium ${k === "Risk Level" ? riskColor(d.riskLevel).split(" ")[0] : ""}`}>{v}</div>
          </div>
        ))}
      </div>
      {d.notes.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card/60 p-5">
          <div className="text-sm font-semibold mb-2">Engineering Notes</div>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            {d.notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => nav({ to: "/control-center/aerospawn-design-studio/components" })}><ListChecks className="h-4 w-4 mr-1" /> View Component List</Button>
        <Button variant="outline" onClick={() => nav({ to: "/control-center/aerospawn-design-studio/simulation" })}><FlaskConical className="h-4 w-4 mr-1" /> Open Simulation Lab</Button>
        <Button variant="outline" onClick={() => nav({ to: "/control-center/aerospawn-design-studio/advisor" })}><Sparkles className="h-4 w-4 mr-1" /> Ask AI Advisor</Button>
        <Button variant="outline" onClick={() => nav({ to: "/control-center/aerospawn-design-studio/report" })}><FileText className="h-4 w-4 mr-1" /> Generate Report</Button>
      </div>
      <Disclaimer />
    </div>
  );
}

function Empty({ msg, cta, ctaLabel }: { msg: string; cta: string; ctaLabel: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-10 text-center">
      <p className="text-sm text-muted-foreground">{msg}</p>
      <Button asChild className="mt-4"><Link to={cta as never}>{ctaLabel}</Link></Button>
    </div>
  );
}
