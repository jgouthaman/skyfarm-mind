import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Infinity as InfinityIcon, CalendarClock } from "lucide-react";
import { useDestudSession } from "@/lib/destud-auth";
import { useDestudDesigns } from "@/lib/destud-designs";
import { Topbar } from "@/components/destud/Topbar";
import { Meter } from "@/components/destud/Meter";
import { DesignsGrid } from "@/components/destud/DesignsGrid";
import { C, DISPLAY, MONO, SANS } from "@/components/destud/theme";

export const Route = createFileRoute("/destud/dashboard/engineer")({
  component: EngineerDashboard,
});

// No backend tracking exists yet for AI advisor query usage (no table/column
// records it anywhere in this codebase) — this always reads 0 until that's
// built. Flagged here and in the final task summary rather than fabricated.
const ADVISOR_QUERY_CAP = 50;
const ADVISOR_QUERIES_USED = 0;

function EngineerDashboard() {
  const navigate = useNavigate();
  const user = useDestudSession("engineer");
  const designs = useDestudDesigns(user?.id ?? "");

  if (!user) return null;

  function handleSignOut() {
    sessionStorage.removeItem("destud_user");
    navigate({ to: "/destud" });
  }

  // Derived from the user's own studio_projects rows (real data, not a
  // dedicated activity log — none exists in this codebase yet).
  const recentActivity = (designs ?? [])
    .slice()
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  return (
    <div
      style={{
        background: C.bg, color: C.text, minHeight: "100vh", fontFamily: SANS,
        backgroundImage: `radial-gradient(900px 500px at 78% -8%, rgba(255,176,32,.05), transparent 60%),
          linear-gradient(${C.line}22 1px, transparent 1px), linear-gradient(90deg, ${C.line}22 1px, transparent 1px)`,
        backgroundSize: "auto, 44px 44px, 44px 44px",
      }}
    >
      <Topbar fullName={user.full_name} tier="engineer" onSignOut={handleSignOut} />

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

        {/* License renewal strip — KNOWN GAP: destud_users has no renewal/
            billing-cycle column and no subscriptions table exists anywhere
            in this codebase (confirmed via migration search). There is
            nothing real to source a renewal date from yet, so this is shown
            honestly as "not tracked" rather than a fabricated date. */}
        <div
          style={{
            marginTop: 26, display: "flex", alignItems: "center", gap: 10, padding: "14px 18px",
            borderRadius: 12, background: C.panel, border: `1px solid ${C.line}`,
          }}
        >
          <CalendarClock size={16} color={C.faint} />
          <span style={{ font: `500 13px/1.4 ${SANS}`, color: C.mute }}>
            License renewal — <span style={{ color: C.text }}>not tracked yet</span>
          </span>
        </div>

        {/* Usage: unlimited designs + advisor query meter */}
        <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, background: C.panel, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ font: `500 12px/1.3 ${SANS}`, color: C.mute }}>Platform designs</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, font: `600 13px/1 ${MONO}`, color: C.green }}>
              <InfinityIcon size={14} /> Unlimited
            </span>
          </div>
          <Meter label="AI advisor queries" used={ADVISOR_QUERIES_USED} cap={ADVISOR_QUERY_CAP} />
        </div>

        {/* Recent activity */}
        <div style={{ marginTop: 34 }}>
          <div style={{ font: `600 10px/1 ${MONO}`, letterSpacing: ".16em", color: C.faint, marginBottom: 14 }}>
            RECENT ACTIVITY
          </div>
          {designs === null ? (
            <p style={{ font: `400 13px/1.5 ${SANS}`, color: C.mute }}>Loading…</p>
          ) : recentActivity.length === 0 ? (
            <p style={{ font: `400 13px/1.5 ${SANS}`, color: C.mute }}>No activity yet — start your first mission.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentActivity.map((d) => (
                <div
                  key={d.id}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                    padding: "10px 14px", borderRadius: 9, border: `1px solid ${C.line}`, background: C.panel,
                  }}
                >
                  <span style={{ font: `500 13px/1.4 ${SANS}`, color: C.text }}>
                    Updated <strong>{d.project_name || "Untitled mission"}</strong>
                  </span>
                  <span style={{ font: `500 11px/1 ${MONO}`, color: C.faint, whiteSpace: "nowrap" }}>
                    {new Date(d.updated_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

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
