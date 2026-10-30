import { useState, type MouseEvent, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { HANGAR_PUBLIC_HEAD_LINKS } from "@/styles/hangarPublicTheme";
import { pageSeo } from "@/lib/seo";
import { serviceOptionFor, SERVICE_NOT_SURE, type ServiceCode } from "@/constants/services.constants";
import { ServicesEnquiryForm } from "@/components/ServicesEnquiryForm";

export const Route = createFileRoute("/_layout/services")({
  head: () => {
    const seo = pageSeo({
      path: "/services",
      title: "Services — TorqWings",
      description:
        "Drone noise assessment and reduction, radar signature (RCS) studies and full mission-to-design studies. Our AI agents run the analysis, an engineer reviews it, and you get a report you can act on.",
    });
    return { meta: seo.meta, links: [...seo.links, ...HANGAR_PUBLIC_HEAD_LINKS] };
  },
  component: ServicesPage,
});

// Copy rule for this page: say "vehicle", never "aircraft".

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 40 40" className="hgr-svc-icon" aria-hidden="true">
      {children}
    </svg>
  );
}

const ICONS: Record<ServiceCode, ReactNode> = {
  // Speaker with sound waves.
  S01: (
    <Icon>
      <path {...stroke} d="M6 16 H12 L19 10 V30 L12 24 H6 Z" />
      <path {...stroke} d="M24 15 Q28 20 24 25 M28 11 Q35 20 28 29" />
    </Icon>
  ),
  // Sound wave shrinking to a flat line.
  S02: (
    <Icon>
      <path {...stroke} d="M4 20 Q8 8 12 20 T20 20 Q22 15 24 20 T28 20 H36" />
      <path {...stroke} d="M31 9 V15 M28 12 L31 15 L34 12" />
    </Icon>
  ),
  // Radar sweep.
  S03: (
    <Icon>
      <circle {...stroke} cx="20" cy="20" r="14" />
      <circle {...stroke} cx="20" cy="20" r="8" />
      <path {...stroke} d="M20 20 L30 10" />
      <circle cx="27" cy="25" r="1.8" fill="currentColor" />
    </Icon>
  ),
  // Flying-wing planform under a dashed radar arc.
  S04: (
    <Icon>
      <path {...stroke} d="M20 14 L36 26 L30 28 L25 25 L20 29 L15 25 L10 28 L4 26 Z" />
      <path {...stroke} d="M6 12 Q20 2 34 12" strokeDasharray="2 3" />
    </Icon>
  ),
  // Pipeline: three nodes leading to a vehicle.
  S05: (
    <Icon>
      <circle {...stroke} cx="6" cy="20" r="3" />
      <circle {...stroke} cx="16" cy="20" r="3" />
      <path {...stroke} d="M9 20 H13 M19 20 H23" />
      <path {...stroke} d="M30 12 V28 M23 19 H37 L30 17 Z M26 26 H34" />
    </Icon>
  ),
};

function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" className="hgr-svc-lock" aria-hidden="true">
      <rect {...stroke} x="3" y="7" width="10" height="7" rx="1" />
      <path {...stroke} d="M5.5 7 V5 a2.5 2.5 0 0 1 5 0 V7" />
    </svg>
  );
}

type Service = {
  code: ServiceCode;
  title: string;
  tag: string;
  body: string;
  youGet: string;
  variant: "light" | "flagship" | "restricted";
};

const ROW_1: Service[] = [
  {
    code: "S01",
    title: "Drone Noise Assessment",
    tag: "How loud is it?",
    body: "How loud your drone will be in hover and cruise, and where the noise comes from — before you build it.",
    youGet: "noise levels by distance, source breakdown, report",
    variant: "light",
  },
  {
    code: "S02",
    title: "Noise Reduction Study",
    tag: "Make it quieter",
    body: "We optimise propellers, rotor speed and layout to cut noise while protecting flight time and payload.",
    youGet: "recommended changes, before/after noise, trade-offs",
    variant: "light",
  },
  {
    code: "S05",
    title: "Mission-to-Design Study",
    tag: "The full Hangar pipeline",
    body: "Give us the mission, not a shape. All 15 agents take it from concept through CFD, structures and optimisation.",
    youGet: "a complete, checked design package",
    variant: "flagship",
  },
];

const ROW_2: Service[] = [
  {
    code: "S03",
    title: "Radar Signature (RCS) Assessment",
    tag: "How visible to radar?",
    body: "How visible your vehicle is to radar from every direction, and which features make it stand out.",
    youGet: "RCS by angle, reflection hotspots, report",
    variant: "restricted",
  },
  {
    code: "S04",
    title: "Signature Reduction Design",
    tag: "Harder to detect",
    body: "Shaping and layout changes that cut radar, heat and noise signature, traded against aerodynamics and endurance.",
    youGet: "redesign options, trade-offs, updated design",
    variant: "restricted",
  },
];

function ServiceCard({ s, onPick }: { s: Service; onPick: (e: MouseEvent<HTMLAnchorElement>) => void }) {
  const restricted = s.variant === "restricted";
  return (
    <article className={`hgr-svc-card hgr-svc-card-${s.variant}`}>
      <div className="hgr-svc-card-top">
        {ICONS[s.code]}
        {restricted ? (
          <span className="hgr-svc-code hgr-svc-code-restricted">
            <LockIcon /> Restricted · {s.code}
          </span>
        ) : (
          <span className="hgr-svc-code">{s.code}</span>
        )}
      </div>
      <h2 className="hgr-svc-title">{s.title}</h2>
      <p className="hgr-svc-tag">{s.tag}</p>
      <p className="hgr-svc-body">{s.body}</p>
      <p className="hgr-svc-get">
        <span className="hgr-svc-get-label">You get ·</span> {s.youGet}
      </p>
      <a href="#enquiry" className="hgr-svc-link" onClick={onPick}>
        {restricted ? "Enquire" : "Request a quote"} <span aria-hidden="true">→</span>
      </a>
    </article>
  );
}

const STEPS = ["Brief & quote", "Agents run the analysis", "Bernoulli + engineer review", "Report & walkthrough"];

function ServicesPage() {
  const [service, setService] = useState(SERVICE_NOT_SURE);

  // Card links are real <a href="#enquiry">: pre-select the service, then
  // scroll to the form and move focus to its first field.
  function goToEnquiry(e: MouseEvent<HTMLAnchorElement>, value: string) {
    e.preventDefault();
    setService(value);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("enquiry")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    document.getElementById("enq-name")?.focus({ preventScroll: true });
    history.replaceState(null, "", "#enquiry");
  }

  return (
    <>
      <section className="hgr-svc-head">
        <div className="hgr-pub-wrap hgr-svc-head-row">
          <div>
            <span className="hgr-pub-badge hgr-pub-badge-dark" style={{ marginBottom: 14 }}>Services</span>
            <h1 className="hgr-svc-h1">
              Your design. Our agents. <span className="hgr-svc-amber">A clear answer.</span>
            </h1>
          </div>
          <p className="hgr-svc-intro">
            Send us your design or mission brief. Our AI agents run the analysis, an engineer reviews it, and you
            get a report you can act on.
          </p>
        </div>
      </section>

      <section className="hgr-svc-section" aria-label="Services">
        <div className="hgr-pub-wrap">
          <div className="hgr-svc-grid">
            {[...ROW_1, ...ROW_2].map((s) => (
              <ServiceCard key={s.code} s={s} onPick={(e) => goToEnquiry(e, serviceOptionFor(s.code))} />
            ))}
            <a href="#enquiry" className="hgr-svc-card hgr-svc-cta" onClick={(e) => goToEnquiry(e, SERVICE_NOT_SURE)}>
              <span className="hgr-svc-cta-kicker">Not sure which?</span>
              <span className="hgr-svc-cta-text">Describe your vehicle. We'll recommend the right study.</span>
              <span className="hgr-svc-cta-link">Start an enquiry <span aria-hidden="true">→</span></span>
            </a>
          </div>

          <div className="hgr-svc-strip">
            <span className="hgr-svc-strip-label">How it works</span>
            <ol className="hgr-svc-steps">
              {STEPS.map((step, i) => (
                <li key={step}>
                  <span className="hgr-svc-step-n">{String(i + 1).padStart(2, "0")}</span> {step}
                </li>
              ))}
            </ol>
          </div>
          <p className="hgr-svc-note">
            Results are AI-assisted engineering predictions; each report states its assumptions and confidence.
            Restricted services are offered only to vetted organisations, under NDA.
          </p>
        </div>
      </section>

      <section id="enquiry" className="hgr-svc-section hgr-svc-enquiry">
        <div className="hgr-pub-wrap hgr-svc-enquiry-row">
          <div>
            <h2 className="hgr-pub-h2">Request a study</h2>
            <p className="hgr-pub-sub">
              We reply within 2 working days with a quote. Don't attach design files yet — we'll send a secure link
              after the NDA.
            </p>
            <p className="hgr-pub-sub">
              Or email <a className="hgr-svc-mail" href="mailto:support@torqwings.com">support@torqwings.com</a>
            </p>
          </div>
          <ServicesEnquiryForm service={service} onServiceChange={setService} />
        </div>
      </section>
    </>
  );
}
