import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { StudioStepNav } from "@/components/design-studio/step-nav";
import { useCurrentProject } from "@/lib/design-studio/store";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/design-studio/sidebar";
import { buildComplianceReport, getStateRule, INDIAN_STATES } from "@/lib/design-studio/compliance";
import { CheckCircle2, XCircle, ShieldAlert, MapPin, FileCheck2, Plane } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/control-center/aerospawn-design-studio/compliance")({
  component: Compliance,
});

function Compliance() {
  const project = useCurrentProject();
  const [state, setState] = useState<string>("Telangana");

  const report = useMemo(() => (project ? buildComplianceReport(project) : null), [project]);
  const rule = useMemo(() => getStateRule(state), [state]);

  if (!project || !report) {
    return <div className="text-sm text-muted-foreground">No active project. Create or open a drone project first.</div>;
  }

  const passCount = report.checks.filter((c) => c.ok).length;

  function exportJSON() {
    const blob = new Blob([JSON.stringify({ project: project!.projectName, report, state, stateRule: rule }, null, 2)],
      { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${project!.projectName}-compliance.json`;
    a.click();
    toast.success("Compliance report exported");
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <header className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><ShieldAlert className="h-6 w-6 text-sky-700" /> Compliance & Regulation</h1>
          <p className="text-sm text-muted-foreground mt-1">DGCA + NPNT readiness check and state-wise fly-permission guidance for <span className="text-foreground font-medium">{project.projectName}</span>.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>Print</Button>
          <Button variant="outline" onClick={exportJSON}>Export JSON</Button>
        </div>
      </header>

      {/* Summary banner */}
      <div className="rounded-xl border border-border/60 bg-card/60 p-5 grid sm:grid-cols-4 gap-4">
        <Stat icon={<Plane className="h-4 w-4" />} label="DGCA category" value={report.category} sub={report.weightBand} />
        <Stat icon={<FileCheck2 className="h-4 w-4" />} label="All-up weight" value={`${report.allUpWeightKg.toFixed(2)} kg`} sub="Estimated" />
        <Stat icon={<CheckCircle2 className="h-4 w-4" />} label="Checks passed" value={`${passCount} / ${report.checks.length}`} sub="DGCA + NPNT" />
        <Stat icon={<MapPin className="h-4 w-4" />} label="Altitude ceiling" value={`${report.maxAltitudeFtAgl} ft AGL`} sub="Green zone" />
      </div>

      {/* DGCA / NPNT checks */}
      <section className="rounded-xl border border-border/60 bg-card/60 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">DGCA & NPNT Readiness</h2>
        <ul className="divide-y divide-border/40">
          {report.checks.map((c) => (
            <li key={c.id} className="py-2.5 flex items-start gap-3">
              {c.ok
                ? <CheckCircle2 className="h-5 w-5 text-emerald-700 mt-0.5 shrink-0" />
                : <XCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />}
              <div className="flex-1">
                <div className="text-sm font-medium">{c.label}</div>
                <div className="text-xs text-muted-foreground">{c.detail}</div>
              </div>
              <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border ${c.ok ? "border-emerald-500/40 text-emerald-700 bg-emerald-500/10" : "border-border text-muted-foreground"}`}>
                {c.ok ? "Required" : "N/A"}
              </span>
            </li>
          ))}
        </ul>
        <ul className="mt-4 list-disc list-inside text-xs text-muted-foreground space-y-1">
          {report.notes.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      </section>

      {/* State-wise permission */}
      <section className="rounded-xl border border-border/60 bg-card/60 p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">State-wise Fly Permission</h2>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="bg-background border border-border/60 rounded-md px-3 py-1.5 text-sm"
          >
            {INDIAN_STATES.map((s) => <option key={s.state} value={s.state}>{s.state}</option>)}
          </select>
        </div>

        {rule && (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <KV k="Airspace zone" v={rule.zoneNote} />
              <KV k="Permitting authority" v={rule.authority} />
              <KV k="Typical lead time" v={`${rule.permissionWindowDays} day(s)`} />
              <KV k="Known red zones" v={rule.knownRedZones.join(", ") || "—"} />
            </div>
            <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 text-sm">
              <div className="text-xs uppercase tracking-wider text-sky-700 mb-1">Recommendation for {rule.state}</div>
              {rule.recommendation}
            </div>
          </div>
        )}
      </section>

      <div className="text-[11px] text-muted-foreground italic">
        This screen provides indicative regulatory guidance only. Always confirm with the DGCA DigitalSky portal
        (<a className="underline" href="https://digitalsky.dgca.gov.in" target="_blank" rel="noreferrer">digitalsky.dgca.gov.in</a>)
        and the relevant state authority before any flight.
      </div>

      <Disclaimer />
      <StudioStepNav />
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">{icon}{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/40 py-1.5">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  );
}
