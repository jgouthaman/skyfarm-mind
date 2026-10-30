import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MissionHubShell, requireAdminGuard } from "@/components/mission-hub/Shell";
import { useMissionHubAuth } from "@/lib/mission-hub/context";
import { RAMAN_CSS } from "./ui";
import { AI_FLAG_CSS, AiFlag } from "./AiFlag";

// Every Ask Raman page: Mission Hub's own shell and login (no new auth),
// the same admin guard as the other admin pages, and Bay 01's look.
export function RamanFrame({ title, children }: { title: string; children: ReactNode }) {
  const { profile, loading } = useMissionHubAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && profile) requireAdminGuard(profile.role, navigate);
  }, [loading, profile, navigate]);

  return (
    <MissionHubShell title={title}>
      <style>{RAMAN_CSS + AI_FLAG_CSS}</style>
      <div className="rmn">{children}</div>
    </MissionHubShell>
  );
}

// Top of the Ask Raman landing page, laid out like Bay 01's hero: hangar
// doors that open on arrival, a status row (bay badge + live AI flag), then
// the agent's name beside a short write-up of what it does.
export function RamanHero({ right }: { right?: ReactNode }) {
  return (
    <header className="rmn-hero -mx-5 -mt-5 px-5 pb-6 pt-8 lg:-mx-8 lg:-mt-8 lg:px-8 lg:pt-10" style={{ borderBottom: "1px solid var(--rmn-blue-line)" }}>
      <div className="rmn-doors" aria-hidden="true">
        <div className="rmn-door rmn-door-left" />
        <div className="rmn-door rmn-door-right" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rmn-badge">Bay 16 · Upcoming Agents</span>
          <AiFlag />
        </div>
        {right}
      </div>
      <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:gap-12">
        <div className="flex-shrink-0">
          <div className="rmn-mono mb-3 text-xs uppercase tracking-[0.14em]" style={{ color: "var(--rmn-accent)" }}>
            UAV noise intelligence · beta
          </div>
          <h1 className="m-0 text-[34px] leading-tight md:text-[52px]" style={{ color: "var(--rmn-ink)" }}>Ask Raman</h1>
        </div>
        <p className="m-0 max-w-[520px] flex-1 text-[15.5px] leading-relaxed" style={{ color: "var(--rmn-dim)" }}>
          Named after Sir C. V. Raman, Raman answers one question about a multirotor:{" "}
          <b style={{ color: "var(--rmn-on-navy)", fontWeight: 600 }}>how loud is it, and why?</b> From six inputs taken on a
          call, the <b style={{ color: "var(--rmn-on-navy)", fontWeight: 600 }}>Noise Check</b> predicts hover and cruise
          levels at set distances, splits the sound by source and checks it against a target.{" "}
          <b style={{ color: "var(--rmn-on-navy)", fontWeight: 600 }}>Noise Fix</b> then lets the agent try design changes —
          propeller size, blades, RPM, spacing — until the vehicle meets the target, ending in a before-and-after report and
          certificate. Every number comes from a deterministic acoustic engine, accurate to about ±5 dB.
        </p>
      </div>
    </header>
  );
}

// Compact header for the inner pages (workspace, propeller DB, verify).
export function RamanBrand({ children }: { children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-xl font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--rmn-ink)" }}>
        Ask Raman
      </span>
      <span className="rmn-badge">Bay 16</span>
      <AiFlag />
      {children}
    </div>
  );
}
