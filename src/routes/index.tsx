import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Plane, Leaf, Droplets, ScanLine, Sprout, Map as MapIcon, Brain, FileText,
  CheckCircle2, ArrowRight, ShieldCheck, Activity, Sparkles,
  Mail, Phone, MapPin, Menu, X, Satellite, Cpu, Radar, Building2,
  Cog, Camera, Layers, BarChart3, Rocket, Wrench, Compass, Eye,
  GitBranch, Users, FlaskConical, Globe2, Zap, GraduationCap,
  Flame, Bell, Package, Sun,
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
import heroImg from "@/assets/aerospawn-hero.jpg";
import demoVideo from "@/assets/design-studio-demo.mp4.asset.json";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:title", content: "TorqWings — Aerospace & Drone Intelligence" },
      { property: "og:description", content: "Custom UAV engineering and AI aerial analytics across agriculture, infrastructure, mapping, surveillance and R&D." },
      { property: "og:image", content: heroImg },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
    ],
    links: [
      { rel: "canonical", href: "/" },
      { rel: "preload", as: "image", href: heroImg, fetchpriority: "high" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "TorqWings",
          url: "https://aerospawn.com",
          logo: "https://aerospawn.com/app-icon.png",
          description: "TorqWings builds AI-powered drone systems, custom UAVs, and aerial intelligence solutions.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "AgriSky",
          serviceType: "Agriculture Drone Intelligence",
          provider: { "@type": "Organization", name: "TorqWings" },
          description: "Drone-based farm monitoring, crop health analysis, irrigation insights, and precision farming.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "GuardSky",
          serviceType: "Aerial Surveillance & Early Fire Response",
          provider: { "@type": "Organization", name: "TorqWings" },
          description: "Drone-based surveillance, smoke and fire detection, and rapid first-response payload deployment.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: "TorqWings",
          telephone: "+91 99402 63589",
          address: {
            "@type": "PostalAddress",
            addressCountry: "IN",
            addressLocality: "India",
          },
          url: "https://aerospawn.com",
          description: "TorqWings builds AI-powered drone systems, custom UAVs, and aerial intelligence solutions.",
        }),
      },
    ],
  }),
  component: Landing,
});

const nav = [
  { label: "Home", href: "#home" },
  { label: "Solutions", href: "#solutions" },
  { label: "Verticals", href: "#verticals" },
  { label: "Technology", href: "#technology" },
  { label: "Pilots", href: "#pilots" },
  { label: "Academy", href: "#academy" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "#contact" },
];

function Landing() {
  const [open, setOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  return (
    <div id="home" className="min-h-screen bg-background text-foreground">
      <Toaster richColors position="top-center" theme="dark" />

      {/* NAV */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/60">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 h-16 flex items-center justify-between">
          <a href="#home" className="flex items-center gap-2 font-display font-semibold text-lg">
            <span className="grid place-items-center h-8 w-8 rounded-lg bg-gradient-primary shadow-glow">
              <Plane className="h-4 w-4 text-primary-foreground" />
            </span>
            <span>TorqWings</span>
          </a>
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="hover:text-foreground transition-colors">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-2">
            <Button asChild size="sm" variant="outline" className="border-border/80 bg-card/40 backdrop-blur hover:bg-card">
              <Link to="/control-center/login">Control Center Login</Link>
            </Button>
            <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90">
              <a href="#contact">Partner with us</a>
            </Button>
          </div>
          <button
            className="md:hidden p-2 rounded-md hover:bg-muted"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur">
            <div className="px-5 py-4 flex flex-col gap-3">
              {nav.map((n) => (
                <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="text-sm text-muted-foreground hover:text-foreground">
                  {n.label}
                </a>
              ))}
              <Button asChild size="sm" variant="outline" className="mt-2">
                <Link to="/control-center/login" onClick={() => setOpen(false)}>Control Center Login</Link>
              </Button>
              <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground">
                <a href="#contact" onClick={() => setOpen(false)}>Partner with us</a>
              </Button>
            </div>
          </div>
        )}
      </header>

      <main>
      {/* HERO */}
      <section className="relative pt-28 lg:pt-36 pb-20 overflow-hidden bg-gradient-hero">
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
        <div className="mx-auto max-w-7xl px-5 lg:px-8 grid lg:grid-cols-12 gap-10 items-center relative">
          <div className="lg:col-span-6">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground bg-primary border border-primary px-3 py-1.5 rounded-full shadow-glow">
              <Satellite className="h-3.5 w-3.5" /> Aerospace · Drones · AI
            </span>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.05]">
              Engineering the future of{" "}
              <span
                className="bg-gradient-primary"
                style={{
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  color: "transparent",
                }}
              >
                aerial intelligence
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl">
              AI-powered drone systems, custom UAV engineering, and aerial intelligence solutions for agriculture, infrastructure, mapping, surveillance, and industrial applications.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
                <a href="#solutions">Explore Solutions <ArrowRight className="ml-1 h-4 w-4" /></a>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-border/80 bg-card/40 backdrop-blur hover:bg-card">
                <a href="#contact">Partner With Us</a>
              </Button>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
              {[
              { k: "7", v: "Verticals" },
                { k: "AI", v: "Analytics core" },
                { k: "R&D", v: "Custom UAVs" },
              ].map((s) => (
                <div key={s.v}>
                  <div className="text-2xl font-display font-semibold text-foreground">{s.k}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-6 relative">
            <div className="relative rounded-3xl overflow-hidden shadow-soft border border-border/60">
              <img src={heroImg} alt="TorqWings drone with AI overlays across agriculture, infrastructure and solar terrain" width={1920} height={1080} fetchPriority="high" decoding="async" className="w-full h-auto" />
              <div className="absolute inset-0 bg-gradient-to-tr from-background/60 via-transparent to-transparent" />
            </div>
            <FloatingCard className="absolute -left-4 top-8 hidden sm:block" icon={<Activity className="h-4 w-4 text-accent" />} title="Crop Health" value="NDVI 0.78" tone="agri" />
            <FloatingCard className="absolute -right-4 bottom-10 hidden sm:block" icon={<ShieldCheck className="h-4 w-4 text-primary" />} title="Inspection" value="2 alerts" />
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <Section id="problem" eyebrow="The problem" title="Industries need smarter aerial visibility">
        <p className="text-muted-foreground max-w-3xl">
          Many industries still depend on manual inspection, delayed field reporting, fragmented data collection, and expensive monitoring workflows. From farms to infrastructure sites, decision-makers need faster, safer, and more intelligent aerial insights.
        </p>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { i: <Wrench />, t: "Manual inspections are slow and risky" },
            { i: <Leaf />, t: "Farm and field issues are detected late" },
            { i: <Building2 />, t: "Infrastructure monitoring lacks real-time visibility" },
            { i: <MapIcon />, t: "Mapping and surveying are time-consuming" },
            { i: <Brain />, t: "Drone data is rarely converted into actionable intelligence" },
            { i: <Cog />, t: "Industry-specific drone customization is limited" },
          ].map((c) => (
            <Card key={c.t}>
              <IconBubble>{c.i}</IconBubble>
              <p className="mt-4 font-medium">{c.t}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* SOLUTION */}
      <Section id="solutions" eyebrow="The solution" title="Drones, data, and intelligence in one platform" muted>
        <p className="text-muted-foreground max-w-3xl">
          TorqWings combines aerospace engineering, custom UAV systems, aerial imaging, AI analytics, and domain-specific workflows to convert drone missions into actionable business intelligence.
        </p>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { i: <Plane />, t: "Custom drone systems", d: "Purpose-built UAVs engineered for specific industry missions." },
            { i: <Brain />, t: "AI-powered aerial analytics", d: "Computer vision models that turn imagery into decisions." },
            { i: <Layers />, t: "Industry-specific verticals", d: "Tailored workflows for agriculture, infra, mapping and more." },
            { i: <Compass />, t: "Mission planning & reporting", d: "From flight plan to PDF — operations end-to-end." },
            { i: <GitBranch />, t: "Scalable drone operations", d: "Repeatable processes from a single farm to enterprise fleets." },
            { i: <FlaskConical />, t: "Research & prototyping", d: "Rapid prototyping of payloads and aerospace experiments." },
          ].map((c) => (
            <Card key={c.t}>
              <IconBubble>{c.i}</IconBubble>
              <h3 className="mt-4 text-lg font-semibold">{c.t}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{c.d}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* VERTICALS */}
      <Section id="verticals" eyebrow="Verticals" title="Built for multiple industries">
        <p className="text-muted-foreground max-w-3xl">
          Seven focused service lines, one unified aerospace and AI platform underneath.
        </p>
        <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          <VerticalCard accent="agri" tag="Agriculture" icon={<Sprout className="h-5 w-5" />} title="AgriSky" subtitle="Agriculture Drone Intelligence" desc="Drone-based farm monitoring, crop health analysis, irrigation insights, organic farming advisory, and future precision spraying support." href="#agrisky" />
          <VerticalCard tag="Infrastructure" icon={<Building2 className="h-5 w-5" />} title="InfraSky" subtitle="Infrastructure Inspection" desc="Drone-based inspection for roads, bridges, buildings, telecom towers, solar farms, and industrial assets." />
          <VerticalCard tag="Mapping" icon={<MapIcon className="h-5 w-5" />} title="GeoSky" subtitle="Mapping & Survey Intelligence" desc="Aerial mapping, land survey, site progress monitoring, GIS data capture, and terrain intelligence." />
          <VerticalCard tag="Surveillance" icon={<Eye className="h-5 w-5" />} title="GuardSky" subtitle="Aerial Surveillance & Early Fire Response" desc="Drone-based real-time monitoring, smoke/fire detection support, live aerial visibility, rapid alerts, and targeted first-response payload deployment for farms, industrial sites, campuses, remote facilities, and critical assets." href="#guardsky" />
          <VerticalCard tag="R&D" icon={<FlaskConical className="h-5 w-5" />} title="TorqWings Labs" subtitle="Custom UAV R&D" desc="Custom drone design, payload integration, flight testing, aerospace research, and prototype development for specialized use cases." />
          <VerticalCard tag="Training" icon={<GraduationCap className="h-5 w-5" />} title="TorqWings Academy" subtitle="Drone Pilot Training & Certification Support" desc="Practical drone pilot training, safety procedures, mission planning, agri-drone operations, mapping workflows, and certification support for students, farmers, drone operators, SHGs, FPOs, and professionals." href="#academy" />
          <VerticalCard tag="Engineering" icon={<Cpu className="h-5 w-5" />} title="TorqWings Design Studio" subtitle="Drone Design & Simulation" desc="Design drone architectures from mission requirements, run flight simulations, generate component lists, and get AI-powered design reviews — all in one engineering workspace." href="#design-studio" />
          <div className="rounded-2xl p-6 bg-gradient-primary text-primary-foreground shadow-soft flex flex-col justify-between">
            <div>
              <Rocket className="h-6 w-6" />
              <h3 className="mt-4 text-xl font-display font-semibold">One platform. Many missions.</h3>
              <p className="mt-2 text-sm opacity-90">Every vertical shares the same modular UAV, data, and AI stack — engineered once, deployed everywhere.</p>
            </div>
            <a href="#technology" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium hover:gap-2.5 transition-all">
              See the stack <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </Section>

      {/* FLAGSHIP AGRISKY */}
      <section id="agrisky" className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-agri opacity-[0.08] pointer-events-none" />
        <div className="mx-auto max-w-7xl px-5 lg:px-8 relative">
          <div className="grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent-foreground bg-accent border border-accent px-3 py-1.5 rounded-full shadow-glow">
                <Leaf className="h-3.5 w-3.5" /> Flagship vertical
              </span>
              <h2 className="mt-5 text-3xl sm:text-4xl font-semibold">Flagship vertical: <span className="bg-gradient-agri bg-clip-text text-transparent">AgriSky</span></h2>
              <p className="mt-2 text-lg text-muted-foreground">Agriculture drone intelligence by TorqWings</p>
              <p className="mt-5 text-muted-foreground">
                AgriSky helps farmers and agri-organizations monitor crop health, detect stress early, plan irrigation, and enable precision farming using drone imagery and AI-based farm advisory.
              </p>
              <Button asChild size="lg" className="mt-7 bg-gradient-agri text-primary-foreground hover:opacity-90 shadow-soft">
                <a href="#contact">Explore AgriSky <ArrowRight className="ml-1 h-4 w-4" /></a>
              </Button>
            </div>
            <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
              {[
                { i: <Camera />, t: "Drone-based farm monitoring" },
                { i: <Activity />, t: "Crop health & stress detection" },
                { i: <MapIcon />, t: "Farm zone mapping" },
                { i: <Droplets />, t: "Irrigation & organic input advisory" },
                { i: <FileText />, t: "Farmer-friendly reports" },
                { i: <Sparkles />, t: "Future precision spraying support" },
              ].map((c) => (
                <Card key={c.t}>
                  <IconBubble tone="agri">{c.i}</IconBubble>
                  <p className="mt-4 font-medium">{c.t}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
  </section>

  {/* GUARDSKY */}
  <section id="guardsky" className="relative py-20 sm:py-28 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-primary opacity-[0.06] pointer-events-none" />
    <div className="mx-auto max-w-7xl px-5 lg:px-8 relative">
      <div className="grid lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-5">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground bg-primary border border-primary px-3 py-1.5 rounded-full shadow-glow">
            <Flame className="h-3.5 w-3.5" /> Prototype vertical
          </span>
          <h2 className="mt-5 text-3xl sm:text-4xl font-semibold">GuardSky</h2>
          <p className="mt-2 text-lg text-muted-foreground">Aerial surveillance and early fire response by TorqWings</p>
          <p className="mt-5 text-muted-foreground">
            GuardSky is a prototype drone-based surveillance and emergency-support solution designed to monitor critical areas, detect possible fire or smoke incidents, provide real-time aerial visibility, alert operators, and support rapid intervention through targeted deployment of fire suppression payloads near the incident zone.
          </p>
          <Button asChild size="lg" className="mt-7 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
            <a href="#contact">Explore GuardSky <ArrowRight className="ml-1 h-4 w-4" /></a>
          </Button>
        </div>
        <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
          {[
            { i: <Eye />, t: "Real-time aerial surveillance" },
            { i: <Flame />, t: "Smoke and fire detection support" },
            { i: <Bell />, t: "Live monitoring and alerting" },
            { i: <Zap />, t: "Rapid first-response support" },
            { i: <Package />, t: "Payload deployment prototype" },
            { i: <Radar />, t: "Remote area and asset monitoring" },
          ].map((c) => (
            <Card key={c.t}>
              <IconBubble>{c.i}</IconBubble>
              <p className="mt-4 font-medium">{c.t}</p>
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-16">
        <h3 className="text-xl font-semibold mb-6">Use cases</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { i: <Building2 />, t: "Industrial sites" },
            { i: <Building2 />, t: "Warehouses" },
            { i: <Sun />, t: "Solar farms" },
            { i: <Sprout />, t: "Farms and rural land" },
            { i: <GraduationCap />, t: "Campuses and institutions" },
            { i: <MapIcon />, t: "Remote infrastructure" },
            { i: <Globe2 />, t: "Resorts and retreat properties" },
          ].map((c) => (
            <Card key={c.t} className="text-center items-center flex flex-col">
              <IconBubble>{c.i}</IconBubble>
              <p className="mt-3 text-sm font-medium">{c.t}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  </section>

  {/* DESIGN STUDIO */}
  <section id="design-studio" className="relative py-20 sm:py-28 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-primary opacity-[0.06] pointer-events-none" />
    <div className="mx-auto max-w-7xl px-5 lg:px-8 relative">
      <div className="grid lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-5">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground bg-primary border border-primary px-3 py-1.5 rounded-full shadow-glow">
            <Cpu className="h-3.5 w-3.5" /> Engineering vertical
          </span>
          <h2 className="mt-5 text-3xl sm:text-4xl font-semibold">TorqWings Design Studio</h2>
          <p className="mt-2 text-lg text-muted-foreground">Drone design, simulation, and AI-powered engineering</p>
          <p className="mt-5 text-muted-foreground">
            TorqWings Design Studio is an engineering workspace where teams design drone architectures from mission requirements, run real-time flight simulations, generate component lists, and receive AI-powered design reviews — turning concepts into flyable systems faster.
          </p>
          <Button size="lg" onClick={() => setDemoOpen(true)} className="mt-7 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
            Watch Design Studio Demo <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total Designs", value: 12, tone: "text-sky-600" },
              { label: "Simulations", value: 8, tone: "text-indigo-600" },
              { label: "Safe Designs", value: 9, tone: "text-emerald-600" },
              { label: "Warning", value: 2, tone: "text-amber-600" },
              { label: "Unsafe", value: 1, tone: "text-red-600" },
              { label: "AI Reviews", value: 24, tone: "text-violet-600" },
            ].map((k) => (
              <div key={k.label} className="rounded-xl border border-border/60 bg-card/60 p-4">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k.label}</div>
                <div className={`mt-1 text-xl font-semibold ${k.tone}`}>{k.value}</div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr><th className="text-left font-medium px-4 py-2">Project</th><th className="text-left font-medium px-4 py-2">Vertical</th><th className="text-left font-medium px-4 py-2">Drone Type</th><th className="text-left font-medium px-4 py-2">Risk</th><th className="text-left font-medium px-4 py-2">Status</th></tr>
                </thead>
                <tbody>
                  {[
                    { name: "AgriSpray X1", vertical: "Agriculture", type: "Hexacopter", risk: "Safe", status: "Finalized" },
                    { name: "Solar Scout", vertical: "Infrastructure", type: "Quadcopter", risk: "Safe", status: "Simulated" },
                    { name: "FireWatch Pro", vertical: "Surveillance", type: "Octocopter", risk: "Warning", status: "Designed" },
                    { name: "MapStream 300", vertical: "Mapping", type: "Fixed Wing", risk: "Safe", status: "Finalized" },
                    { name: "CargoLift 50", vertical: "Logistics", type: "Hexacopter", risk: "Unsafe", status: "Draft" },
                  ].map((p, i) => (
                    <tr key={i} className="border-t border-border/60 hover:bg-muted/20">
                      <td className="px-4 py-2 font-medium">{p.name}</td>
                      <td className="px-4 py-2 text-muted-foreground">{p.vertical}</td>
                      <td className="px-4 py-2 text-muted-foreground">{p.type}</td>
                      <td className="px-4 py-2"><span className={`text-[10px] px-2 py-0.5 rounded-full border ${p.risk === "Safe" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : p.risk === "Warning" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-700 border-red-200"}`}>{p.risk}</span></td>
                      <td className="px-4 py-2"><span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/40 border border-border">{p.status}</span></td>
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
        </a>
        .
      </div>
    </DialogContent>
  </Dialog>

  {/* TECHNOLOGY */}
      <Section id="technology" eyebrow="Technology" title="A modular aerial intelligence stack" muted>
        <p className="text-muted-foreground max-w-3xl">
          TorqWings's technology is built as a reusable platform that powers multiple industries — from a single mission to enterprise-grade aerial operations.
        </p>
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { n: "01", i: <Plane />, t: "Drone Mission", d: "Custom UAV or partner drone captures aerial data." },
            { n: "02", i: <Radar />, t: "Data Capture", d: "RGB, thermal, multispectral, LiDAR, or sensor-based data." },
            { n: "03", i: <Brain />, t: "AI Analysis", d: "Vision models detect patterns, risks, defects, stress, and changes." },
            { n: "04", i: <FileText />, t: "Actionable Reports", d: "Dashboards, PDF reports, alerts and recommendations." },
            { n: "05", i: <Zap />, t: "Operational Intelligence", d: "Insights for inspection, advisory, planning and automation." },
          ].map((s, idx) => (
            <div key={s.n} className="relative">
              <Card className="h-full">
                <div className="flex items-center justify-between">
                  <IconBubble>{s.i}</IconBubble>
                  <span className="text-xs font-mono text-muted-foreground">{s.n}</span>
                </div>
                <h3 className="mt-4 text-base font-semibold">{s.t}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.d}</p>
              </Card>
              {idx < 4 && (
                <ArrowRight className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 h-4 w-4 text-primary/60" />
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* PRODUCTS / CAPABILITIES */}
      <Section id="products" eyebrow="Products & capabilities" title="What TorqWings builds">
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { i: <Plane />, t: "Custom UAV Design" },
            { i: <Cpu />, t: "Payload Integration" },
            { i: <Compass />, t: "Drone Mission Planning" },
            { i: <ScanLine />, t: "AI Image Analysis" },
            { i: <MapIcon />, t: "Aerial Mapping" },
            { i: <Sprout />, t: "Crop Intelligence" },
            { i: <Building2 />, t: "Infrastructure Inspection" },
            { i: <Eye />, t: "Surveillance Workflows" },
            { i: <BarChart3 />, t: "Reporting Dashboards" },
            { i: <Cog />, t: "Drone Service Operations" },
          ].map((c) => (
            <Card key={c.t} className="text-center items-center flex flex-col">
              <IconBubble>{c.i}</IconBubble>
              <p className="mt-3 text-sm font-medium">{c.t}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* PILOTS */}
      <Section id="pilots" eyebrow="Pilots" title="Pilot programs and partnerships" muted>
        <p className="text-muted-foreground max-w-3xl">
          TorqWings is building pilot programs with agriculture farms, infrastructure owners, drone operators, academic institutions, FPOs, and industry partners.
        </p>
        <div className="mt-10 grid md:grid-cols-3 gap-5">
          {[
            { tag: "Agriculture", icon: <Sprout className="h-5 w-5" />, tone: "agri" as const, title: "AgriSky Farm Pilot", desc: "Drone imagery and AI-based crop health reports for farms." },
            { tag: "Infrastructure", icon: <Building2 className="h-5 w-5" />, tone: "primary" as const, title: "InfraSky Inspection Pilot", desc: "Drone-based inspection and reporting for infrastructure and industrial assets." },
            { tag: "R&D", icon: <FlaskConical className="h-5 w-5" />, tone: "primary" as const, title: "Custom UAV R&D Pilot", desc: "Prototype development and payload testing for specialized aerospace use cases." },
          ].map((p) => (
            <Card key={p.title}>
              <div className="flex items-center justify-between">
                <IconBubble tone={p.tone}>{p.icon}</IconBubble>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{p.tag}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{p.desc}</p>
              <a href="#contact" className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-2.5 transition-all">
                Apply for pilot <ArrowRight className="h-4 w-4" />
              </a>
            </Card>
          ))}
        </div>
      </Section>

      {/* TEAM */}
      <Section id="team" eyebrow="Team" title="Built by aerospace and software engineering minds">
        <p className="text-muted-foreground max-w-3xl">
          TorqWings brings together aerospace engineers, software engineering, AI, drone systems, and field-domain expertise to build practical aerial intelligence solutions for real-world industries.
        </p>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { i: <Rocket />, t: "Aerospace engineering" },
            { i: <Plane />, t: "UAV design" },
            { i: <Cpu />, t: "Flight systems" },
            { i: <Brain />, t: "AI & software platforms" },
            { i: <Users />, t: "Field pilots" },
            { i: <Globe2 />, t: "Industry partnerships" },
          ].map((c) => (
            <Card key={c.t} className="flex-row items-center gap-4 flex">
              <IconBubble>{c.i}</IconBubble>
              <p className="font-medium">{c.t}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* ACADEMY */}
      <Section id="academy" eyebrow="TorqWings Academy" title="Training the next generation of drone pilots and aerial intelligence professionals">
        <p className="text-muted-foreground max-w-3xl">
          TorqWings Academy provides hands-on drone pilot training and certification support for students, farmers, rural entrepreneurs, SHGs, FPOs, and professionals. The program focuses on safe drone operations, mission planning, field applications, agri-drone workflows, mapping basics, maintenance awareness, and real-world drone service readiness.
        </p>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { i: <Plane />, t: "Drone Pilot Training", d: "Learn drone basics, flight safety, controls, emergency handling, and field operations." },
            { i: <Sprout />, t: "Agri-Drone Operations", d: "Learn drone usage for farm monitoring, crop imaging, spraying workflows, and precision agriculture services." },
            { i: <MapIcon />, t: "Mapping & Survey Training", d: "Learn aerial mapping basics, mission planning, data capture, and reporting workflows." },
            { i: <Wrench />, t: "Drone Maintenance Basics", d: "Understand batteries, propellers, motors, payloads, pre-flight checks, and post-flight maintenance." },
            { i: <CheckCircle2 />, t: "Certification Support", d: "Guidance and preparation support for drone pilot licensing and certification pathways through authorized channels." },
            { i: <Users />, t: "Career & Entrepreneurship Pathway", d: "Support for students, operators, SHGs, FPOs, and rural entrepreneurs to start drone-based service businesses." },
          ].map((c) => (
            <Card key={c.t}>
              <IconBubble>{c.i}</IconBubble>
              <h3 className="mt-4 text-base font-semibold">{c.t}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{c.d}</p>
            </Card>
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
            <a href="#contact">Join Drone Training Program <ArrowRight className="ml-1 h-4 w-4" /></a>
          </Button>
        </div>
      </Section>

      {/* CONTACT */}
      <section id="contact" className="relative py-20 sm:py-28 bg-gradient-hero">
        <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
        <div className="mx-auto max-w-7xl px-5 lg:px-8 relative grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5">
            <span className="text-xs uppercase tracking-[0.2em] text-primary">Get in touch</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-semibold">Partner with TorqWings</h2>
            <p className="mt-4 text-muted-foreground">
              Whether you are a farmer, infrastructure company, drone operator, investor, institution, or industry partner — TorqWings is open to pilots, partnerships, and custom drone intelligence projects.
            </p>
            <ul className="mt-8 space-y-4 text-sm">
              <li className="flex items-center gap-3"><Phone className="h-4 w-4 text-primary" /> Hello : 9940263589</li>
              <li className="flex items-center gap-3"><Mail className="h-4 w-4 text-primary" /> torqwings@gmail.com</li>
              <li className="flex items-center gap-3"><MapPin className="h-4 w-4 text-primary" /> India</li>
            </ul>
          </div>
          <Card className="lg:col-span-7">
            <ContactForm />
          </Card>
        </div>
      </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 py-12 grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 font-display font-semibold text-lg">
              <span className="grid place-items-center h-8 w-8 rounded-lg bg-gradient-primary shadow-glow">
                <Plane className="h-4 w-4 text-primary-foreground" />
              </span>
              TorqWings
            </div>
            <p className="mt-3 text-sm text-muted-foreground max-w-sm">Engineering the future of aerial intelligence.</p>
            <p className="mt-2 text-xs text-muted-foreground">AgriSky is a flagship service vertical of TorqWings.</p>
          </div>
          <div>
            <h4 className="font-display font-semibold text-sm">Explore</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><a href="#home" className="hover:text-foreground">Home</a></li>
              <li><a href="#solutions" className="hover:text-foreground">Solutions</a></li>
              <li><a href="#agrisky" className="hover:text-foreground">AgriSky</a></li>
              <li><a href="#guardsky" className="hover:text-foreground">GuardSky</a></li>
              <li><a href="#design-studio" className="hover:text-foreground">Design Studio</a></li>
              <li><a href="#technology" className="hover:text-foreground">Technology</a></li>
              <li><a href="#pilots" className="hover:text-foreground">Pilot Programs</a></li>
              <li><a href="#academy" className="hover:text-foreground">Academy</a></li>
              <li><a href="/about" className="hover:text-foreground">About</a></li>
              <li><a href="#contact" className="hover:text-foreground">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-semibold text-sm">Contact</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Hello : 9940263589</li>
              <li>torqwings@gmail.com</li>
              <li>India</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border">
          <div className="mx-auto max-w-7xl px-5 lg:px-8 py-6 text-xs text-muted-foreground flex flex-wrap justify-between gap-3">
            <span>© {new Date().getFullYear()} TorqWings. All rights reserved.</span>
            <span>Aerospace · Drones · AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---------- Building blocks ---------- */

function Section({
  id, eyebrow, title, children, muted = false,
}: { id?: string; eyebrow?: string; title: string; children: React.ReactNode; muted?: boolean; }) {
  return (
    <section id={id} className={`py-20 sm:py-28 ${muted ? "bg-muted/30" : ""}`}>
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        {eyebrow && <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground bg-primary px-3 py-1 rounded-md shadow-glow">{eyebrow}</span>}
        <h2 className="mt-3 text-3xl sm:text-4xl font-semibold max-w-3xl">{title}</h2>
        {children}
      </div>
    </section>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl p-6 bg-gradient-card border border-border/60 shadow-card hover:border-primary/40 hover:shadow-soft transition-all ${className}`}>
      {children}
    </div>
  );
}

function IconBubble({ children, tone = "primary" }: { children: React.ReactNode; tone?: "primary" | "agri" }) {
  const cls = tone === "agri"
    ? "bg-accent text-accent-foreground border-accent"
    : "bg-primary text-primary-foreground border-primary";
  return (
    <div className={`inline-grid place-items-center h-10 w-10 rounded-xl border shadow-glow ${cls} [&>svg]:h-5 [&>svg]:w-5`}>
      {children}
    </div>
  );
}

function FloatingCard({
  icon, title, value, className = "", tone = "primary",
}: { icon: React.ReactNode; title: string; value: string; className?: string; tone?: "primary" | "agri" }) {
  return (
    <div className={`rounded-xl bg-card/90 backdrop-blur border border-border shadow-card px-4 py-3 ${className}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{title}</div>
      <div className={`mt-1 text-sm font-semibold ${tone === "agri" ? "text-accent" : "text-primary"}`}>{value}</div>
    </div>
  );
}

function VerticalCard({
  tag, icon, title, subtitle, desc, accent, href,
}: { tag: string; icon: React.ReactNode; title: string; subtitle: string; desc: string; accent?: "agri"; href?: string; }) {
  const isAgri = accent === "agri";
  return (
    <div className={`rounded-2xl p-6 border shadow-card transition-all hover:-translate-y-0.5 ${isAgri ? "bg-gradient-card border-accent/40 hover:shadow-soft" : "bg-gradient-card border-border/60 hover:border-primary/40 hover:shadow-soft"}`}>
      <div className="flex items-center justify-between">
        <IconBubble tone={isAgri ? "agri" : "primary"}>{icon}</IconBubble>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{tag}</span>
      </div>
      <h3 className="mt-5 text-xl font-display font-semibold">{title}</h3>
      <p className={`mt-1 text-sm font-medium ${isAgri ? "text-accent" : "text-primary"}`}>{subtitle}</p>
      <p className="mt-3 text-sm text-muted-foreground">{desc}</p>
      {href && (
        <a href={href} className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:gap-2.5 transition-all">
          Explore {title} <ArrowRight className="h-4 w-4" />
        </a>
      )}
    </div>
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
          toast.success("Thanks! We'll reach out shortly.");
          (e.target as HTMLFormElement).reset();
          setInterest("");
        }, 600);
      }}
      className="grid sm:grid-cols-2 gap-4"
    >
      <Field id="cf-name" label="Name" required><Input id="cf-name" name="name" required placeholder="Your full name" /></Field>
      <Field id="cf-phone" label="Phone" required><Input id="cf-phone" name="phone" required type="tel" placeholder="+91 ..." /></Field>
      <Field id="cf-email" label="Email" required><Input id="cf-email" name="email" required type="email" placeholder="torqwings@gmail.com" /></Field>
      <Field id="cf-org" label="Organization"><Input id="cf-org" name="org" placeholder="Company / FPO / Institution" /></Field>
      <Field id="cf-location" label="Location"><Input id="cf-location" name="location" placeholder="City, State" /></Field>
      <Field id="cf-interest" label="Interested in" required>
        <Select value={interest} onValueChange={setInterest} required>
          <SelectTrigger id="cf-interest" aria-label="Interested in"><SelectValue placeholder="Select an option" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="agrisky">AgriSky — agriculture solution</SelectItem>
            <SelectItem value="infrasky">InfraSky — infrastructure inspection</SelectItem>
            <SelectItem value="geosky">GeoSky — mapping & survey</SelectItem>
            <SelectItem value="guardsky">GuardSky — aerial surveillance &amp; early fire response</SelectItem>
            <SelectItem value="rd">Custom UAV R&D</SelectItem>
            <SelectItem value="academy">TorqWings Academy — drone training</SelectItem>
            <SelectItem value="certification">Drone pilot certification support</SelectItem>
            <SelectItem value="invest">Investment / incubation</SelectItem>
            <SelectItem value="partner">Partnership</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <Field id="cf-message" label="Message"><Textarea id="cf-message" name="message" rows={4} placeholder="Tell us briefly about your interest…" /></Field>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" disabled={submitting} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
          {submitting ? "Submitting…" : "Submit Interest"}
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
        <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-accent" /> We typically respond within 1–2 business days.</p>
      </div>
    </form>
  );
}

function Field({ id, label, required, children }: { id?: string; label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs uppercase tracking-wider text-muted-foreground">{label}{required && " *"}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
