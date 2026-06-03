import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Plane, Leaf, Flame, Truck, GraduationCap, Sparkles, ArrowRight, Bell, LogOut, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useControlAuth } from "@/hooks/useControlAuth";

export const Route = createFileRoute("/control-center/")({
  head: () => ({
    meta: [
      { title: "AeroSpawn Control Center" },
      { name: "description", content: "AeroSpawn Control Center hub. Access AgriSky, GuardSky, and vertical dashboards to manage drone operations." },
      { property: "og:title", content: "AeroSpawn Control Center" },
      { property: "og:description", content: "AeroSpawn Control Center hub. Access AgriSky, GuardSky, and vertical dashboards to manage drone operations." },
    ],
    links: [
      { rel: "canonical", href: "/control-center" },
    ],
  }),
  component: Hub,
});

const verticals = [
  { id: "agrisky", name: "AgriSky Control Center", tag: "Agriculture Drone Intelligence", status: "Active", tone: "active",
    desc: "Farm aerial survey, boundary mapping, crop zone monitoring, fertilizer/input loading, spraying mission view, and activity logs.",
    icon: Leaf, cta: "Open AgriSky", to: "/control-center/agrisky" as const },
  { id: "guardsky", name: "GuardSky Control Center", tag: "Aerial Surveillance & Early Fire Response", status: "Prototype", tone: "proto",
    desc: "Live surveillance, smoke/fire detection support, alerting, and first-response payload deployment monitoring.",
    icon: Flame, cta: "Open GuardSky" },
  { id: "deliverysky", name: "DeliverySky Control Center", tag: "Autonomous Payload Delivery", status: "Coming Soon", tone: "soon",
    desc: "Route planning, payload tracking, and last-mile drone delivery operations.",
    icon: Truck, cta: "Coming Soon" },
  { id: "trainsky", name: "TrainSky Control Center", tag: "Drone Pilot Training & Certification", status: "Coming Soon", tone: "soon",
    desc: "Structured drone pilot training, mission rehearsal, and certification tracking.",
    icon: GraduationCap, cta: "Coming Soon" },
  { id: "design-studio", name: "AeroSpawn Design Studio", tag: "AI-Powered Drone Design Studio", status: "New", tone: "active",
    desc: "AI-powered drone design, component generation, simulation, and engineering advisory studio.",
    icon: Sparkles, cta: "Open Design Studio", to: "/control-center/aerospawn-design-studio" as const },
];

function statusClasses(tone: string) {
  if (tone === "active") return "bg-accent/15 text-accent border-accent/30";
  if (tone === "proto") return "bg-primary/15 text-primary border-primary/30";
  return "bg-muted text-muted-foreground border-border";
}

function Hub() {
  const auth = useControlAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.loading && !auth.userId) navigate({ to: "/control-center/login" });
  }, [auth.loading, auth.userId, navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/control-center/login" });
  };

  if (auth.loading || !auth.userId) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster richColors position="top-center" theme="dark" />

      <header className="border-b border-border/60 bg-card/40 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display font-semibold text-lg">
            <span className="grid place-items-center h-8 w-8 rounded-lg bg-gradient-primary shadow-glow">
              <Plane className="h-4 w-4 text-primary-foreground" />
            </span>
            <span>AeroSpawn <span className="text-muted-foreground font-normal">Control Center</span></span>
          </Link>
          <div className="flex items-center gap-2">
            {auth.phone && (
              <span className="hidden sm:inline text-xs text-muted-foreground mr-2">
                {auth.phone}{auth.isAdmin ? " · admin" : auth.roles[0] ? ` · ${auth.roles[0]}` : ""}
              </span>
            )}
            {auth.isAdmin && (
              <Button asChild variant="outline" size="sm">
                <Link to="/control-center/users"><Users className="h-4 w-4 mr-1" /> Users</Link>
              </Button>
            )}
            <button className="p-2 rounded-md hover:bg-muted relative" onClick={() => toast("No new notifications")} aria-label="Notifications">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
            </button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-1" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 lg:px-8 py-10">
        <div className="max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-semibold">AeroSpawn Control Center</h1>
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
                <h2 className="mt-4 text-lg font-semibold">{v.name}</h2>
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
