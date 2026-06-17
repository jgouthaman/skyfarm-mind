import { useState } from "react";
import { Check, X as XIcon } from "lucide-react";
import { DesignStudioLeadModal, type LeadPlan } from "./design-studio-lead-modal";

type Tier = {
  key: string;
  name: string;
  tagline: string;
  badge: string;
  badgeBg: string;
  badgeText: string;
  monthly: number;
  annual: number; // per-user/month equivalent, except Campus
  annualTotal?: string; // shown under price on annual
  perLabelMonthly: string;
  perLabelAnnual: string;
  isCampus?: boolean;
  featured?: boolean;
  cardBorder?: string;
  included: string[];
  excluded: string[];
  cta: string;
  ctaClass: string;
};

const TIERS: Tier[] = [
  {
    key: "Explorer",
    name: "Explorer",
    tagline: "For students and hobbyists",
    badge: "Free forever",
    badgeBg: "rgba(255,255,255,0.08)",
    badgeText: "rgba(255,255,255,0.7)",
    monthly: 0,
    annual: 0,
    perLabelMonthly: "per user / month",
    perLabelAnnual: "per user / month",
    included: [
      "3 drone designs per month",
      "Basic flight simulation",
      "Standard component list",
      "Community templates",
    ],
    excluded: [
      "AI design review",
      "BOM + component export",
      "PDF report generation",
      "Team collaboration",
      "API access",
    ],
    cta: "Start free",
    ctaClass: "border border-white/30 text-white hover:bg-white/5",
  },
  {
    key: "Engineer",
    name: "Engineer",
    tagline: "For professional drone engineers",
    badge: "Most popular",
    badgeBg: "#185FA5",
    badgeText: "#ffffff",
    monthly: 2999,
    annual: 2399,
    annualTotal: "billed ₹28,788 / year",
    perLabelMonthly: "per user / month",
    perLabelAnnual: "per user / month",
    featured: true,
    cardBorder: "2px solid #378ADD",
    included: [
      "Everything in Explorer",
      "Unlimited drone designs",
      "Full flight simulation",
      "AI-powered design review",
      "BOM + component export",
      "PDF report generation",
      "3 team member seats",
      "Priority email support",
    ],
    excluded: ["White-label reports", "API access", "DRDO compliance pack"],
    cta: "Get early access",
    ctaClass: "bg-[#185FA5] hover:bg-[#378ADD] text-white",
  },
  {
    key: "Squadron",
    name: "Squadron",
    tagline: "For drone companies and defence labs",
    badge: "Enterprise",
    badgeBg: "#EF9F27",
    badgeText: "#0a0f1c",
    monthly: 12999,
    annual: 10399,
    annualTotal: "billed ₹1,24,788 / year",
    perLabelMonthly: "per user / month",
    perLabelAnnual: "per user / month",
    included: [
      "Everything in Engineer",
      "Unlimited team members",
      "White-label PDF reports",
      "API access + webhooks",
      "Custom payload library",
      "DRDO / HAL compliance export",
      "Priority support + SLA",
      "Dedicated onboarding",
    ],
    excluded: [],
    cta: "Request a demo",
    ctaClass: "border border-[#EF9F27] text-[#EF9F27] hover:bg-[#EF9F27]/10",
  },
  {
    key: "Campus",
    name: "Campus",
    tagline: "For engineering colleges and universities",
    badge: "Institutional",
    badgeBg: "rgba(20,184,166,0.18)",
    badgeText: "#5eead4",
    monthly: 4999,
    annual: 49999,
    isCampus: true,
    perLabelMonthly: "per user / month",
    perLabelAnnual: "per institution / year",
    included: [
      "Up to 200 student seats",
      "Faculty admin dashboard",
      "Curriculum integration kit",
      "Assignment and grading tools",
      "Anna University compatible",
      "Co-branded certificates",
      "Career pathway support",
    ],
    excluded: [],
    cta: "Apply for Campus plan",
    ctaClass: "border border-white/30 text-white hover:bg-white/5",
  },
];

function formatPrice(n: number) {
  if (n === 0) return "₹0";
  return "₹" + n.toLocaleString("en-IN");
}

export function DesignStudioPricing() {
  const [annual, setAnnual] = useState(false);
  const [openPlan, setOpenPlan] = useState<LeadPlan | null>(null);

  const openModal = (t: Pick<Tier, "name" | "tagline" | "badge" | "badgeBg" | "badgeText">) =>
    setOpenPlan({
      name: t.name, tagline: t.tagline, badge: t.badge,
      badgeBg: t.badgeBg, badgeText: t.badgeText,
    });

  return (
    <section id="design-studio-pricing" className="relative py-20 sm:py-28 bg-[#0a0f1c]">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#378ADD]">
            Design Studio · Pricing
          </span>
          <h2 className="mt-3 font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-white">
            Choose your engineering plan
          </h2>
          <p className="mt-4 text-base text-white/60">
            Start free. Upgrade as your team grows. Cancel anytime.
          </p>

          <div className="mt-7 flex justify-center">
            <button
              onClick={() =>
                openModal({
                  name: "Waitlist",
                  tagline: "Early access to TorqWings Design Studio",
                  badge: "Waitlist",
                  badgeBg: "rgba(239,159,39,0.15)",
                  badgeText: "#EF9F27",
                })
              }
              className="inline-flex items-center gap-2 rounded-full border border-[#EF9F27] text-[#EF9F27] text-sm px-5 py-2 hover:bg-[#EF9F27]/10 transition-colors"
            >
              Early access open — join the waitlist →
            </button>
          </div>

          {/* Toggle */}
          <div className="mt-6 flex items-center justify-center gap-3 text-sm">
            <span className={annual ? "text-white/50" : "text-white"}>Monthly</span>
            <button
              role="switch"
              aria-checked={annual}
              onClick={() => setAnnual((v) => !v)}
              className="relative h-7 w-12 rounded-full transition-colors"
              style={{ background: annual ? "#185FA5" : "rgba(255,255,255,0.15)" }}
            >
              <span
                className="absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white transition-transform"
                style={{ transform: annual ? "translateX(20px)" : "translateX(0)" }}
              />
            </button>
            <span className={annual ? "text-white" : "text-white/50"}>Annual</span>
            {annual && <span className="text-xs text-[#EF9F27] ml-1">(save 20%)</span>}
          </div>
        </div>

        {/* Cards */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
          {TIERS.map((t) => {
            const showAnnual = annual;
            const price = t.isCampus
              ? showAnnual ? t.annual : t.monthly
              : showAnnual ? t.annual : t.monthly;
            const perLabel = showAnnual ? t.perLabelAnnual : t.perLabelMonthly;
            return (
              <div
                key={t.key}
                className="relative rounded-2xl p-7 bg-[#1a2035] transition-all duration-200 hover:-translate-y-[3px]"
                style={{
                  border: t.cardBorder ?? "1px solid rgba(255,255,255,0.08)",
                }}
                onMouseEnter={(e) => {
                  if (!t.cardBorder) e.currentTarget.style.borderColor = "rgba(55,138,221,0.4)";
                }}
                onMouseLeave={(e) => {
                  if (!t.cardBorder) e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                }}
              >
                {t.featured && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-[0.18em] px-3 py-1 rounded-full"
                    style={{ background: t.badgeBg, color: t.badgeText }}
                  >
                    {t.badge}
                  </span>
                )}
                {!t.featured && (
                  <span
                    className="inline-block text-[10px] font-semibold uppercase tracking-[0.18em] px-2.5 py-1 rounded-md"
                    style={{ background: t.badgeBg, color: t.badgeText }}
                  >
                    {t.badge}
                  </span>
                )}

                <h3 className="mt-4 font-display font-semibold text-xl text-white">{t.name}</h3>
                <p className="mt-1 text-sm text-white/55">{t.tagline}</p>

                <div className="mt-5 flex items-baseline gap-1 transition-all duration-200">
                  <span className="font-display font-bold text-3xl text-white">
                    {formatPrice(price)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-white/45">{perLabel}</p>
                {showAnnual && t.annualTotal && (
                  <p className="mt-1 text-xs text-white/40">{t.annualTotal}</p>
                )}

                <ul className="mt-6 space-y-2.5">
                  {t.included.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-white/80">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#378ADD]" />
                      <span>{f}</span>
                    </li>
                  ))}
                  {t.excluded.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-white/35">
                      <XIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => openModal(t)}
                  className={`mt-7 w-full rounded-lg py-2.5 text-sm font-medium transition-colors ${t.ctaClass}`}
                >
                  {t.cta}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-center text-xs text-white/45">
          🔒 14-day free trial on all paid plans · No credit card required · Data hosted in India
        </p>
      </div>

      <DesignStudioLeadModal
        open={!!openPlan}
        onClose={() => setOpenPlan(null)}
        plan={openPlan}
      />
    </section>
  );
}
