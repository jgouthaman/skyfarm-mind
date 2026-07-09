import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ClipboardList, Split, Cpu, FileCheck, Scale, BookOpen, Eye } from "lucide-react";
import { SectionBadge } from "@/components/SectionBadge";
import { Card } from "@/components/Card";
import { IconBubble } from "@/components/IconBubble";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DesignStudioPricing } from "@/components/design-studio-pricing";
import demoVideo from "@/assets/design-studio-demo.mp4.asset.json";

export const Route = createFileRoute("/_layout/design-studio")({
  component: DesignStudioPage,
});

const DS_STATS = [
  { label: "Total Designs", value: 12, tone: "text-sky-600"     },
  { label: "Simulations",   value: 8,  tone: "text-indigo-600"  },
  { label: "Safe Designs",  value: 9,  tone: "text-emerald-600" },
  { label: "Warning",       value: 2,  tone: "text-amber-600"   },
  { label: "Unsafe",        value: 1,  tone: "text-red-600"     },
  { label: "AI Reviews",    value: 24, tone: "text-violet-600"  },
];

const DS_TABLE_ROWS = [
  { name: "AgriSpray X1",  vertical: "Agriculture",    type: "Hexacopter", risk: "Safe",    status: "Finalized" },
  { name: "Solar Scout",   vertical: "Infrastructure", type: "Quadcopter", risk: "Safe",    status: "Simulated" },
  { name: "FireWatch Pro", vertical: "Surveillance",   type: "Octocopter", risk: "Warning", status: "Designed"  },
  { name: "MapStream 300", vertical: "Mapping",        type: "Fixed Wing", risk: "Safe",    status: "Finalized" },
  { name: "CargoLift 50",  vertical: "Logistics",      type: "Hexacopter", risk: "Unsafe",  status: "Draft"     },
];

const RISK_STYLES: Record<string, string> = {
  Safe:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  Warning: "bg-amber-50 text-amber-700 border-amber-200",
  Unsafe:  "bg-red-50 text-red-700 border-red-200",
};

const DS_PIPELINE = [
  { num: "1", icon: <ClipboardList aria-hidden="true" />, text: "Mission Brief", desc: "Tell it what you're flying — payload, range, endurance, hover need." },
  { num: "2", icon: <Split aria-hidden="true" />, text: "Platform Match", desc: "Gate-then-score logic picks multirotor, fixed-wing, or VTOL-hybrid — with its reasoning shown, not hidden." },
  { num: "3", icon: <Cpu aria-hidden="true" />, text: "Component Intelligence", desc: "Rule Solver and Reference Matcher pull from codified design rules and proven builds — not a guess." },
  { num: "4", icon: <FileCheck aria-hidden="true" />, text: "Simulation-Validated Blueprint", desc: "Every design is stress-tested in simulation before a single component gets ordered." },
];

const DS_CREDIBILITY = [
  { icon: <Scale aria-hidden="true" />, text: "Regulatory-anchored", desc: "Payload thresholds aren't arbitrary — they're built on DGCA's own weight classification, so your design starts compliant." },
  { icon: <BookOpen aria-hidden="true" />, text: "Research-grounded", desc: "Platform-selection weighting follows published aerospace decision-science research, not vendor intuition." },
  { icon: <Eye aria-hidden="true" />, text: "Never a black box", desc: "Confidence scores, contributing factors, and the runner-up option are always visible — audit the logic, don't just trust it." },
];

function DesignStudioPage() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <>
      <section id="design-studio" className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-primary opacity-[0.06] pointer-events-none" />
        <div className="mx-auto max-w-7xl px-5 lg:px-8 relative">
          <div className="grid lg:grid-cols-12 gap-10 items-start">

            <div className="lg:col-span-5">
              <SectionBadge label="Engineering Vertical" />
              <h2 className="text-3xl sm:text-4xl font-bold">TorqWings Design Studio</h2>
              <p className="mt-2 text-lg text-muted-foreground">
                The engineering studio that turns a mission brief into a simulation-validated, flyable platform
                — in one session, not one procurement cycle.
              </p>
              <p className="mt-5 text-muted-foreground">
                TorqWings Design Studio is an engineering workspace where teams design autonomous aerial platform architectures
                from mission requirements, run real-time flight simulations, generate component lists, and
                receive AI-powered design reviews — turning concepts into flyable systems faster.
              </p>
              <Button
                size="lg"
                onClick={() => setDemoOpen(true)}
                className="mt-7 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
              >
                Watch Design Studio Demo <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {DS_STATS.map((k) => (
                  <div key={k.label} className="rounded-xl border border-border/60 bg-card/60 p-4">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k.label}</div>
                    <div className={`mt-1 text-xl font-semibold ${k.tone}`}>{k.value}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" aria-label="Design Studio project overview">
                    <caption className="sr-only">Design Studio projects with vertical, platform type, risk, and status</caption>
                    <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th scope="col" className="text-left font-medium px-4 py-2">Project</th>
                        <th scope="col" className="text-left font-medium px-4 py-2">Vertical</th>
                        <th scope="col" className="text-left font-medium px-4 py-2">Platform Type</th>
                        <th scope="col" className="text-left font-medium px-4 py-2">Risk</th>
                        <th scope="col" className="text-left font-medium px-4 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DS_TABLE_ROWS.map((p) => (
                        <tr key={p.name} className="border-t border-border/60 hover:bg-muted/20">
                          <td className="px-4 py-2 font-medium">{p.name}</td>
                          <td className="px-4 py-2 text-muted-foreground">{p.vertical}</td>
                          <td className="px-4 py-2 text-muted-foreground">{p.type}</td>
                          <td className="px-4 py-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${RISK_STYLES[p.risk] ?? ""}`}>
                              {p.risk}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/40 border border-border">
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <section className="py-14 sm:py-16 border-y border-border/60 bg-muted/20">
        <div className="mx-auto max-w-5xl px-5 lg:px-8 text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            How it works
          </span>
          <h2 className="mt-3 text-2xl sm:text-3xl font-bold">
            Every Recommendation Shows Its Reasoning
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            The Design Studio doesn't just output a platform type — it shows the gate-and-score logic
            behind it: which factors mattered, how confident the match is, and what the runner-up would
            have been. Engineering judgment you can audit, not a black box.
          </p>

          <div className="mt-8 grid sm:grid-cols-3 gap-3 max-w-3xl mx-auto">
            {["Gate-then-score model", "Confidence-scored results", "Runner-up always shown"].map((item) => (
              <div
                key={item}
                className="rounded-lg border border-border/60 bg-card/60 px-4 py-3 text-sm font-medium"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              The pipeline
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold">
              From Mission Brief to Flyable Design
            </h2>
          </div>

          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {DS_PIPELINE.map((s, idx) => (
              <div key={s.num} className="relative">
                <Card className="h-full">
                  <div className="flex items-center justify-between">
                    <IconBubble>{s.icon}</IconBubble>
                    <span className="text-xs font-mono text-muted-foreground">{s.num}</span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{s.text}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
                </Card>
                {idx < DS_PIPELINE.length - 1 && (
                  <ArrowRight
                    aria-hidden="true"
                    className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 h-4 w-4 text-primary/60"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 border-t border-border/60 bg-muted/10">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              The credibility
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold">
              Why Engineers Trust the Math
            </h2>
          </div>

          <div className="mt-10 grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {DS_CREDIBILITY.map((c) => (
              <Card key={c.text}>
                <IconBubble>{c.icon}</IconBubble>
                <h3 className="mt-4 text-base font-semibold">{c.text}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{c.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>TorqWings Design Studio — Demo</DialogTitle>
            <DialogDescription>
              A quick walkthrough of the engineering workspace. Live access is restricted to authorized teams.
            </DialogDescription>
          </DialogHeader>
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
            <video src={demoVideo.url} controls autoPlay className="h-full w-full" />
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
            For access to the Design Studio, please reach out to{" "}
            <a href="mailto:Torqwings@gmail.com" className="font-semibold text-primary hover:underline">
              Torqwings@gmail.com
            </a>.
          </div>
        </DialogContent>
      </Dialog>

      <DesignStudioPricing />
    </>
  );
}
