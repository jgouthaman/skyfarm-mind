import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Flame, Eye, Bell, Zap, Package, Radar,
  Building2, Sun, Sprout, GraduationCap, Map as MapIcon, Globe2, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/Card";
import { IconBubble } from "@/components/IconBubble";

export const Route = createFileRoute("/_layout/guardsky")({
  component: GuardSkyPage,
});

const GUARDSKY_FEATURES = [
  { icon: <Eye aria-hidden="true" />,     text: "Real-time aerial surveillance"    },
  { icon: <Flame aria-hidden="true" />,   text: "Smoke and fire detection support" },
  { icon: <Bell aria-hidden="true" />,    text: "Live monitoring and alerting"     },
  { icon: <Zap aria-hidden="true" />,     text: "Rapid first-response support"     },
  { icon: <Package aria-hidden="true" />, text: "Payload deployment prototype"     },
  { icon: <Radar aria-hidden="true" />,   text: "Remote area and asset monitoring" },
];

const GUARDSKY_USE_CASES = [
  { icon: <Building2 aria-hidden="true" />,      text: "Industrial sites"            },
  { icon: <Building2 aria-hidden="true" />,      text: "Warehouses"                  },
  { icon: <Sun aria-hidden="true" />,            text: "Solar farms"                 },
  { icon: <Sprout aria-hidden="true" />,         text: "Farms and rural land"        },
  { icon: <GraduationCap aria-hidden="true" />,  text: "Campuses and institutions"   },
  { icon: <MapIcon aria-hidden="true" />,        text: "Remote infrastructure"       },
  { icon: <Globe2 aria-hidden="true" />,         text: "Resorts and retreat properties" },
];

function GuardSkyPage() {
  return (
    <section id="guardsky" className="relative py-20 sm:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-primary opacity-[0.06] pointer-events-none" />
      <div className="mx-auto max-w-7xl px-5 lg:px-8 relative">

        <div className="grid lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground bg-primary border border-primary px-3 py-1.5 rounded-full shadow-glow">
              <Flame className="h-3.5 w-3.5" aria-hidden="true" /> Prototype vertical
            </span>
            <h2 className="mt-5 text-3xl sm:text-4xl font-semibold">GuardSky</h2>
            <p className="mt-2 text-lg text-muted-foreground">
              Aerial surveillance and early fire response by TorqWings
            </p>
            <p className="mt-5 text-muted-foreground">
              GuardSky is a prototype drone-based surveillance and emergency-support solution designed to
              monitor critical areas, detect possible fire or smoke incidents, provide real-time aerial
              visibility, alert operators, and support rapid intervention through targeted deployment of
              fire suppression payloads near the incident zone.
            </p>
            <Button asChild size="lg" className="mt-7 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
              <Link to="/contact">
                Explore GuardSky <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
            {GUARDSKY_FEATURES.map((c) => (
              <Card key={c.text}>
                <IconBubble>{c.icon}</IconBubble>
                <p className="mt-4 font-medium">{c.text}</p>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-16">
          <h3 className="text-xl font-semibold mb-6">Use cases</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {GUARDSKY_USE_CASES.map((c) => (
              <Card key={c.text} className="text-center items-center flex flex-col">
                <IconBubble>{c.icon}</IconBubble>
                <p className="mt-3 text-sm font-medium">{c.text}</p>
              </Card>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
