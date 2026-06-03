import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useCurrentProject, studioActions } from "@/lib/design-studio/store";
import { generateDroneDesign, generateComponentList } from "@/lib/design-studio/engine";
import type { DroneRequirement } from "@/lib/design-studio/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/control-center/aerospawn-design-studio/requirements")({
  component: RequirementsWizard,
});

function RequirementsWizard() {
  const project = useCurrentProject();
  const nav = useNavigate();
  const [step, setStep] = useState(1);

  const [req, setReq] = useState<DroneRequirement>({
    payloadWeight: 10, requiredFlightTime: 20, missionArea: 25, areaUnit: "acres",
    altitude: 30, terrain: "Flat farm", windCondition: "Medium",
    budgetRange: "Balanced", automationLevel: "Semi-autonomous",
    payloadDetails: {}, safetyRequirements: {
      returnToHome: true, gpsHold: true, obstacleAvoidance: false, geofencing: true,
      lowBatteryFailsafe: true, parachute: false, flightLogging: true,
    },
  });

  if (!project) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">No active project. Create one to capture requirements.</p>
        <Button asChild><Link to="/control-center/aerospawn-design-studio/new">Create project</Link></Button>
      </div>
    );
  }

  const purpose = project.purpose;
  const isAgri = /spraying/i.test(purpose);
  const isSurvey = /survey|monitor/i.test(purpose);
  const isGuard = /surveillance/i.test(purpose);
  const isFire = /fire/i.test(purpose);
  const isDelivery = /delivery/i.test(purpose);
  const isTrain = /training/i.test(purpose);

  function setPD(k: string, v: string | number | boolean) {
    setReq((r) => ({ ...r, payloadDetails: { ...r.payloadDetails, [k]: v } }));
  }
  function setSR(k: string, v: boolean) {
    setReq((r) => ({ ...r, safetyRequirements: { ...r.safetyRequirements, [k]: v } }));
  }

  function generate() {
    const design = generateDroneDesign(req, purpose);
    const components = generateComponentList(design, req, purpose);
    studioActions.update(project.id, {
      requirements: req, recommendedDesign: design, componentList: components,
      riskLevel: design.riskLevel, status: "Designed",
    });
    toast.success("Drone design generated");
    nav({ to: "/control-center/aerospawn-design-studio/design" });
  }

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Requirement Intake</h1>
        <p className="text-sm text-muted-foreground mt-1">{project.projectName} · {project.vertical} · {purpose}</p>
        <div className="mt-4 flex gap-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className={`flex-1 h-1.5 rounded-full ${step >= n ? "bg-sky-500" : "bg-muted"}`} />
          ))}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">Step {step} of 4</div>
      </header>

      <div className="rounded-xl border border-border/60 bg-card/60 p-6 space-y-5">
        {step === 1 && <>
          <h2 className="font-semibold">Mission Requirement</h2>
          <Grid>
            <Field label="Payload weight (kg)"><Input type="number" value={req.payloadWeight} onChange={(e) => setReq({ ...req, payloadWeight: +e.target.value })} /></Field>
            <Field label="Required flight time (min)"><Input type="number" value={req.requiredFlightTime} onChange={(e) => setReq({ ...req, requiredFlightTime: +e.target.value })} /></Field>
            <Field label="Mission area"><Input type="number" value={req.missionArea} onChange={(e) => setReq({ ...req, missionArea: +e.target.value })} /></Field>
            <Field label="Area unit">
              <Select value={req.areaUnit} onValueChange={(v) => setReq({ ...req, areaUnit: v as DroneRequirement["areaUnit"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["acres", "sq km", "route km"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Altitude (m)"><Input type="number" value={req.altitude} onChange={(e) => setReq({ ...req, altitude: +e.target.value })} /></Field>
            <Field label="Terrain">
              <Select value={req.terrain} onValueChange={(v) => setReq({ ...req, terrain: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Flat farm", "Hilly farm", "Forest", "Urban", "Industrial", "Open field", "Coastal area"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Wind condition">
              <Select value={req.windCondition} onValueChange={(v) => setReq({ ...req, windCondition: v as DroneRequirement["windCondition"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Low", "Medium", "High"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Budget range">
              <Select value={req.budgetRange} onValueChange={(v) => setReq({ ...req, budgetRange: v as DroneRequirement["budgetRange"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Low cost", "Balanced", "Premium", "R&D prototype"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Automation level">
              <Select value={req.automationLevel} onValueChange={(v) => setReq({ ...req, automationLevel: v as DroneRequirement["automationLevel"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Manual", "Semi-autonomous", "Fully autonomous"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </Grid>
        </>}

        {step === 2 && <>
          <h2 className="font-semibold">Payload Details</h2>
          {isAgri && <Grid>
            <Field label="Tank capacity (L)"><Input type="number" defaultValue={10} onChange={(e) => setPD("tankCapacity", +e.target.value)} /></Field>
            <Field label="Spray width (m)"><Input type="number" defaultValue={4} onChange={(e) => setPD("sprayWidth", +e.target.value)} /></Field>
            <Field label="Crop type"><Input onChange={(e) => setPD("crop", e.target.value)} placeholder="e.g. Cotton" /></Field>
            <Field label="Farm size (acres)"><Input type="number" defaultValue={25} onChange={(e) => setPD("farmSize", +e.target.value)} /></Field>
            <Field label="Liquid density">
              <Select defaultValue="normal" onValueChange={(v) => setPD("liquidDensity", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="high">High</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label="Spraying mode">
              <Select defaultValue="route-based" onValueChange={(v) => setPD("sprayMode", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["manual", "route-based", "autonomous"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </Grid>}
          {isSurvey && <Grid>
            <Field label="Camera type">
              <Select defaultValue="RGB camera" onValueChange={(v) => setPD("cameraType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["RGB camera", "Multispectral camera", "Thermal camera", "LiDAR"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Image resolution"><Input defaultValue="20 MP" onChange={(e) => setPD("imageResolution", e.target.value)} /></Field>
            <Field label="Mapping accuracy"><Input defaultValue="±5 cm" onChange={(e) => setPD("mappingAccuracy", e.target.value)} /></Field>
            <Toggle label="GPS accuracy required" onChange={(v) => setPD("gpsAccuracy", v)} />
            <Toggle label="RTK required" onChange={(v) => setPD("rtkRequired", v)} />
          </Grid>}
          {isGuard && <Grid>
            <Field label="Camera type"><Input defaultValue="4K + Thermal" onChange={(e) => setPD("cameraType", e.target.value)} /></Field>
            <Toggle label="Thermal camera required" defaultChecked onChange={(v) => setPD("thermal", v)} />
            <Toggle label="Night vision required" onChange={(v) => setPD("nightVision", v)} />
            <Toggle label="Live video streaming" defaultChecked onChange={(v) => setPD("liveStream", v)} />
            <Field label="Patrol duration (min)"><Input type="number" defaultValue={45} onChange={(e) => setPD("patrolDuration", +e.target.value)} /></Field>
            <Toggle label="Object detection" onChange={(v) => setPD("objectDetection", v)} />
          </Grid>}
          {isFire && <Grid>
            <Toggle label="Fire detection required" defaultChecked onChange={(v) => setPD("fireDetection", v)} />
            <Toggle label="Thermal camera required" defaultChecked onChange={(v) => setPD("thermal", v)} />
            <Field label="Number of extinguisher balls"><Input type="number" defaultValue={4} onChange={(e) => setPD("ballCount", +e.target.value)} /></Field>
            <Toggle label="Drop mechanism required" defaultChecked onChange={(v) => setPD("dropMechanism", v)} />
            <Field label="Target hover stability">
              <Select defaultValue="high" onValueChange={(v) => setPD("hoverStability", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["low", "medium", "high"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Toggle label="Emergency return" defaultChecked onChange={(v) => setPD("emergencyReturn", v)} />
          </Grid>}
          {isDelivery && <Grid>
            <Field label="Package weight (kg)"><Input type="number" defaultValue={2} onChange={(e) => setPD("packageWeight", +e.target.value)} /></Field>
            <Field label="Delivery distance (km)"><Input type="number" defaultValue={5} onChange={(e) => setPD("deliveryDistance", +e.target.value)} /></Field>
            <Field label="Delivery method">
              <Select defaultValue="landing" onValueChange={(v) => setPD("deliveryMethod", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="drop">Drop</SelectItem><SelectItem value="landing">Landing</SelectItem></SelectContent>
              </Select>
            </Field>
            <Toggle label="Return-to-home required" defaultChecked onChange={(v) => setPD("rth", v)} />
            <Field label="Delivery accuracy"><Input defaultValue="±1 m" onChange={(e) => setPD("deliveryAccuracy", e.target.value)} /></Field>
          </Grid>}
          {isTrain && <Grid>
            <Field label="Level">
              <Select defaultValue="beginner" onValueChange={(v) => setPD("level", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["beginner", "intermediate", "advanced"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Environment">
              <Select defaultValue="outdoor" onValueChange={(v) => setPD("environment", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="indoor">Indoor</SelectItem><SelectItem value="outdoor">Outdoor</SelectItem></SelectContent>
              </Select>
            </Field>
            <Toggle label="Crash guard required" defaultChecked onChange={(v) => setPD("crashGuard", v)} />
            <Field label="Max speed limit (km/h)"><Input type="number" defaultValue={25} onChange={(e) => setPD("maxSpeed", +e.target.value)} /></Field>
            <Field label="Training mode">
              <Select defaultValue="guided" onValueChange={(v) => setPD("trainingMode", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["guided", "free-flight", "simulator-only"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </Grid>}
          {!isAgri && !isSurvey && !isGuard && !isFire && !isDelivery && !isTrain && <p className="text-sm text-muted-foreground">No payload-specific fields for this purpose.</p>}
        </>}

        {step === 3 && <>
          <h2 className="font-semibold">Safety Requirements</h2>
          <Grid>
            <Toggle label="Return to home" defaultChecked={req.safetyRequirements.returnToHome} onChange={(v) => setSR("returnToHome", v)} />
            <Toggle label="GPS hold" defaultChecked={req.safetyRequirements.gpsHold} onChange={(v) => setSR("gpsHold", v)} />
            <Toggle label="Obstacle avoidance" defaultChecked={req.safetyRequirements.obstacleAvoidance} onChange={(v) => setSR("obstacleAvoidance", v)} />
            <Toggle label="Geofencing" defaultChecked={req.safetyRequirements.geofencing} onChange={(v) => setSR("geofencing", v)} />
            <Toggle label="Low battery failsafe" defaultChecked={req.safetyRequirements.lowBatteryFailsafe} onChange={(v) => setSR("lowBatteryFailsafe", v)} />
            <Toggle label="Parachute" defaultChecked={req.safetyRequirements.parachute} onChange={(v) => setSR("parachute", v)} />
            <Toggle label="Flight logging" defaultChecked={req.safetyRequirements.flightLogging} onChange={(v) => setSR("flightLogging", v)} />
          </Grid>
        </>}

        {step === 4 && <>
          <h2 className="font-semibold">Review Inputs</h2>
          <pre className="text-xs bg-muted/40 rounded-lg p-4 overflow-auto max-h-96">{JSON.stringify(req, null, 2)}</pre>
        </>}

        <div className="flex justify-between pt-2 border-t border-border/60">
          <Button variant="outline" disabled={step === 1} onClick={() => setStep(step - 1)}>Back</Button>
          {step < 4
            ? <Button onClick={() => setStep(step + 1)} className="bg-sky-500 hover:bg-sky-600 text-white">Next</Button>
            : <Button onClick={generate} className="bg-emerald-500 hover:bg-emerald-600 text-white">Generate Drone Design</Button>}
        </div>
      </div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-4">{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
function Toggle({ label, defaultChecked, onChange }: { label: string; defaultChecked?: boolean; onChange: (v: boolean) => void }) {
  const [v, setV] = useState(!!defaultChecked);
  return (
    <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
      <span className="text-sm">{label}</span>
      <Switch checked={v} onCheckedChange={(c) => { setV(c); onChange(c); }} />
    </div>
  );
}
