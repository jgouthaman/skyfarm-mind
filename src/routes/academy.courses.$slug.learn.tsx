import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plane } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/academy/courses/$slug/learn")({
  component: AcademyLearnPage,
});

const C = {
  bg: "#080B12", panel: "#0E131E",
  line: "#1E2838",
  text: "#E8ECF2", mute: "#8A94A6", faint: "#5C6678",
  amber: "#FFB020", amberSoft: "rgba(255,176,32,0.10)",
};
const DISPLAY = "'Space Grotesk', system-ui, -apple-system, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace";
const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

// TODO: this is a stub for the real module player. It only confirms the
// course resolves from its slug — lesson content, progress tracking, and
// navigation between modules all still need to be built here.
function AcademyLearnPage() {
  const { slug } = Route.useParams();
  const [title, setTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("academy_courses" as any)
        .select("title")
        .eq("slug", slug)
        .maybeSingle();
      if (error) console.error("[Academy] failed to load course:", error);
      setTitle((data as any)?.title ?? null);
      setLoading(false);
    })();
  }, [slug]);

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh", fontFamily: SANS }}>
      <div style={{
        borderBottom: `1px solid ${C.line}`, padding: "14px clamp(20px,4vw,44px)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{ width: 30, height: 30, borderRadius: 7, background: C.amberSoft, border: `1px solid ${C.amber}44`, display: "grid", placeItems: "center" }}>
          <Plane size={15} color={C.amber} />
        </div>
        <span style={{ font: `600 12px/1 ${MONO}`, letterSpacing: ".16em", color: C.text }}>TORQWINGS ACADEMY</span>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "clamp(28px,4vw,48px) clamp(20px,4vw,44px)" }}>
        <div style={{ font: `500 11px/1 ${MONO}`, letterSpacing: ".18em", color: C.amber, marginBottom: 12 }}>● COURSE PLAYER</div>
        {loading ? (
          <p style={{ font: `400 13px/1.5 ${SANS}`, color: C.mute }}>Loading…</p>
        ) : title ? (
          <>
            <h1 style={{ font: `700 clamp(24px,4vw,32px)/1.15 ${DISPLAY}`, letterSpacing: "-.02em", color: C.text, margin: 0 }}>
              {title}
            </h1>
            <p style={{ font: `400 14px/1.6 ${SANS}`, color: C.mute, marginTop: 16, border: `1px solid ${C.line}`, borderRadius: 12, background: C.panel, padding: "16px 18px" }}>
              The module player isn't built yet — this is a placeholder confirming the course resolves correctly.
            </p>
          </>
        ) : (
          <p style={{ font: `400 13px/1.5 ${SANS}`, color: C.mute }}>Course not found.</p>
        )}
      </div>
    </div>
  );
}
