import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useCurrentProject } from "@/lib/design-studio/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Disclaimer } from "@/components/design-studio/sidebar";
import { riskColor } from "@/lib/design-studio/engine";
import { buildComplianceReport } from "@/lib/design-studio/compliance";
import { ListChecks, FlaskConical, Sparkles, FileText, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import { StudioStepNav } from "@/components/design-studio/step-nav";

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
    ["Estimated Cost Range", `₹${d.estimatedCost.min.toLocaleString("en-IN")} – ₹${d.estimatedCost.max.toLocaleString("en-IN")}`],
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

      <ComplianceCard />

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => nav({ to: "/control-center/aerospawn-design-studio/components" })}><ListChecks className="h-4 w-4 mr-1" /> View Component List</Button>
        <Button variant="outline" onClick={() => nav({ to: "/control-center/aerospawn-design-studio/simulation" })}><FlaskConical className="h-4 w-4 mr-1" /> Open Simulation Lab</Button>
        <Button variant="outline" onClick={() => nav({ to: "/control-center/aerospawn-design-studio/advisor" })}><Sparkles className="h-4 w-4 mr-1" /> Ask AI Advisor</Button>
        <Button variant="outline" onClick={() => nav({ to: "/control-center/aerospawn-design-studio/report" })}><FileText className="h-4 w-4 mr-1" /> Generate Report</Button>
      </div>
      <StudioStepNav />
      <Disclaimer />
    </div>
  );
}

function ComplianceCard() {
  const project = useCurrentProject()!;
  // Baseline AUW from project (sim or requirements)
  const baseline = useMemo(() => buildComplianceReport(project).allUpWeightKg, [project]);
  const [auw, setAuw] = useState<number>(Number(baseline.toFixed(2)));
  const report = useMemo(() => buildComplianceReport(project, auw), [project, auw]);
  const tone = report.category === "Nano" || report.category === "Micro"
    ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
    : report.category === "Small"
      ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
      : "text-rose-400 border-rose-500/30 bg-rose-500/10";

  // Show breakpoints to next category
  const breakpoints = [
    { upTo: 0.25, label: "Nano" },
    { upTo: 2, label: "Micro" },
    { upTo: 25, label: "Small" },
    { upTo: 150, label: "Medium" },
    { upTo: Infinity, label: "Large" },
  ];
  const next = breakpoints.find((b) => auw <= b.upTo && b.upTo !== Infinity && auw < b.upTo);
  const nextHint = next ? `+${(next.upTo - auw).toFixed(2)} kg → moves to ${breakpoints[breakpoints.indexOf(next) + 1]?.label ?? "Large"} class` : null;

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-sky-400" />
          <h2 className="font-semibold">DGCA & NPNT Compliance Rating</h2>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${tone}`}>
          {report.category} class · {report.weightBand}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Edit estimated All-Up Weight to see how component swaps (heavier battery, extra sensors, larger tank) push the design into a different DGCA class.
      </p>

      <div className="grid sm:grid-cols-[260px_1fr] gap-4 items-start">
        <div className="space-y-2">
          <Label className="text-xs">Estimated All-Up Weight (kg)</Label>
          <Input type="number" step={0.1} min={0} value={auw} onChange={(e) => setAuw(+e.target.value)} />
          <div className="text-[11px] text-muted-foreground">
            Baseline from current design: <span className="font-medium">{baseline.toFixed(2)} kg</span>
            <button className="ml-2 underline text-sky-400" onClick={() => setAuw(Number(baseline.toFixed(2)))}>reset</button>
          </div>
          {nextHint && <div className="text-[11px] text-amber-400">{nextHint}</div>}
          <div className="text-[11px] text-muted-foreground pt-1">
            Altitude ceiling: <span className="font-medium">{report.maxAltitudeFtAgl} ft AGL</span>
          </div>
        </div>

        <ul className="grid sm:grid-cols-2 gap-1.5">
          {report.checks.map((c) => (
            <li key={c.id} className="flex items-start gap-2 text-xs rounded border border-border/40 px-2.5 py-1.5">
              {c.ok
                ? <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                : <XCircle className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />}
              <div>
                <div className="font-medium">{c.label}</div>
                <div className="text-muted-foreground">{c.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-end">
        <Button asChild variant="outline" size="sm">
          <Link to="/control-center/aerospawn-design-studio/compliance">Open full compliance checklist →</Link>
        </Button>
      </div>
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
