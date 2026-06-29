import { useState } from "react";
import { Check, X as XIcon, GraduationCap } from "lucide-react";
import { DesignStudioLeadModal, type LeadPlan } from "./design-studio-lead-modal";

type Feature = {
  text: string;
  badge?: "new" | "flagship";
  note?: string;
  muted?: boolean;
};

type MainTier = {
  key: string;
  name: string;
  tagline: string;
  badgeLabel: string;
  badgeBg: string;
  badgeText: string;
  topPill?: boolean;
  pillLabel?: string;
  cardBorder: string;
  hoverBorder: string;
  monthlyPrice: number;
  annualMonthly: number;
  annualBillingLine: string;
  strikethrough?: number;
  isFree?: boolean;
  included: Feature[];
  excluded: string[];
  cta: string;
  ctaClass: string;
  comingSoon?: boolean;
};

type CampusSubTier = {
  name: string;
  seats: string;
  monthlyPrice: number;
  annualMonthly: number;
  annualBillingLine: string;
};

function InlineBadge({ variant }: { variant: "new" | "flagship" }) {
  if (variant === "new") {
    return (
      <span className="ml-1.5 inline-block align-middle text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#EF9F27]/20 text-[#EF9F27]">
        new
      </span>
    );
  }
  return (
    <span className="ml-1.5 inline-block align-middle text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#185FA5]/25 text-[#378ADD]">
      flagship
    </span>
  );
}

function formatPrice(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

const TIERS: MainTier[] = [
  {
    key: "explorer",
    name: "Explorer",
    tagline: "For students and hobbyists",
    badgeLabel: "Free forever",
    badgeBg: "rgba(255,255,255,0.08)",
    badgeText: "rgba(255,255,255,0.7)",
    cardBorder: "1px solid rgba(255,255,255,0.08)",
    hoverBorder: "rgba(55,138,221,0.4)",
    monthlyPrice: 0,
    annualMonthly: 0,
    annualBillingLine: "",
    isFree: true,
    included: [
      { text: "5 drone designs per month", note: "↑ from 3" },
      { text: "3 AI advisor queries / month" },
      { text: "Basic flight simulation" },
      { text: "Standard component list" },
      { text: "Community templates" },
    ],
    excluded: [
      "BOM + component export",
      "PDF report generation",
      "Team collaboration",
      "API access",
    ],
    cta: "Start free",
    ctaClass: "border border-white/30 text-white hover:bg-white/5",
  },
  {
    key: "engineer",
    name: "Engineer",
    tagline: "For solo professional drone engineers",
    badgeLabel: "Most popular",
    badgeBg: "#185FA5",
    badgeText: "#ffffff",
    topPill: true,
    cardBorder: "2px solid #378ADD",
    hoverBorder: "#378ADD",
    monthlyPrice: 1499,
    annualMonthly: 1199,
    annualBillingLine: "billed ₹14,388 / year",
    included: [
      { text: "Everything in Explorer" },
      { text: "Unlimited drone designs" },
      { text: "50 AI advisor queries / month" },
      { text: "Full flight simulation" },
      { text: "AI-powered design review" },
      { text: "BOM + component export" },
      { text: "PDF report generation" },
      { text: "Priority email support" },
    ],
    excluded: ["Team seats", "White-label reports", "API access", "DRDO compliance pack"],
    cta: "Get early access",
    ctaClass: "bg-[#185FA5] hover:bg-[#378ADD] text-white",
  },
  {
    key: "studio",
    name: "Studio",
    tagline: "For small drone companies and design teams",
    badgeLabel: "New tier ✦",
    badgeBg: "rgba(239,159,39,0.15)",
    badgeText: "#EF9F27",
    topPill: true,
    pillLabel: "Coming Soon",
    cardBorder: "2px solid #22c55e",
    hoverBorder: "#22c55e",
    monthlyPrice: 4999,
    annualMonthly: 3999,
    annualBillingLine: "billed ₹47,988 / year",
    included: [
      { text: "Everything in Engineer" },
      { text: "Up to 10 team seats" },
      { text: "500 AI advisor queries / month", badge: "new" },
      { text: "Shared project workspace", badge: "new" },
      { text: "White-label PDF reports" },
      { text: "API access + webhooks" },
      { text: "Custom payload library" },
      { text: "Dedicated onboarding" },
    ],
    excluded: ["DRDO compliance pack"],
    cta: "Join waitlist",
    ctaClass: "border border-white/30 text-white hover:bg-white/5",
  },
  {
    key: "squadron",
    name: "Squadron",
    tagline: "For drone companies and defence labs",
    badgeLabel: "Enterprise · DRDO",
    badgeBg: "#EF9F27",
    badgeText: "#0a0f1c",
    cardBorder: "1px solid rgba(239,159,39,0.3)",
    hoverBorder: "rgba(239,159,39,0.55)",
    monthlyPrice: 9999,
    annualMonthly: 7999,
    annualBillingLine: "billed ₹95,988 / year",
    strikethrough: 12999,
    included: [
      { text: "Everything in Studio" },
      { text: "Unlimited team members" },
      { text: "2,000 AI advisor queries / month", badge: "flagship" },
      { text: "Overage: ₹1 / extra query", muted: true },
      { text: "DRDO / HAL compliance export", badge: "flagship" },
      { text: "Priority support + SLA" },
      { text: "Custom integrations" },
      { text: "White-glove onboarding" },
    ],
    excluded: [],
    cta: "Join waitlist",
    ctaClass: "border border-[#EF9F27] text-[#EF9F27] hover:bg-[#EF9F27]/10",
    comingSoon: true,
  },
];

const CAMPUS_SUBTIERS: CampusSubTier[] = [
  {
    name: "Starter",
    seats: "Up to 30 student seats",
    monthlyPrice: 4999,
    annualMonthly: 3999,
    annualBillingLine: "₹47,988 / year",
  },
  {
    name: "Department",
    seats: "Up to 100 student seats",
    monthlyPrice: 9999,
    annualMonthly: 7999,
    annualBillingLine: "₹95,988 / year",
  },
  {
    name: "Institution",
    seats: "Up to 500 student seats",
    monthlyPrice: 19999,
    annualMonthly: 15999,
    annualBillingLine: "₹1,91,988 / year",
  },
];

const CAMPUS_FEATURES = [
  "Faculty admin dashboard",
  "Curriculum integration kit",
  "Assignment and grading tools",
  "Anna University compatible",
  "Co-branded certificates",
  "Career pathway support",
  "Full Design Studio access for all seats",
];

function CampusCard({ annual, onCta }: { annual: boolean; onCta: () => void }) {
  return (
    <div
      className="mt-6 rounded-2xl p-7 bg-[#1a2035] transition-all duration-200"
      style={{ border: "1px solid rgba(20,184,166,0.25)" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="shrink-0">
          <span
            className="inline-block text-[10px] font-semibold uppercase tracking-[0.18em] px-2.5 py-1 rounded-md"
            style={{ background: "rgba(20,184,166,0.18)", color: "#5eead4" }}
          >
            Institutional
          </span>
          <h3 className="mt-3 font-display font-semibold text-xl text-white flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-teal-400" aria-hidden="true" />
            Campus
          </h3>
          <p className="mt-1 text-sm text-white/55">For engineering colleges and universities</p>
          <p className="mt-2 max-w-xs text-xs text-teal-400/70">
            Includes all Design Studio modules, faculty controls, and Anna University-compatible curriculum tools.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 flex-1 min-w-0 sm:min-w-[480px]">
          {CAMPUS_SUBTIERS.map((sub) => (
            <div
              key={sub.name}
              className="rounded-xl p-4 bg-[#111827] border border-white/[0.07]"
            >
              <p className="text-xs font-semibold text-teal-400 uppercase tracking-wide">{sub.name}</p>
              <p className="mt-0.5 text-[11px] text-white/40">{sub.seats}</p>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display font-bold text-2xl text-white">
                  {formatPrice(annual ? sub.annualMonthly : sub.monthlyPrice)}
                </span>
                <span className="text-xs text-white/40">/ mo</span>
              </div>
              {annual && (
                <p className="mt-0.5 text-[10px] text-white/35">billed {sub.annualBillingLine}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid sm:grid-cols-[1fr_auto] gap-6 items-end">
        <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
          {CAMPUS_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-white/75">
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-400" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={onCta}
          className="shrink-0 rounded-lg px-8 py-2.5 text-sm font-medium border border-white/30 text-white hover:bg-white/5 transition-colors"
        >
          Apply for Campus plan
        </button>
      </div>
    </div>
  );
}

export function DesignStudioPricing() {
  const [annual, setAnnual] = useState(false);
  const [openPlan, setOpenPlan] = useState<LeadPlan | null>(null);

  const openModal = (plan: LeadPlan) => setOpenPlan(plan);

  return (
    <section id="design-studio-pricing" className="relative py-20 sm:py-28 bg-[#0a0f1c]">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">

        {/* Header */}
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

          {/* Billing toggle */}
          <div className="mt-7 flex items-center justify-center gap-3 text-sm">
            <span className={annual ? "text-white/50" : "text-white font-medium"}>Monthly</span>
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
            <span className={annual ? "text-white font-medium" : "text-white/50"}>Annual</span>
            <span
              className="text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full transition-all duration-200"
              style={{
                background: annual ? "rgba(239,159,39,0.18)" : "rgba(255,255,255,0.06)",
                color: annual ? "#EF9F27" : "rgba(255,255,255,0.28)",
              }}
            >
              Save up to 20%
            </span>
          </div>
        </div>

        {/* 4-column tier grid */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {TIERS.map((t) => {
            const price = annual ? t.annualMonthly : t.monthlyPrice;

            return (
              <div
                key={t.key}
                className="relative rounded-2xl p-7 bg-[#1a2035] transition-all duration-200 hover:-translate-y-[3px]"
                style={{ border: t.cardBorder }}
                onMouseEnter={(e) => {
                  if (!t.topPill) e.currentTarget.style.borderColor = t.hoverBorder;
                }}
                onMouseLeave={(e) => {
                  if (!t.topPill) e.currentTarget.style.border = t.cardBorder;
                }}
              >
                {/* Centred pill — Engineer "Most popular" / Studio "Coming Soon" */}
                {t.topPill && (
                  <span
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.18em] px-3 py-1 rounded-full"
                    style={{ background: t.badgeBg, color: t.badgeText }}
                  >
                    {t.pillLabel ?? t.badgeLabel}
                  </span>
                )}

                {/* Coming Soon pill for non-topPill tiers (Squadron) */}
                {t.comingSoon && !t.topPill && (
                  <span
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.18em] px-3 py-1 rounded-full"
                    style={{ background: "rgba(239,159,39,0.15)", color: "#EF9F27" }}
                  >
                    Coming Soon
                  </span>
                )}

                {/* Inline badge for non-pill tiers */}
                {!t.topPill && (
                  <span
                    className="inline-block text-[10px] font-semibold uppercase tracking-[0.18em] px-2.5 py-1 rounded-md"
                    style={{ background: t.badgeBg, color: t.badgeText }}
                  >
                    {t.badgeLabel}
                  </span>
                )}

                <h3 className="mt-4 font-display font-semibold text-xl text-white">{t.name}</h3>
                <p className="mt-1 text-sm text-white/55">{t.tagline}</p>

                {/* Price */}
                <div className="mt-5">
                  {t.isFree ? (
                    <span className="font-display font-bold text-3xl text-white">Free</span>
                  ) : (
                    <div className="flex items-baseline gap-2">
                      {t.strikethrough && (
                        <span className="text-lg font-medium text-white/30 line-through">
                          {formatPrice(t.strikethrough)}
                        </span>
                      )}
                      <span className="font-display font-bold text-3xl text-white">
                        {formatPrice(price)}
                      </span>
                    </div>
                  )}
                  <p className="mt-1 text-xs text-white/40">per user / month</p>
                  {annual && t.annualBillingLine && (
                    <p className="mt-0.5 text-xs text-white/35">{t.annualBillingLine}</p>
                  )}
                </div>

                {/* Features */}
                <ul className="mt-6 space-y-2.5">
                  {t.included.map((f) => (
                    <li
                      key={f.text}
                      className={`flex items-start gap-2 text-sm ${f.muted ? "text-white/38" : "text-white/80"}`}
                    >
                      <Check
                        className={`mt-0.5 h-4 w-4 flex-shrink-0 ${f.muted ? "text-white/22" : "text-[#378ADD]"}`}
                      />
                      <span>
                        {f.text}
                        {f.badge && <InlineBadge variant={f.badge} />}
                        {f.note && (
                          <span className="ml-1.5 text-[10px] font-semibold text-[#EF9F27]/80">
                            {f.note}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                  {t.excluded.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-white/25">
                      <XIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() =>
                    openModal({
                      name: t.name,
                      tagline: t.tagline,
                      badge: t.badgeLabel,
                      badgeBg: t.badgeBg,
                      badgeText: t.badgeText,
                    })
                  }
                  className={`mt-7 w-full rounded-lg py-2.5 text-sm font-medium transition-colors ${t.ctaClass}`}
                >
                  {t.cta}
                </button>
              </div>
            );
          })}
        </div>

        {/* Campus — full-width card below the 4-column grid */}
        <CampusCard
          annual={annual}
          onCta={() =>
            openModal({
              name: "Campus",
              tagline: "For engineering colleges and universities",
              badge: "Institutional",
              badgeBg: "rgba(20,184,166,0.18)",
              badgeText: "#5eead4",
            })
          }
        />

        <p className="mt-10 text-center text-xs text-white/40">
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
