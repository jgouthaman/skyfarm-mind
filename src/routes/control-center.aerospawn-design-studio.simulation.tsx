import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useCurrentProject, studioActions } from "@/lib/design-studio/store";
import { runSimulation, riskColor } from "@/lib/design-studio/engine";
import type { SimulationParameters } from "@/lib/design-studio/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Disclaimer } from "@/components/design-studio/sidebar";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, RadialBarChart, RadialBar } from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/control-center/aerospawn-design-studio/simulation")({
  component: SimulationLab,
  ssr: false,
});

function SimulationLab() {
  const project = useCurrentProject();
  const nav = useNavigate();
  const initial: SimulationParameters = {
    payloadWeight: project?.requirements?.payloadWeight ?? 10,
    batteryCapacity: 22000, batteryVoltage: "12S", numMotors: 6,
    motorThrust: 6, propellerSize: 22, frameWeight: 6, windSpeed: 10,
    altitude: project?.requirements?.altitude ?? 30,
    missionDistance: 3, tankVolume: 10, sprayFlowRate: 2, safetyReservePct: 20,
  };
  const [params, setParams] = useState<SimulationParameters>(initial);
  const result = useMemo(() => runSimulation(params), [params]);

  const payloadCurve = useMemo(() =>
    Array.from({ length: 11 }, (_, i) => {
      const p = i;
      const r = runSimulation({ ...params, payloadWeight: p });
      return { payload: p, flight: r.estimatedFlightTime, motorLoad: r.motorLoad };
    }), [params]);

  const batteryCurve = useMemo(() =>
    [5000, 10000, 16000, 22000, 30000].map((c) => {
      const r = runSimulation({ ...params, batteryCapacity: c });
      return { capacity: c, endurance: r.estimatedFlightTime };
    }), [params]);

  const windCurve = useMemo(() =>
    Array.from({ length: 11 }, (_, i) => {
      const w = i * 5;
      const r = runSimulation({ ...params, windSpeed: w });
      return { wind: w, stability: r.windStabilityScore };
    }), [params]);

  const set = <K extends keyof SimulationParameters>(k: K, v: SimulationParameters[K]) => setParams({ ...params, [k]: v });

  function save() {
    if (!project) return toast.error("No active project");
    studioActions.update(project.id, { simulationParameters: params, simulationResults: result, status: "Simulated", riskLevel: result.riskLevel });
    toast.success("Simulation saved to project");
  }

  return (
    <div className="space-y-5">
      <header className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Simulation Lab</h1>
          <p className="text-sm text-muted-foreground mt-1">Sweep parameters and read flight envelope outcomes in real-time.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setParams(initial)}>Reset</Button>
          <Button variant="outline" onClick={() => nav({ to: "/control-center/aerospawn-design-studio/advisor" })}>Ask AI Advisor</Button>
          <Button onClick={save} className="bg-sky-500 hover:bg-sky-600 text-white">Save Simulation</Button>
        </div>
      </header>

      <div className="grid lg:grid-cols-[320px_1fr] gap-5">
        <div className="rounded-xl border border-border/60 bg-card/60 p-5 space-y-3">
          <h2 className="font-semibold text-sm">Parameters</h2>
          <N label="Payload weight (kg)" value={params.payloadWeight} on={(v) => set("payloadWeight", v)} />
          <N label="Battery capacity (mAh)" value={params.batteryCapacity} on={(v) => set("batteryCapacity", v)} step={500} />
          <div className="space-y-1.5">
            <Label className="text-xs">Battery voltage</Label>
            <Select value={params.batteryVoltage} onValueChange={(v) => set("batteryVoltage", v as SimulationParameters["batteryVoltage"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["4S", "6S", "12S", "14S"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Number of motors</Label>
            <Select value={String(params.numMotors)} onValueChange={(v) => set("numMotors", Number(v) as 4 | 6 | 8)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["4", "6", "8"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <N label="Motor thrust per motor (kg)" value={params.motorThrust} on={(v) => set("motorThrust", v)} step={0.5} />
          <N label="Propeller size (in)" value={params.propellerSize} on={(v) => set("propellerSize", v)} />
          <N label="Frame weight (kg)" value={params.frameWeight} on={(v) => set("frameWeight", v)} step={0.5} />
          <N label="Wind speed (km/h)" value={params.windSpeed} on={(v) => set("windSpeed", v)} />
          <N label="Altitude (m)" value={params.altitude} on={(v) => set("altitude", v)} />
          <N label="Mission distance (km)" value={params.missionDistance} on={(v) => set("missionDistance", v)} />
          <N label="Tank volume (L)" value={params.tankVolume} on={(v) => set("tankVolume", v)} />
          <N label="Spray flow rate (L/min)" value={params.sprayFlowRate} on={(v) => set("sprayFlowRate", v)} step={0.5} />
          <N label="Safety reserve (%)" value={params.safetyReservePct} on={(v) => set("safetyReservePct", v)} />
        </div>

        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <K label="Total weight" v={`${result.totalWeight} kg`} />
            <K label="Total thrust" v={`${result.totalThrust} kg`} />
            <K label="Thrust-to-weight" v={result.thrustToWeightRatio.toFixed(2)} tone={riskColor(result.riskLevel)} />
            <K label="Flight time" v={`${result.estimatedFlightTime} min`} />
            <K label="Battery consumption" v={`${result.batteryConsumption}%`} />
            <K label="Motor load" v={`${result.motorLoad}%`} />
            <K label="Payload safety margin" v={`${result.payloadSafetyMargin}%`} />
            <K label="Wind stability" v={`${result.windStabilityScore}/100`} />
            <K label="Coverage area" v={`${result.coverageArea} km²`} />
            <K label="Spray duration" v={`${result.sprayDuration} min`} />
            <K label="Mission feasibility" v={result.missionFeasibility} tone={riskColor(result.riskLevel)} />
            <K label="Risk level" v={result.riskLevel} tone={riskColor(result.riskLevel)} />
          </div>

          <div className={`rounded-xl border p-4 text-sm ${riskColor(result.riskLevel)}`}>
            <span className="font-semibold">Recommendation:</span> {result.recommendation}
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Chart title="Payload vs Flight Time"><LineChart data={payloadCurve}><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="payload" stroke="#94a3b8" /><YAxis stroke="#94a3b8" /><Tooltip contentStyle={{ background: "hsl(220 20% 12%)", border: "1px solid hsl(220 10% 25%)" }} /><Line type="monotone" dataKey="flight" stroke="#38bdf8" strokeWidth={2} /></LineChart></Chart>
            <Chart title="Battery Capacity vs Endurance"><LineChart data={batteryCurve}><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="capacity" stroke="#94a3b8" /><YAxis stroke="#94a3b8" /><Tooltip contentStyle={{ background: "hsl(220 20% 12%)", border: "1px solid hsl(220 10% 25%)" }} /><Line type="monotone" dataKey="endurance" stroke="#a78bfa" strokeWidth={2} /></LineChart></Chart>
            <Chart title="Motor Load vs Payload"><LineChart data={payloadCurve}><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="payload" stroke="#94a3b8" /><YAxis stroke="#94a3b8" /><Tooltip contentStyle={{ background: "hsl(220 20% 12%)", border: "1px solid hsl(220 10% 25%)" }} /><Line type="monotone" dataKey="motorLoad" stroke="#f59e0b" strokeWidth={2} /></LineChart></Chart>
            <Chart title="Wind Speed vs Stability"><LineChart data={windCurve}><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="wind" stroke="#94a3b8" /><YAxis stroke="#94a3b8" /><Tooltip contentStyle={{ background: "hsl(220 20% 12%)", border: "1px solid hsl(220 10% 25%)" }} /><Line type="monotone" dataKey="stability" stroke="#34d399" strokeWidth={2} /></LineChart></Chart>
            <Chart title="Thrust-to-Weight Gauge">
              <RadialBarChart innerRadius="65%" outerRadius="100%" data={[{ name: "TWR", value: Math.min(result.thrustToWeightRatio, 3), fill: result.riskLevel === "Safe" ? "#10b981" : result.riskLevel === "Warning" ? "#f59e0b" : "#ef4444" }]} startAngle={180} endAngle={0}>
                <RadialBar background dataKey="value" />
              </RadialBarChart>
            </Chart>
            <div className="rounded-xl border border-border/60 bg-card/60 p-4 flex flex-col items-center justify-center">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Risk Level</div>
              <div className={`mt-2 text-3xl font-bold ${riskColor(result.riskLevel).split(" ")[0]}`}>{result.riskLevel}</div>
              <div className="text-xs text-muted-foreground mt-1">Mission: {result.missionFeasibility}</div>
            </div>
          </div>

          <Disclaimer />
        </div>
      </div>
    </div>
  );
}

function N({ label, value, on, step = 1 }: { label: string; value: number; on: (v: number) => void; step?: number }) {
  return (
    <div className="space-y-1.5"><Label className="text-xs">{label}</Label>
      <Input type="number" step={step} value={value} onChange={(e) => on(+e.target.value)} />
    </div>
  );
}
function K({ label, v, tone }: { label: string; v: string | number; tone?: string }) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${tone ?? "border-border/60 bg-card/60"}`}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-base font-semibold mt-0.5">{v}</div>
    </div>
  );
}
function Chart({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4">
      <div className="text-xs font-semibold mb-2 text-muted-foreground">{title}</div>
      <div className="h-44"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
    </div>
  );
}
