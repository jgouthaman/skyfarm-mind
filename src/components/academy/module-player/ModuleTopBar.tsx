import type { ReactNode } from "react";
import { ArrowLeft, Plane } from "lucide-react";
import { C, MONO } from "./theme";

// Sticky brand header shared by the grid page and the lesson/quiz routes,
// with an optional breadcrumb row underneath (e.g. "← Back to module").
export function ModuleTopBar({
  onBack, backLabel = "Back", children,
}: {
  onBack: () => void;
  backLabel?: string;
  children?: ReactNode;
}) {
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 5, background: "rgba(8,11,18,.92)", backdropFilter: "blur(10px)",
      borderBottom: `1px solid ${C.line}`,
    }}>
      <div style={{ padding: "14px clamp(20px,4vw,44px)", display: "flex", alignItems: "center", gap: 14 }}>
        <button
          onClick={onBack}
          style={{ background: "transparent", border: "none", color: C.mute, cursor: "pointer", display: "flex", padding: 4 }}
          aria-label={backLabel}
        >
          <ArrowLeft size={18} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: C.amberSoft, border: `1px solid ${C.amber}44`, display: "grid", placeItems: "center" }}>
            <Plane size={15} color={C.amber} />
          </div>
          <span style={{ font: `600 12px/1 ${MONO}`, letterSpacing: ".16em", color: C.text }}>TORQWINGS ACADEMY</span>
        </div>
      </div>
      {children}
    </div>
  );
}
