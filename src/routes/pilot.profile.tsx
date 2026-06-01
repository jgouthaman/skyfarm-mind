import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { pilotStore, usePilotStore } from "@/lib/pilot-store";
import { Button } from "@/components/ui/button";
import { LogOut, MapPin, Camera, HardDrive, CircleCheck, CircleX } from "lucide-react";

export const Route = createFileRoute("/pilot/profile")({
  head: () => ({ meta: [{ title: "AgriSky Pilot — Profile" }] }),
  component: Profile,
});

function Profile() {
  const navigate = useNavigate();
  const pilot = usePilotStore((s) => s.pilot);
  const online = usePilotStore((s) => s.online);

  const logout = () => {
    pilotStore.logout();
    toast.success("Signed out");
    navigate({ to: "/pilot/login" });
  };

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-gradient-primary grid place-items-center text-lg font-semibold text-primary-foreground shadow-glow">
          {pilot?.name.slice(0, 1) ?? "P"}
        </div>
        <div>
          <div className="font-semibold">{pilot?.name}</div>
          <div className="text-xs text-muted-foreground">+91 {pilot?.mobile}</div>
          <div className="mt-1 text-[10px] inline-block px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30">PILOT</div>
        </div>
      </div>

      <Card title="Operations">
        <Row label="Assigned drone" value="AS-DRN-014" />
        <Row label="Squadron" value="South India · Cluster 3" />
        <Row label="App version" value="v0.9.0 (MVP)" />
      </Card>

      <Card title="Device permissions">
        <PermRow icon={MapPin} label="Location" granted />
        <PermRow icon={Camera} label="Camera" granted />
        <PermRow icon={HardDrive} label="Storage" granted />
      </Card>

      <Card title="Backend API status">
        <Row label="Auth service" value={online ? "Connected" : "Unreachable"} tone={online ? "ok" : "bad"} />
        <Row label="Mission API" value={online ? "Connected" : "Queued"} tone={online ? "ok" : "bad"} />
        <Row label="Media upload" value={online ? "Connected" : "Offline"} tone={online ? "ok" : "bad"} />
        <Row label="Telemetry stream" value={online ? "Live" : "Buffered"} tone={online ? "ok" : "bad"} />
      </Card>

      <Button onClick={logout} variant="outline" className="w-full h-11"><LogOut className="h-4 w-4" />Log out</Button>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function Row({ label, value, tone }: { label: string; value: string; tone?: "ok" | "bad" }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={tone === "ok" ? "text-accent" : tone === "bad" ? "text-destructive" : ""}>{value}</span>
    </div>
  );
}
function PermRow({ icon: Icon, label, granted }: { icon: typeof MapPin; label: string; granted: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-2 text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</span>
      <span className={`flex items-center gap-1 ${granted ? "text-accent" : "text-destructive"}`}>
        {granted ? <CircleCheck className="h-3.5 w-3.5" /> : <CircleX className="h-3.5 w-3.5" />}
        {granted ? "Granted" : "Denied"}
      </span>
    </div>
  );
}
