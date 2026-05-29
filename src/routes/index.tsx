import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Plane, Leaf, Droplets, ScanLine, Sprout, Radio, Map, Brain, FileText,
  CheckCircle2, ArrowRight, ShieldCheck, Languages, Activity, Sparkles,
  Mail, Phone, MapPin, Menu, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import heroDrone from "@/assets/hero-drone.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgriSky — AI-powered drone intelligence for smarter farms" },
      { name: "description", content: "AgriSky turns drone imagery into actionable crop health, irrigation and farm advisory insights for Indian farms, FPOs and agri partners." },
      { property: "og:title", content: "AgriSky — Drone-powered intelligence for smarter farms" },
      { property: "og:description", content: "AI crop health, irrigation advisory and precision spraying — built for Indian agriculture." },
      { property: "og:image", content: heroDrone },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Landing,
});

const nav = [
  { label: "Home", href: "#home" },
  { label: "Solution", href: "#solution" },
  { label: "Products", href: "#products" },
  { label: "Pilot", href: "#pilot" },
  { label: "Contact", href: "#contact" },
];

function Landing() {
  const [open, setOpen] = useState(false);
  return (
    <div id="home" className="min-h-screen bg-background text-foreground">
      <Toaster richColors position="top-center" />

      {/* NAV */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-background/75 border-b border-border/60">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 h-16 flex items-center justify-between">
          <a href="#home" className="flex items-center gap-2 font-display font-semibold text-lg">
            <span className="grid place-items-center h-9 w-9 rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
              <Plane className="h-4 w-4" />
            </span>
            AgriSky
          </a>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="hover:text-foreground transition-colors">{n.label}</a>
            ))}
          </nav>
          <a href="#contact" className="hidden md:inline-flex">
            <Button size="sm" className="rounded-full px-5">Join Pilot</Button>
          </a>
          <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <div className="md:hidden border-t border-border bg-background">
            <div className="px-5 py-4 flex flex-col gap-3 text-sm">
              {nav.map((n) => (
                <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="py-1">{n.label}</a>
              ))}
              <a href="#contact" onClick={() => setOpen(false)}>
                <Button size="sm" className="w-full rounded-full mt-2">Join Pilot</Button>
              </a>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{ background: "var(--gradient-soft)" }}
        />
        <div className="absolute -z-10 top-20 right-[-10%] h-[420px] w-[420px] rounded-full blur-3xl opacity-50"
          style={{ background: "radial-gradient(circle, oklch(0.72 0.12 230 / 0.35), transparent 70%)" }} />
        <div className="absolute -z-10 bottom-0 left-[-10%] h-[420px] w-[420px] rounded-full blur-3xl opacity-50"
          style={{ background: "radial-gradient(circle, oklch(0.5 0.14 150 / 0.3), transparent 70%)" }} />

        <div className="mx-auto max-w-7xl px-5 lg:px-8 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground mb-6">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Agri-drone intelligence • Made for India
            </div>
            <h1 className="text-5xl lg:text-7xl font-semibold tracking-tight leading-[1.05]">
              AgriSky
            </h1>
            <p className="mt-4 text-xl lg:text-2xl text-foreground/80 font-display">
              AI-powered drone intelligence for smarter farms
            </p>
            <p className="mt-6 text-base lg:text-lg text-muted-foreground max-w-xl leading-relaxed">
              AgriSky helps farmers monitor crop health, detect stress early, plan irrigation, and enable
              precision farming using drone imagery and AI-based farm advisory.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#contact"><Button size="lg" className="rounded-full px-7 h-12 shadow-[var(--shadow-soft)]">
                Join Pilot Program <ArrowRight className="ml-1 h-4 w-4" />
              </Button></a>
              <a href="#products"><Button size="lg" variant="outline" className="rounded-full px-7 h-12 border-foreground/15">
                Explore Technology
              </Button></a>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
              {[
                { k: "10×", v: "Faster scouting" },
                { k: "30%", v: "Water saved" },
                { k: "24h", v: "AI report turnaround" },
              ].map((s) => (
                <div key={s.v}>
                  <div className="text-2xl font-display font-semibold text-primary">{s.k}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 relative">
            <div className="relative rounded-3xl overflow-hidden shadow-[var(--shadow-soft)] border border-border/60">
              <img
                src={heroDrone}
                alt="Agricultural drone flying over Indian farmland at sunrise"
                width={1600}
                height={1100}
                className="w-full h-[460px] lg:h-[560px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 via-transparent to-transparent" />

              {/* Floating dashboard cards */}
              <div className="absolute top-5 left-5 rounded-2xl bg-card/95 backdrop-blur p-3 shadow-[var(--shadow-card)] border border-border/60 w-44">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Activity className="h-3.5 w-3.5 text-primary" /> Crop Health
                </div>
                <div className="mt-1 text-2xl font-display font-semibold">NDVI 0.78</div>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-[78%] bg-primary" />
                </div>
                <div className="text-[10px] mt-1 text-primary">Healthy canopy</div>
              </div>

              <div className="absolute bottom-5 right-5 rounded-2xl bg-card/95 backdrop-blur p-3 shadow-[var(--shadow-card)] border border-border/60 w-52">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Droplets className="h-3.5 w-3.5 text-sky" /> Irrigation Zone B
                </div>
                <div className="mt-1 text-sm font-medium">Soil moisture low</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Recommend 18 mm in next 24h</div>
              </div>

              <div className="absolute bottom-5 left-5 rounded-full bg-card/95 backdrop-blur px-3 py-1.5 shadow-[var(--shadow-card)] border border-border/60 text-xs flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Live scan • 4.2 ha
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <Section id="problem" eyebrow="The Problem" title="Farming decisions need better visibility">
        <p className="text-muted-foreground max-w-2xl mb-12">
          Across Indian farms, critical decisions are still made on guesswork. By the time problems show up to the naked eye, yield and income are already lost.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { i: ScanLine, t: "Crop disease detected late", d: "Visible symptoms appear only after significant damage has spread across the field." },
            { i: Droplets, t: "Water stress missed early", d: "Irrigation is scheduled by calendar, not by what the crop actually needs." },
            { i: Sprout, t: "Manual spraying is slow", d: "Labour-dependent, inconsistent coverage, and rising costs every season." },
            { i: Map, t: "No zone-wise insight", d: "Farms are treated as one unit, ignoring stress hotspots and yield variation." },
            { i: ShieldCheck, t: "Drones feel out of reach", d: "Small and marginal farms cannot afford enterprise drone systems on their own." },
            { i: Leaf, t: "Generic organic advice", d: "Recommendations are not personalised to soil, crop stage or local conditions." },
          ].map(({ i: Icon, t, d }) => (
            <div key={t} className="group rounded-2xl border border-border bg-card p-6 hover:border-primary/40 transition-colors shadow-[var(--shadow-card)]">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive grid place-items-center mb-4">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-medium">{t}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* SOLUTION */}
      <section id="solution" className="py-24 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-soft)" }} />
        <div className="mx-auto max-w-7xl px-5 lg:px-8 grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <Eyebrow>The Solution</Eyebrow>
            <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight mt-3">
              From sky view to <span className="text-primary">farm action</span>
            </h2>
            <p className="mt-6 text-muted-foreground leading-relaxed">
              AgriSky converts high-resolution drone imagery into clear, zone-wise insights on crop health, irrigation
              and farm advisory. Every flight becomes a recommendation the farmer can act on the same day —
              in the dashboard, as a PDF report, or on WhatsApp in the local language.
            </p>
            <div className="mt-8 space-y-4">
              {[
                "Multispectral and RGB imagery from agri-grade drones",
                "AI models trained for Indian crops and growing conditions",
                "Actionable advisory, not raw data dumps",
                "Built for farmers, FPOs, agri colleges and drone operators",
              ].map((p) => (
                <div key={p} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{p}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { i: Plane, t: "Capture", c: "primary" },
                  { i: Brain, t: "Analyse", c: "sky" },
                  { i: FileText, t: "Advise", c: "earth" },
                  { i: Radio, t: "Deliver", c: "primary" },
                ].map(({ i: Icon, t, c }) => (
                  <div key={t} className="rounded-2xl border border-border p-5 bg-background">
                    <div
                      className="h-10 w-10 rounded-xl grid place-items-center mb-3"
                      style={{ background: `color-mix(in oklab, var(--${c}) 15%, transparent)`, color: `var(--${c})` }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="font-display font-medium">{t}</div>
                    <div className="text-xs text-muted-foreground mt-1">Drone → AI → Farm</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl p-4 text-sm" style={{ background: "var(--gradient-hero)", color: "white" }}>
                <div className="font-display text-base">Sky view → Field action</div>
                <div className="opacity-80 text-xs mt-1">One platform from image to insight to outcome.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <Section id="products" eyebrow="Product Modules" title="A platform across the farm intelligence stack">
        <div className="grid md:grid-cols-2 gap-5 mt-4">
          {[
            { i: Plane, name: "AgriSky Scout", tag: "Drone Hardware",
              d: "Custom-built monitoring drone for farm mapping, scouting and high-resolution imagery capture across small and mid-size farms." },
            { i: Brain, name: "AgriSky Vision", tag: "AI Platform",
              d: "Computer-vision platform that analyses drone imagery for NDVI, crop stress, pest hotspots and growth-stage insights." },
            { i: FileText, name: "AgriSky Advisory", tag: "Recommendation Engine",
              d: "Generates irrigation, pest, disease and organic input recommendations personalised to crop, stage and zone." },
            { i: Droplets, name: "AgriSky Spray", tag: "Coming Soon",
              d: "Future precision spraying drone for variable-rate application of bio-inputs and crop protection products." },
          ].map(({ i: Icon, name, tag, d }) => (
            <div key={name} className="group relative rounded-3xl border border-border bg-card p-7 hover:shadow-[var(--shadow-soft)] hover:-translate-y-0.5 transition-all overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-sky to-earth opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-start justify-between mb-5">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary grid place-items-center">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-[10px] uppercase tracking-wider rounded-full border border-border px-2.5 py-1 text-muted-foreground">
                  {tag}
                </span>
              </div>
              <h3 className="font-display text-xl font-semibold">{name}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* HOW IT WORKS */}
      <section className="py-24 lg:py-32 bg-foreground text-background relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 -z-0"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="mx-auto max-w-7xl px-5 lg:px-8 relative">
          <Eyebrow className="text-background/70 border-background/20">How It Works</Eyebrow>
          <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight mt-3 max-w-2xl">
            Four steps from drone flight to farmer decision
          </h2>
          <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { n: "01", i: Plane, t: "Drone captures farm images", d: "AgriSky Scout flies a pre-planned mission and captures high-resolution farm imagery." },
              { n: "02", i: Brain, t: "AI analyses crop health", d: "Vision models process imagery into NDVI, stress and zone-wise health maps." },
              { n: "03", i: Sparkles, t: "Advisory generates actions", d: "Advisory engine turns analysis into irrigation, input and intervention recommendations." },
              { n: "04", i: Radio, t: "Farmer gets the report", d: "Delivered as a dashboard, downloadable PDF or local-language WhatsApp report." },
            ].map(({ n, i: Icon, t, d }) => (
              <div key={n} className="relative rounded-2xl border border-background/15 bg-background/5 p-6 backdrop-blur">
                <div className="text-xs font-mono text-background/60">{n}</div>
                <div className="h-10 w-10 rounded-xl bg-background/10 grid place-items-center my-3">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="font-display text-lg">{t}</div>
                <div className="text-sm text-background/70 mt-2 leading-relaxed">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PILOT */}
      <Section id="pilot" eyebrow="Pilot Program" title="Starting with the Arunamangala Pilot">
        <div className="grid lg:grid-cols-5 gap-10 items-center">
          <div className="lg:col-span-3">
            <p className="text-muted-foreground leading-relaxed">
              AgriSky begins with a live farm pilot at Arunamangala to validate the full intelligence loop —
              drone image capture, farm zone mapping, AI crop health reports, and farmer-friendly recommendations.
              The pilot is our proving ground for accuracy, usability, and on-ground value before scaling to
              FPOs and partner farms across the region.
            </p>
            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              {[
                "Drone image capture across multiple growth stages",
                "Zone-wise farm mapping and health benchmarks",
                "AI-generated reports validated with agronomists",
                "Local-language farmer feedback loop",
              ].map((p) => (
                <div key={p} className="flex gap-3 items-start rounded-xl border border-border bg-card p-4">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{p}</span>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <a href="#contact"><Button size="lg" className="rounded-full px-7">Apply to be a pilot partner <ArrowRight className="ml-1 h-4 w-4" /></Button></a>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="rounded-3xl p-8 text-primary-foreground relative overflow-hidden shadow-[var(--shadow-soft)]"
              style={{ background: "var(--gradient-hero)" }}>
              <MapPin className="h-7 w-7 mb-4 opacity-90" />
              <div className="text-sm opacity-80">Pilot Location</div>
              <div className="font-display text-3xl mt-1">Arunamangala</div>
              <div className="text-sm opacity-80 mt-1">India • Live farm validation</div>
              <div className="mt-6 grid grid-cols-2 gap-4">
                {[
                  { k: "Phase 01", v: "Image capture" },
                  { k: "Phase 02", v: "AI mapping" },
                  { k: "Phase 03", v: "Advisory" },
                  { k: "Phase 04", v: "Farmer reports" },
                ].map((p) => (
                  <div key={p.k} className="rounded-xl bg-white/15 backdrop-blur p-3">
                    <div className="text-[10px] opacity-80 uppercase tracking-wider">{p.k}</div>
                    <div className="text-sm font-medium mt-0.5">{p.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* BENEFITS */}
      <Section id="benefits" eyebrow="Benefits" title="Built for outcomes farmers can feel">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { i: Activity, t: "Early crop stress detection", d: "Spot stress days before it shows to the eye and act before yield is lost." },
            { i: Droplets, t: "Better irrigation decisions", d: "Zone-wise moisture and stress mapping cuts water use without hurting yield." },
            { i: ScanLine, t: "Lower manual inspection", d: "Cover acres in minutes instead of days, with fewer field walks." },
            { i: Sprout, t: "Precision spraying support", d: "Variable-rate spraying reduces input cost and chemical load on the soil." },
            { i: Leaf, t: "Organic farming guidance", d: "Personalised bio-input recommendations based on real field signals." },
            { i: Languages, t: "Local-language reports", d: "WhatsApp and PDF reports in the language farmers actually use." },
          ].map(({ i: Icon, t, d }) => (
            <div key={t} className="rounded-2xl bg-card border border-border p-6 hover:border-primary/40 transition-colors">
              <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-4">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-medium">{t}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* CONTACT */}
      <section id="contact" className="py-24 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-soft)" }} />
        <div className="mx-auto max-w-6xl px-5 lg:px-8 grid lg:grid-cols-5 gap-12">
          <div className="lg:col-span-2">
            <Eyebrow>Join Pilot</Eyebrow>
            <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight mt-3">
              Bring AgriSky to your farm
            </h2>
            <p className="mt-5 text-muted-foreground">
              Farmers, FPOs, agri colleges, drone operators, incubators, investors — share your details and our team will get in touch.
            </p>
            <div className="mt-8 space-y-4 text-sm">
              <div className="flex items-center gap-3 text-muted-foreground"><Mail className="h-4 w-4 text-primary" /> hello@agrisky.in</div>
              <div className="flex items-center gap-3 text-muted-foreground"><Phone className="h-4 w-4 text-primary" /> Gouthaman — +91 99402 63589</div>
              <div className="flex items-center gap-3 text-muted-foreground"><MapPin className="h-4 w-4 text-primary" /> Arunamangala, India</div>
            </div>
          </div>
          <div className="lg:col-span-3">
            <ContactForm />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 py-12 grid md:grid-cols-3 gap-8 items-start">
          <div>
            <div className="flex items-center gap-2 font-display font-semibold text-lg">
              <span className="grid place-items-center h-9 w-9 rounded-xl bg-primary text-primary-foreground">
                <Plane className="h-4 w-4" />
              </span>
              AgriSky
            </div>
            <p className="text-sm text-muted-foreground mt-3 max-w-xs">
              Drone-powered intelligence for smarter farms.
            </p>
          </div>
          <div className="text-sm">
            <div className="font-display mb-3">Explore</div>
            <ul className="space-y-2 text-muted-foreground">
              {nav.map((n) => <li key={n.href}><a href={n.href} className="hover:text-foreground">{n.label}</a></li>)}
            </ul>
          </div>
          <div className="text-sm">
            <div className="font-display mb-3">Contact</div>
            <ul className="space-y-2 text-muted-foreground">
              <li>hello@agrisky.in</li>
              <li>Arunamangala, India</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} AgriSky. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      {children}
    </span>
  );
}

function Section({
  id, eyebrow, title, children,
}: { id?: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight mt-3 max-w-3xl">{title}</h2>
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}

function ContactForm() {
  const [submitting, setSubmitting] = useState(false);
  const [interest, setInterest] = useState<string>("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitting(true);
        setTimeout(() => {
          setSubmitting(false);
          (e.target as HTMLFormElement).reset();
          setInterest("");
          toast.success("Thanks! We'll be in touch shortly.");
        }, 700);
      }}
      className="rounded-3xl bg-card border border-border p-6 lg:p-8 shadow-[var(--shadow-soft)] space-y-4"
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Name"><Input required name="name" placeholder="Your name" /></Field>
        <Field label="Phone"><Input required name="phone" type="tel" placeholder="+91" /></Field>
        <Field label="Email"><Input required name="email" type="email" placeholder="you@farm.in" /></Field>
        <Field label="Location"><Input required name="location" placeholder="Village, District" /></Field>
        <Field label="Farm size"><Input name="size" placeholder="e.g. 4 acres" /></Field>
        <Field label="Crop type"><Input name="crop" placeholder="e.g. Paddy, Cotton" /></Field>
      </div>
      <Field label="Interested in">
        <Select value={interest} onValueChange={setInterest}>
          <SelectTrigger><SelectValue placeholder="Select an option" /></SelectTrigger>
          <SelectContent>
            {["Drone Survey", "AI Crop Report", "Spraying Service", "Partnership", "Investment"].map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Message"><Textarea name="message" placeholder="Tell us about your farm or interest" rows={4} /></Field>
      <Button type="submit" disabled={submitting} size="lg" className="w-full rounded-full h-12">
        {submitting ? "Submitting…" : "Submit Interest"}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
