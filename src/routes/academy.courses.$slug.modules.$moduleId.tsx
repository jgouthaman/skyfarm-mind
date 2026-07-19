import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plane, CheckCircle2 } from "lucide-react";
import type { AcademyUser } from "@/lib/academy-auth";
import { supabase } from "@/integrations/supabase/client";
import { setModuleComplete } from "@/lib/academy-auth";

export const Route = createFileRoute("/academy/courses/$slug/modules/$moduleId")({
  component: AcademyModulePage,
});

const C = {
  bg: "#080B12", panel: "#0E131E",
  line: "#1E2838",
  text: "#E8ECF2", mute: "#8A94A6", faint: "#5C6678",
  amber: "#FFB020", amberSoft: "rgba(255,176,32,0.10)",
  green: "#3DD68C",
};
const DISPLAY = "'Space Grotesk', system-ui, -apple-system, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace";
const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

// TODO: this is a stub for the real module player. It only confirms the
// module resolves and lets a learner toggle completion — lesson content,
// video/quiz rendering, and next/prev module navigation still need building.
function AcademyModulePage() {
  const { moduleId } = Route.useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<AcademyUser | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("academy_user");
    if (!raw) {
      navigate({ to: "/academy/sign-in" });
      return;
    }
    setUser(JSON.parse(raw));
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("academy_course_modules" as any)
        .select("title")
        .eq("id", moduleId)
        .maybeSingle();
      if (error) console.error("[Academy] failed to load module:", error);
      setTitle((data as any)?.title ?? null);
      setLoading(false);
    })();
  }, [moduleId, user]);

  async function toggleComplete() {
    if (!user) return;
    setSaving(true);
    try {
      await setModuleComplete(user.id, moduleId, !completed);
      setCompleted((c) => !c);
    } catch (err) {
      console.error("[Academy] failed to update module completion:", err);
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

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
        <div style={{ font: `500 11px/1 ${MONO}`, letterSpacing: ".18em", color: C.amber, marginBottom: 12 }}>● MODULE PLAYER</div>
        {loading ? (
          <p style={{ font: `400 13px/1.5 ${SANS}`, color: C.mute }}>Loading…</p>
        ) : title ? (
          <>
            <h1 style={{ font: `700 clamp(24px,4vw,32px)/1.15 ${DISPLAY}`, letterSpacing: "-.02em", color: C.text, margin: 0 }}>
              {title}
            </h1>
            <p style={{ font: `400 14px/1.6 ${SANS}`, color: C.mute, marginTop: 16, border: `1px solid ${C.line}`, borderRadius: 12, background: C.panel, padding: "16px 18px" }}>
              The lesson player isn't built yet — this is a placeholder confirming the module resolves correctly.
            </p>
            <button
              onClick={toggleComplete}
              disabled={saving}
              style={{
                marginTop: 20, display: "inline-flex", alignItems: "center", gap: 8,
                background: completed ? "transparent" : C.amber,
                color: completed ? C.green : "#0A0A0A",
                border: completed ? `1px solid ${C.green}66` : "none",
                borderRadius: 8, padding: "10px 16px", font: `600 13px/1 ${SANS}`,
                cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1,
              }}
            >
              {completed && <CheckCircle2 size={15} />}
              {completed ? "Module complete — click to undo" : "Mark module complete"}
            </button>
          </>
        ) : (
          <p style={{ font: `400 13px/1.5 ${SANS}`, color: C.mute }}>Module not found.</p>
        )}
      </div>
    </div>
  );
}
