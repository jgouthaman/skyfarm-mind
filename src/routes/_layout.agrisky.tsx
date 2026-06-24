import { createFileRoute, Link } from "@tanstack/react-router";
import { Leaf, Camera, Activity, Map as MapIcon, Droplets, FileText, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/Card";
import { IconBubble } from "@/components/IconBubble";

export const Route = createFileRoute("/_layout/agrisky")({
  component: AgriSkyPage,
});

const AGRISKY_FEATURES = [
  { icon: <Camera aria-hidden="true" />,   text: "Drone-based farm monitoring"        },
  { icon: <Activity aria-hidden="true" />, text: "Crop health & stress detection"      },
  { icon: <MapIcon aria-hidden="true" />,  text: "Farm zone mapping"                  },
  { icon: <Droplets aria-hidden="true" />, text: "Irrigation & organic input advisory" },
  { icon: <FileText aria-hidden="true" />, text: "Farmer-friendly reports"             },
  { icon: <Sparkles aria-hidden="true" />, text: "Future precision spraying support"   },
];

function AgriSkyPage() {
  return (
    <section id="agrisky" className="relative py-20 sm:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-agri opacity-[0.08] pointer-events-none" />
      <div className="mx-auto max-w-7xl px-5 lg:px-8 relative">
        <div className="grid lg:grid-cols-12 gap-10 items-start">

          <div className="lg:col-span-5">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent-foreground bg-accent border border-accent px-3 py-1.5 rounded-full shadow-glow">
              <Leaf className="h-3.5 w-3.5" aria-hidden="true" /> Flagship vertical
            </span>
            <h2 className="mt-5 text-3xl sm:text-4xl font-semibold">
              Flagship vertical:{" "}
              <span className="bg-gradient-agri bg-clip-text text-transparent">AgriSky</span>
            </h2>
            <p className="mt-2 text-lg text-muted-foreground">Agriculture drone intelligence by TorqWings</p>
            <p className="mt-5 text-muted-foreground">
              AgriSky helps farmers and agri-organizations monitor crop health, detect stress early, plan
              irrigation, and enable precision farming using drone imagery and AI-based farm advisory.
            </p>
            <Button asChild size="lg" className="mt-7 bg-gradient-agri text-primary-foreground hover:opacity-90 shadow-soft">
              <Link to="/contact">
                Explore AgriSky <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
            {AGRISKY_FEATURES.map((c) => (
              <Card key={c.text}>
                <IconBubble tone="agri">{c.icon}</IconBubble>
                <p className="mt-4 font-medium">{c.text}</p>
              </Card>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
