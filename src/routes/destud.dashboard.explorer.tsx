import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Plus, Sparkles } from "lucide-react";
import { useDestudSession } from "@/lib/destud-auth";
import { useDestudDesigns, designsThisMonth } from "@/lib/destud-designs";
import { Topbar } from "@/components/destud/Topbar";
import { Meter } from "@/components/destud/Meter";
import { DesignsGrid } from "@/components/destud/DesignsGrid";
import { C, DISPLAY, MONO, SANS } from "@/components/destud/theme";

export const Route = createFileRoute("/destud/dashboard/explorer")({
  component: ExplorerDashboard,
});

const DESIGN_CAP = 5;
// No backend tracking exists yet for AI advisor query usage (no table/column
// records it anywhere in this codebase) — this always reads 0 until that's
// built. Flagged here and in the final task summary rather than fabricated.
const ADVISOR_QUERY_CAP = 3;
const ADVISOR_QUERIES_USED = 0;

function daysUntilMonthEnd(): number {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return Math.max(1, Math.ceil((endOfMonth.getTime() - now.getTime()) / 86400000));
}

function ExplorerDashboard() {
  const navigate = useNavigate();
  const user = useDestudSession("explorer");
  const designs = useDestudDesigns(user?.id ?? "");

  if (!user) return null;

  function handleSignOut() {
    sessionStorage.removeItem("destud_user");
    navigate({ to: "/destud" });
  }

  const usedThisMonth = designs ? designsThisMonth(designs) : 0;

  return (
    <div
      style={{
        background: C.bg, color: C.text, minHeight: "100vh", fontFamily: SANS,
        backgroundImage: `radial-gradient(900px 500px at 78% -8%, rgba(255,176,32,.05), transparent 60%),
          linear-gradient(${C.line}22 1px, transparent 1px), linear-gradient(90deg, ${C.line}22 1px, transparent 1px)`,
        backgroundSize: "auto, 44px 44px, 44px 44px",
      }}
    >
      <Topbar fullName={user.full_name} tier="explorer" onSignOut={handleSignOut} />

      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "clamp(28px,4vw,48px) clamp(20px,4vw,44px)" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ font: `500 11px/1 ${MONO}`, letterSpacing: ".18em", color: C.amber, marginBottom: 12 }}>
              ● MISSION CONTROL
            </div>
            <h1 style={{ font: `700 clamp(26px,4vw,38px)/1.05 ${DISPLAY}`, letterSpacing: "-.02em", color: C.text, margin: 0 }}>
              Welcome back, {user.full_name.split(" ")[0]}.
            </h1>
          </div>
          <button
            onClick={() => navigate({ to: "/destud/new-mission" })}
            style={{
              display: "flex", alignItems: "center", gap: 8, background: C.amber, color: "#0A0A0A",
              border: "none", borderRadius: 9, padding: "11px 18px", font: `600 13px/1 ${SANS}`, cursor: "pointer",
            }}
          >
            <Plus size={16} /> New Mission
          </button>
        </div>

        {/* Upgrade banner */}
        <div
          style={{
            marginTop: 26, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
            flexWrap: "wrap", padding: "16px 20px", borderRadius: 12,
            background: C.amberSoft, border: `1px solid ${C.amber}44`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Sparkles size={18} color={C.amber} />
            <span style={{ font: `500 13px/1.4 ${SANS}`, color: C.text }}>
              Unlock unlimited designs and 50 AI advisor queries a month with <strong>Engineer</strong>.
            </span>
          </div>
          <button
            onClick={() => navigate({ to: "/destud" })}
            style={{
              display: "flex", alignItems: "center", gap: 6, background: "transparent", color: C.amber,
              border: `1px solid ${C.amber}66`, borderRadius: 8, padding: "8px 14px", font: `600 12px/1 ${SANS}`, cursor: "pointer",
            }}
          >
            Upgrade to Engineer <ArrowRight size={14} />
          </button>
        </div>

        {/* Usage meters */}
        <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <Meter label="Designs this month" used={usedThisMonth} cap={DESIGN_CAP} />
          <Meter label="AI advisor queries" used={ADVISOR_QUERIES_USED} cap={ADVISOR_QUERY_CAP} />
        </div>
        <p style={{ font: `500 11px/1 ${MONO}`, color: C.faint, marginTop: 10 }}>
          Resets in {daysUntilMonthEnd()} days
        </p>

        {/* Designs so far */}
        <div style={{ marginTop: 34 }}>
          <div style={{ font: `600 10px/1 ${MONO}`, letterSpacing: ".16em", color: C.faint, marginBottom: 14 }}>
            DESIGNS SO FAR
          </div>
          <DesignsGrid designs={designs} />
        </div>
      </div>
    </div>
  );
}
