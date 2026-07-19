import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plane, LogOut, Clock } from "lucide-react";
import type { AcademyCourse, AcademyUser } from "@/lib/academy-auth";

export const Route = createFileRoute("/_layout/academy/dashboard")({
  component: AcademyDashboardPage,
});

const C = {
  bg: "#080B12", panel: "#0E131E",
  line: "#1E2838", line2: "#2A3648",
  text: "#E8ECF2", mute: "#8A94A6", faint: "#5C6678",
  amber: "#FFB020", amberSoft: "rgba(255,176,32,0.10)",
};
const DISPLAY = "'Space Grotesk', system-ui, -apple-system, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace";
const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

function formatPrice(price: number | null): string | null {
  if (price == null) return null;
  return `₹${price.toLocaleString("en-IN")}`;
}

function CourseCard({ course }: { course: AcademyCourse }) {
  return (
    <div
      // TODO: onClick handler goes here — open the module manifest for this
      // course (course.slug) once module-level tracking exists.
      style={{ border: `1px solid ${C.line}`, borderRadius: 14, background: C.panel, padding: "18px 20px" }}
    >
      <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          {course.level && (
            <span style={{
              font: `600 10px/1 ${MONO}`, letterSpacing: ".08em", textTransform: "uppercase",
              color: C.amber, background: `${C.amber}1A`, border: `1px solid ${C.amber}33`,
              padding: "5px 8px", borderRadius: 5,
            }}>
              {course.level}
            </span>
          )}
          <div style={{ font: `600 16px/1.3 ${DISPLAY}`, color: C.text, marginTop: 9 }}>{course.title}</div>
          <div style={{ font: `500 11px/1 ${MONO}`, color: C.faint, marginTop: 4 }}>{course.slug}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {course.price != null && (
            <div style={{ font: `700 16px/1 ${DISPLAY}`, color: C.text }}>{formatPrice(course.price)}</div>
          )}
          {course.hours != null && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 6 }}>
              <Clock size={12} color={C.faint} />
              <span style={{ font: `500 11px/1 ${SANS}`, color: C.mute }}>{course.hours} hrs</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AcademyDashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AcademyUser | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("academy_user");
    if (!raw) {
      navigate({ to: "/academy/sign-in" });
      return;
    }
    setUser(JSON.parse(raw));
  }, [navigate]);

  function handleSignOut() {
    sessionStorage.removeItem("academy_user");
    navigate({ to: "/academy/sign-in" });
  }

  if (!user) return null;

  const firstName = user.full_name.split(" ")[0];

  return (
    <div
      style={{
        background: C.bg, color: C.text, minHeight: "100vh", fontFamily: SANS,
        backgroundImage: `radial-gradient(900px 500px at 78% -8%, rgba(255,176,32,.05), transparent 60%),
          linear-gradient(${C.line}22 1px, transparent 1px), linear-gradient(90deg, ${C.line}22 1px, transparent 1px)`,
        backgroundSize: "auto, 44px 44px, 44px 44px",
      }}
    >
      {/* top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 5, background: "rgba(8,11,18,.82)", backdropFilter: "blur(10px)",
        borderBottom: `1px solid ${C.line}`, padding: "14px clamp(20px,4vw,44px)",
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: C.amberSoft, border: `1px solid ${C.amber}44`, display: "grid", placeItems: "center" }}>
            <Plane size={15} color={C.amber} />
          </div>
          <span style={{ font: `600 12px/1 ${MONO}`, letterSpacing: ".16em", color: C.text }}>TORQWINGS ACADEMY</span>
        </div>
      </div>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "clamp(28px,4vw,48px) clamp(20px,4vw,44px)" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ font: `500 11px/1 ${MONO}`, letterSpacing: ".18em", color: C.amber, marginBottom: 12 }}>● MISSION CONTROL</div>
            <h1 style={{ font: `700 clamp(26px,4vw,38px)/1.05 ${DISPLAY}`, letterSpacing: "-.02em", color: C.text, margin: 0 }}>
              Welcome back, {firstName}.
            </h1>
          </div>
          <button
            onClick={handleSignOut}
            style={{
              display: "flex", alignItems: "center", gap: 7, background: "transparent",
              border: `1px solid ${C.line2}`, color: C.mute, borderRadius: 8, padding: "8px 12px",
              font: `500 12px/1 ${SANS}`, cursor: "pointer",
            }}
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>

        <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 12 }}>
          {user.courses.length === 0 ? (
            <p style={{ font: `400 13px/1.5 ${SANS}`, color: C.mute }}>
              You're not enrolled in any courses yet.
            </p>
          ) : (
            user.courses.map((course) => <CourseCard key={course.id} course={course} />)
          )}
        </div>
      </div>
    </div>
  );
}
