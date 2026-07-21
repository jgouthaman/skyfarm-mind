import { Cpu, LogOut } from "lucide-react";
import { C, MONO, SANS } from "./theme";
import { PlanBadge } from "./PlanBadge";
import type { DestudTier } from "@/lib/destud-auth";

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function Topbar({
  fullName, tier, onSignOut,
}: { fullName: string; tier: DestudTier; onSignOut: () => void }) {
  return (
    <div
      style={{
        position: "sticky", top: 0, zIndex: 5, background: "rgba(8,11,18,.82)", backdropFilter: "blur(10px)",
        borderBottom: `1px solid ${C.line}`, padding: "14px clamp(20px,4vw,44px)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 7, background: C.amberSoft, border: `1px solid ${C.amber}44`, display: "grid", placeItems: "center" }}>
          <Cpu size={15} color={C.amber} />
        </div>
        <span style={{ font: `600 12px/1 ${MONO}`, letterSpacing: ".16em", color: C.text }}>DESTUD</span>
        <PlanBadge tier={tier} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ font: `500 13px/1 ${SANS}`, color: C.mute }}>Hi, {fullName.split(" ")[0]}</span>
        <div
          style={{
            width: 30, height: 30, borderRadius: "50%", background: C.panel, border: `1px solid ${C.line2}`,
            display: "grid", placeItems: "center", font: `600 11px/1 ${SANS}`, color: C.text,
          }}
        >
          {initials(fullName)}
        </div>
        <button
          onClick={onSignOut}
          style={{
            display: "flex", alignItems: "center", gap: 7, background: "transparent",
            border: `1px solid ${C.line2}`, color: C.mute, borderRadius: 8, padding: "8px 12px",
            font: `500 12px/1 ${SANS}`, cursor: "pointer",
          }}
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </div>
  );
}
