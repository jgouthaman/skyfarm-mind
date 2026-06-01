import { createFileRoute, Link } from "@tanstack/react-router";
import { Plane, Leaf, Flame, Building2, Map as MapIcon, GraduationCap, ArrowRight, Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

export const Route = createFileRoute("/control-center/")({
  head: () => ({ meta: [{ title: "AtomSky Control Center" }] }),
  component: Hub,
});

const verticals = [
  { id: "agrisky", name: "AgriSky", tag: "Agriculture Drone Intelligence", status: "Active", tone: "active",
    desc: "Farm aerial survey, boundary mapping, crop zone monitoring, fertilizer/input loading, spraying mission view, and activity logs.",
    icon: Leaf, cta: "Open AgriSky", to: "/control-center/agrisky" as const },
  { id: "guardsky", name: "GuardSky", tag: "Aerial Surveillance & Early Fire Response", status: "Prototype", tone: "proto",
    desc: "Live surveillance, smoke/fire detection support, alerting, and first-response payload deployment monitoring.",
    icon: Flame, cta: "Open GuardSky" },
  { id: "infrasky", name: "InfraSky", tag: "Infrastructure Inspection", status: "Coming Soon", tone: "soon",
    desc: "Inspection workflows for roads, bridges, towers, solar farms, buildings, and industrial assets.",
    icon: Building2, cta: "Coming Soon" },
  { id: "geosky", name: "GeoSky", tag: "Mapping & Survey Intelligence", status: "Coming Soon", tone: "soon",
    desc: "Aerial mapping, land survey, GIS data capture, and terrain intelligence.",
    icon: MapIcon, cta: "Coming Soon" },
  { id: "academy", name: "AtomSky Academy", tag: "Drone Training & Certification Support", status: "Coming Soon", tone: "soon",
    desc: "Drone pilot training, mission planning, agri-drone operations, mapping basics, and certification support.",
    icon: GraduationCap, cta: "Coming Soon" },
];

function statusClasses(tone: string) {
  if (tone === "active") return "bg-accent/15 text-accent border-accent/30";
  if (tone === "proto") return "bg-primary/15 text-primary border-primary/30";
  return "bg-muted text-muted-foreground border-border";
}

function Hub() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster richColors position="top-center" theme="dark" />

      <header className="border-b border-border/60 bg-card/40 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display font-semibold text-lg">
            <span className="grid place-items-center h-8 w-8 rounded-lg bg-gradient-primary shadow-glow">
              <Plane className="h-4 w-4 text-primary-foreground" />
            </span>
            <span>AtomSky <span className="text-muted-foreground font-normal">Control Center</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-md hover:bg-muted relative" onClick={() => toast("No new notifications")}>
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
            </button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/control-center/login"><LogOut className="h-4 w-4 mr-1" /> Sign out</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 lg:px-8 py-10">
        <div className="max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-semibold">AtomSky Control Center</h1>
          <p className="mt-3 text-muted-foreground">
            Manage drone operations, aerial intelligence workflows, and vertical-specific control centers.
          </p>
        </div>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {verticals.map((v) => {
            const Icon = v.icon;
            return (
              <div key={v.id} className="rounded-2xl border border-border/60 bg-gradient-card p-6 shadow-card flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="grid place-items-center h-10 w-10 rounded-xl bg-primary/10 border border-primary/20">
                    <Icon className="h-5 w-5 text-primary" />
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded-full border ${statusClasses(v.tone)}`}>{v.status}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{v.name}</h3>
                <p className="text-xs text-muted-foreground">{v.tag}</p>
                <p className="mt-3 text-sm text-muted-foreground flex-1">{v.desc}</p>
                <div className="mt-5">
                  {v.to ? (
                    <Button asChild className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
                      <Link to={v.to}>{v.cta} <ArrowRight className="ml-1 h-4 w-4" /></Link>
                    </Button>
                  ) : (
                    <Button disabled={v.tone === "soon"} variant={v.tone === "proto" ? "default" : "outline"} className="w-full" onClick={() => toast(`${v.name} prototype access coming soon`)}>
                      {v.cta}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
