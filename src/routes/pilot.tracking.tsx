import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { pilotStore, usePilotStore } from "@/lib/pilot-store";
import { Button } from "@/components/ui/button";
import { Battery, MapPin, Radar, Send, Wifi, WifiOff, Gauge, ArrowUp } from "lucide-react";

export const Route = createFileRoute("/pilot/tracking")({
  head: () => ({ meta: [{ title: "AgriSky Pilot — Live Tracking" }] }),
  component: Tracking,
});

function Tracking() {
  const missions = usePilotStore((s) => s.missions);
  const online = usePilotStore((s) => s.online);
  const lastTele = usePilotStore((s) => s.telemetry[s.telemetry.length - 1]);
  const active = missions.find((m) => m.status === "IN_PROGRESS") ?? missions[0];

  const [tele, setTele] = useState({
    latitude: 10.78712,
    longitude: 79.13784,
    altitude: 24,
    speed: 6.2,
    battery: 78,
    progress: active?.progress ?? 0,
  });

  useEffect(() => {
    const t = setInterval(() => {
      setTele((p) => ({
        latitude: +(p.latitude + (Math.random() - 0.5) * 0.0005).toFixed(5),
        longitude: +(p.longitude + (Math.random() - 0.5) * 0.0005).toFixed(5),
        altitude: Math.max(10, +(p.altitude + (Math.random() - 0.5)).toFixed(1)),
        speed: Math.max(0, +(p.speed + (Math.random() - 0.5)).toFixed(1)),
        battery: Math.max(0, +(p.battery - Math.random() * 0.1).toFixed(1)),
        progress: Math.min(100, +(p.progress + 0.4).toFixed(1)),
      }));
    }, 1800);
    return () => clearInterval(t);
  }, []);

  const send = () => {
    if (!active) return;
    pilotStore.sendTelemetry({
      missionId: active.id,
      droneId: active.assignedDrone,
      latitude: tele.latitude,
      longitude: tele.longitude,
      altitude: tele.altitude,
      speed: tele.speed,
      battery: tele.battery,
      gpsSignal: "Strong",
    });
    toast.success(online ? "Live update sent to Control Center" : "Queued — will sync when online");
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Live mission tracking</h1>
        <p className="text-sm text-muted-foreground">{active ? `${active.farmName} · ${active.missionCode}` : "No active mission"}</p>
      </div>

      <div className="relative rounded-2xl border border-border/60 bg-card/40 h-56 overflow-hidden grid-bg">
        <div className="absolute inset-0 bg-gradient-hero opacity-40" />
        <div className="absolute" style={{ left: `${30 + (tele.longitude % 0.01) * 5000}%`, top: `${40 + (tele.latitude % 0.01) * 5000}%`, transform: "translate(-50%, -50%)" }}>
          <div className="h-3 w-3 rounded-full bg-primary shadow-glow ring-4 ring-primary/30 animate-pulse" />
        </div>
        <div className="absolute bottom-3 left-3 text-[11px] text-muted-foreground flex items-center gap-1">
          <Radar className="h-3 w-3 text-primary" /> Drone telemetry stream
        </div>
        <div className="absolute top-3 right-3 text-[11px] flex items-center gap-1 px-2 py-1 rounded-full bg-background/60 border border-border/60">
          {online ? <Wifi className="h-3 w-3 text-accent" /> : <WifiOff className="h-3 w-3 text-destructive" />}
          {online ? "Connected" : "Offline"}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Tile icon={MapPin} label="Latitude" value={tele.latitude.toString()} />
        <Tile icon={MapPin} label="Longitude" value={tele.longitude.toString()} />
        <Tile icon={ArrowUp} label="Altitude" value={`${tele.altitude} m`} />
        <Tile icon={Gauge} label="Speed" value={`${tele.speed} m/s`} />
        <Tile icon={Battery} label="Battery" value={`${tele.battery}%`} />
        <Tile icon={Radar} label="Progress" value={`${tele.progress}%`} />
      </div>

      <div className="rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Last synced</span>
          <span>{lastTele?.timestamp ?? "—"}</span>
        </div>
        <Button onClick={send} className="w-full mt-3 h-11 bg-gradient-primary text-primary-foreground"><Send className="h-4 w-4" />Send live update</Button>
        <p className="mt-3 text-[11px] text-muted-foreground">
          For MVP, the mobile app simulates drone location. Later this can be replaced by real drone telemetry.
        </p>
      </div>
    </div>
  );
}

function Tile({ icon: Icon, label, value }: { icon: typeof Battery; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-card p-3 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</span>
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="mt-1 text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}
