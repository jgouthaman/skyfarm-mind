import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Plane, Mail, Phone, MapPin, Menu, X, ArrowRight,
  ShieldCheck, Handshake, Rocket, GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppFab } from "@/components/whatsapp-fab";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About TorqWings — Built by engineers. Flown for India." },
      { name: "description", content: "TorqWings is a Chennai-based aerospace startup building AI-powered drone systems for Indian agriculture, infrastructure, and defence. Founded by 5 aerospace engineers." },
      { property: "og:title", content: "About TorqWings — Built by engineers. Flown for India." },
      { property: "og:description", content: "Five aerospace engineers building India's drone intelligence platform from Chennai's aerospace corridor." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

const nav = [
  { label: "Home", href: "/#home" },
  { label: "Solutions", href: "/#solutions" },
  { label: "Industries", href: "/#verticals" },
  { label: "Technology", href: "/#technology" },
  { label: "Work with us", href: "/#pilots" },
  { label: "Academy", href: "/#academy" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/#contact" },
];

const SKY = "text-primary";
const EYEBROW = "inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground bg-primary px-3 py-1 rounded-md shadow-glow";

function AboutPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV — identical to landing */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/60">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 h-16 flex items-center justify-between">
          <a href="/#home" className="flex items-center gap-2 font-display font-semibold text-lg">
            <span className="grid place-items-center h-8 w-8 rounded-lg bg-gradient-primary shadow-glow">
              <Plane className="h-4 w-4 text-primary-foreground" />
            </span>
            <span>TorqWings</span>
          </a>
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            {nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className={`hover:text-foreground transition-colors ${n.href === "/about" ? "text-foreground" : ""}`}
              >
                {n.label}
              </a>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-2">
            <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90">
              <a href="/#contact">Partner with us</a>
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
              <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground">
                <a href="/#contact" onClick={() => setOpen(false)}>Partner with us</a>
              </Button>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* 1. HERO */}
        <section className="relative pt-28 lg:pt-36 pb-20 overflow-hidden bg-gradient-hero">
          <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
          <div className="mx-auto max-w-7xl px-5 lg:px-8 grid lg:grid-cols-12 gap-10 items-center relative">
            <div className="lg:col-span-7">
              <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground bg-primary px-3 py-1 rounded-md shadow-glow">
                Our story
              </span>
              <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.05]">
                Built by engineers. Flown for <span className={SKY}>India</span>.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-xl">
                Five aerospace engineers walked out of graduation and asked one question: why is India still inspecting farms, bridges, and borders with human eyes? TorqWings is our answer.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
                  <a href="/#contact">Partner with us <ArrowRight className="ml-1 h-4 w-4" /></a>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-border/80 bg-card/40 backdrop-blur hover:bg-card">
                  <a href="/#verticals">See our solutions</a>
                </Button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-3xl p-6 sm:p-8 bg-gradient-card border border-border/60 shadow-card">
                <div className="grid grid-cols-2 gap-5">
                  {[
                    { k: "5", v: "Aerospace engineers" },
                    { k: "6", v: "Industry verticals" },
                    { k: "₹75K Cr", v: "TN aerospace target by 2032" },
                    { k: "1st", v: "AI drone platform from Chennai" },
                  ].map((s) => (
                    <div key={s.v} className="rounded-2xl bg-background/40 border border-border/60 p-4 hover:-translate-y-[3px] hover:border-primary/40 hover:shadow-soft transition-all">
                      <div className="text-2xl font-display font-semibold text-foreground">{s.k}</div>
                      <div className="text-xs text-muted-foreground mt-1">{s.v}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground bg-primary border border-primary px-3 py-1.5 rounded-full shadow-glow">
                  <MapPin className="h-3.5 w-3.5" /> Chennai, Tamil Nadu · India
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. FOUNDING STORY */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 lg:px-8 grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-6">
              <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground bg-primary px-3 py-1 rounded-md shadow-glow">
                How we started
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-semibold max-w-xl">
                Five engineers. One <span className={SKY}>conviction</span>.
              </h2>
              <div className="mt-6 space-y-5 text-muted-foreground">
                <p>We graduated from aerospace engineering with the same frustration: India had world-class engineering talent but was importing drone intelligence from overseas, or doing without it entirely.</p>
                <p>Chennai gave us the perfect foundation. Surrounded by the Tamil Nadu Defence Industrial Corridor, the AIDAT ecosystem, and the IIT Madras research network, we saw an opportunity to build something that mattered — not just commercially, but nationally.</p>
                <p>TorqWings was registered in Chennai to build AI-powered drone systems that are engineered for Indian agriculture, Indian infrastructure, and Indian defence requirements — not adapted from foreign platforms.</p>
              </div>
              <blockquote className="mt-8 rounded-2xl border-l-4 border-accent bg-gradient-card border border-border/60 p-6 shadow-card">
                <p className="text-lg font-display italic leading-snug">
                  “We didn't want to be consultants to the aerospace industry. We wanted to build the aerospace industry.”
                </p>
                <footer className="mt-3 text-xs uppercase tracking-[0.2em] text-accent">
                  — TorqWings founding team
                </footer>
              </blockquote>
            </div>

            <div className="lg:col-span-6 grid sm:grid-cols-2 gap-4">
              {[
                { i: "🛡️", t: "Tamil Nadu Defence Industrial Corridor", d: "Operating inside India's fastest-growing aerospace and defence manufacturing ecosystem, with direct access to TIDCO, HAL, BEL, and global OEMs." },
                { i: "🤝", t: "AIDAT ecosystem member", d: "Affiliated with the Aerospace Industry Development Association of Tamil Nadu — the state's primary body for aerospace and defence sector development." },
                { i: "🚀", t: "IN-SPACe registered", d: "Registered with India's national space regulator, enabling access to ISRO facilities, government drone frameworks, and the ₹1,000 Cr national aerospace startup fund." },
                { i: "🎓", t: "Chennai engineering pedigree", d: "Our founding team brings aerospace degrees from Chennai's top engineering institutions, combined with hands-on UAV design, CFD simulation, and AI systems experience." },
              ].map((b) => (
                <div
                  key={b.t}
                  className="rounded-2xl p-5 bg-gradient-card border border-border/60 shadow-card hover:-translate-y-[3px] hover:border-primary/40 hover:shadow-soft transition-all"
                >
                  <div className="text-2xl">{b.i}</div>
                  <h3 className="mt-3 font-display font-semibold text-base">{b.t}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{b.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. TIMELINE */}
        <section className="py-20 sm:py-24 bg-muted/30">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground bg-primary px-3 py-1 rounded-md shadow-glow">
              Milestones
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-semibold max-w-3xl">
              From graduation to <span className={SKY}>flight</span>.
            </h2>

            {/* Desktop: horizontal cards */}
            <div className="mt-12 hidden md:block">
              <div className="grid grid-cols-5 gap-4">
                {[
                  { y: "2025", t: "Founded in Chennai by 5 aerospace engineers", active: true },
                  { y: "2025", t: "AIDAT membership & TIDCO registration", active: true },
                  { y: "2025", t: "torqwings.com launched — 6 verticals live", active: true },
                  { y: "2026", t: "AgriSky & InfraSky pilot programs active", active: false },
                  { y: "2026", t: "Seed funding & Sriperumbudur Aero Park presence", active: false },
                ].map((m, idx) => (
                  <div
                    key={idx}
                    className={`rounded-2xl p-5 text-center border shadow-card transition-all hover:-translate-y-[3px] ${
                      m.active
                        ? "bg-gradient-card border-primary/40 hover:border-primary/60"
                        : "bg-card/50 border-border/60 hover:border-primary/40"
                    }`}
                  >
                    <div
                      className={`mx-auto h-4 w-4 rounded-full border-2 ${
                        m.active
                          ? "bg-primary border-primary shadow-glow"
                          : "bg-background border-border"
                      }`}
                    />
                    <div className={`mt-4 text-lg font-display font-bold ${m.active ? "text-primary" : "text-muted-foreground"}`}>
                      {m.y}
                    </div>
                    <p className={`mt-3 text-sm leading-relaxed ${m.active ? "text-foreground" : "text-muted-foreground"}`}>
                      {m.t}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile: vertical cards */}
            <div className="mt-10 md:hidden grid gap-4">
              {[
                { y: "2025", t: "Founded in Chennai by 5 aerospace engineers", active: true },
                { y: "2025", t: "AIDAT membership & TIDCO registration", active: true },
                { y: "2025", t: "torqwings.com launched — 6 verticals live", active: true },
                { y: "2026", t: "AgriSky & InfraSky pilot programs active", active: false },
                { y: "2026", t: "Seed funding & Sriperumbudur Aero Park presence", active: false },
              ].map((m, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl p-5 border shadow-card transition-all ${
                    m.active
                      ? "bg-gradient-card border-primary/40"
                      : "bg-card/50 border-border/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-4 w-4 rounded-full border-2 shrink-0 ${
                        m.active ? "bg-primary border-primary shadow-glow" : "bg-background border-border"
                      }`}
                    />
                    <div className={`text-base font-display font-bold ${m.active ? "text-primary" : "text-muted-foreground"}`}>
                      {m.y}
                    </div>
                  </div>
                  <p className={`mt-2 text-sm ${m.active ? "text-foreground" : "text-muted-foreground"}`}>
                    {m.t}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. MISSION BAND */}
        <section className="py-20 sm:py-28 bg-muted/30">
          <div className="mx-auto max-w-7xl px-5 lg:px-8 grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4">
              <span className={EYEBROW}>Our mission</span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-semibold">
                Engineering the future of aerial intelligence.
              </h2>
            </div>
            <div className="lg:col-span-8 grid sm:grid-cols-2 gap-5">
              {[
                { t: "Make in India, fly for India", d: "Every drone system we build is engineered in Chennai for Indian conditions — our farms, our climate, our regulatory environment." },
                { t: "AI that earns its keep", d: "We only deploy AI when it turns aerial data into a decision that saves time, money, or lives. No dashboards for dashboards' sake." },
                { t: "Open the skies for everyone", d: "Through TorqWings Academy, we train farmers, rural entrepreneurs, SHGs, and FPOs to operate drone-based businesses." },
                { t: "Build India's aerospace future", d: "We're part of Tamil Nadu's ₹75,000 crore aerospace vision — contributing engineering talent, IP, and platforms to India's defence and civil aviation ecosystem." },
              ].map((p) => (
                <div key={p.t} className="rounded-2xl p-5 bg-background/40 border border-border/60 hover:-translate-y-[3px] hover:border-primary/40 transition-all">
                  <div className="flex items-start gap-3">
                    <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-primary shadow-glow shrink-0" />
                    <div>
                      <h3 className="font-display font-semibold text-base">{p.t}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{p.d}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. ECOSYSTEM */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground bg-primary px-3 py-1 rounded-md shadow-glow">
              Our ecosystem
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-semibold max-w-3xl">
              Rooted in Chennai's <span className={SKY}>aerospace corridor</span>
            </h2>
            <p className="mt-5 text-muted-foreground max-w-3xl">
              We didn't build TorqWings in a vacuum. Chennai's aerospace and defence ecosystem gives us infrastructure, networks, and government backing that most startups spend years earning.
            </p>

            <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { pill: "Government", color: "text-primary bg-primary/10 border-primary/30", t: "TIDCO & Sriperumbudur Aero Park", d: "Tamil Nadu's 250-acre aerospace and defence manufacturing park — our gateway to plot allocation, ACDEC design centre access, and SIPCOT infrastructure." },
                { pill: "Industry", color: "text-accent bg-accent/15 border-accent/30", t: "AIDAT membership", d: "The Aerospace Industry Development Association of Tamil Nadu connects us directly to global OEMs, defence PSUs, and Tamil Nadu government aerospace policy." },
                { pill: "Defence", color: "text-primary bg-primary/15 border-primary/40", t: "Tamil Nadu Defence Corridor", d: "A direct pipeline to HAL, BEL, DRDO, and international primes like Airbus, Boeing, and Dassault — all of whom have established presence in Chennai." },
                { pill: "Research", color: "text-accent bg-accent/15 border-accent/30", t: "Chennai engineering network", d: "Founded by alumni of Chennai's top engineering institutions, with ties to the IIT Madras and Anna University research and incubation ecosystems." },
                { pill: "National", color: "text-primary bg-primary/10 border-primary/30", t: "IN-SPACe & national space policy", d: "Registered with India's space regulator. Access to ISRO facilities, the ₹1,000 Cr national space startup fund, and India's 2020 space sector liberalisation framework." },
                { pill: "Funding", color: "text-accent bg-accent/15 border-accent/30", t: "iDEX & DRDO TISED", d: "Actively pursuing defence innovation grants through iDEX (up to ₹1.5 Cr) and DRDO's technology development schemes for aerospace-adjacent R&D." },
              ].map((c) => (
                <div key={c.t} className="rounded-2xl p-6 bg-gradient-card border border-border/60 shadow-card hover:-translate-y-[3px] hover:border-primary/40 hover:shadow-soft transition-all">
                  <span className={`inline-block text-[10px] font-semibold uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border ${c.color}`}>
                    {c.pill}
                  </span>
                  <h3 className="mt-4 text-lg font-display font-semibold">{c.t}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. CTA */}
        <section className="relative py-20 sm:py-28 bg-gradient-hero">
          <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
          <div className="mx-auto max-w-3xl px-5 lg:px-8 relative text-center">
            <h2 className="text-3xl sm:text-4xl font-semibold">
              Ready to fly with <span className={SKY}>TorqWings</span>?
            </h2>
            <p className="mt-5 text-muted-foreground">
              Whether you're a farm owner, infrastructure company, drone operator, investor, or institution — we're open to pilots, partnerships, and custom aerial intelligence projects.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
                <a href="/#contact">Partner with us <ArrowRight className="ml-1 h-4 w-4" /></a>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-border/80 bg-card/40 backdrop-blur hover:bg-card">
                <a href="/#pilots">View pilot programs</a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER — identical to landing */}
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
              <li><a href="/#home" className="hover:text-foreground">Home</a></li>
              <li><a href="/#solutions" className="hover:text-foreground">Solutions</a></li>
              <li><a href="/#agrisky" className="hover:text-foreground">AgriSky</a></li>
              <li><a href="/#guardsky" className="hover:text-foreground">GuardSky</a></li>
              <li><a href="/#design-studio" className="hover:text-foreground">Design Studio</a></li>
              <li><a href="/#technology" className="hover:text-foreground">Technology</a></li>
              <li><a href="/#pilots" className="hover:text-foreground">Pilot Programs</a></li>
              <li><a href="/#academy" className="hover:text-foreground">Academy</a></li>
              <li><a href="/about" className="hover:text-foreground">About</a></li>
              <li><a href="/#contact" className="hover:text-foreground">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-semibold text-sm">Contact</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-primary" /> Hello : 9940263589</li>
              <li className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-primary" /> torqwings@gmail.com</li>
              <li className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-primary" /> Chennai, India</li>
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
      <WhatsAppFab />
    </div>
  );
}
