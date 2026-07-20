import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Plane, LogOut, Clock, ChevronDown, CheckCircle2 } from "lucide-react";
import type { AcademyCourse, AcademyModule, AcademyUser } from "@/lib/academy-auth";
import { getCourseModules } from "@/lib/academy-auth";

export const Route = createFileRoute("/academy/dashboard")({
  component: AcademyDashboardPage,
});

const C = {
  bg: "#080B12", panel: "#0E131E",
  line: "#1E2838", line2: "#2A3648",
  text: "#E8ECF2", mute: "#8A94A6", faint: "#5C6678",
  amber: "#FFB020", amberSoft: "rgba(255,176,32,0.10)",
  green: "#3DD68C",
};
const DISPLAY = "'Space Grotesk', system-ui, -apple-system, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace";
const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

function formatPrice(price: number | null): string | null {
  if (price == null) return null;
  return `₹${price.toLocaleString("en-IN")}`;
}

function courseProgressLabel(modules: AcademyModule[] | undefined): string | null {
  if (!modules || modules.length === 0) return null;
  const done = modules.filter((m) => m.completed).length;
  if (done === modules.length) return "Completed";
  return `${done} of ${modules.length} modules done`;
}

function CourseCard({
  course, isExpanded, modules, isLoading, onToggle, onStartModule,
}: {
  course: AcademyCourse;
  isExpanded: boolean;
  modules: AcademyModule[] | undefined;
  isLoading: boolean;
  onToggle: () => void;
  onStartModule: (moduleId: string, e: React.MouseEvent) => void;
}) {
  const progressLabel = courseProgressLabel(modules);
  const isComplete = progressLabel === "Completed";

  return (
    <div style={{ border: `1px solid ${isExpanded ? C.line2 : C.line}`, borderRadius: 14, background: C.panel, overflow: "hidden", transition: "border-color .2s" }}>
      <div
        onClick={onToggle}
        style={{ padding: "18px 20px", cursor: "pointer", display: "flex", alignItems: "start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}
      >
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
          {progressLabel && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8,
              font: `600 10px/1 ${MONO}`, letterSpacing: ".06em", textTransform: "uppercase",
              color: isComplete ? C.green : C.mute,
            }}>
              {isComplete && <CheckCircle2 size={12} color={C.green} />}
              {progressLabel}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          <div style={{ textAlign: "right" }}>
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
          <ChevronDown size={18} color={C.mute} style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }} />
        </div>
      </div>

      {isExpanded && (
        <div style={{ padding: "4px 20px 20px", borderTop: `1px solid ${C.line}` }}>
          <div style={{ font: `600 10px/1 ${MONO}`, letterSpacing: ".16em", color: C.faint, margin: "16px 0 4px" }}>
            MODULE MANIFEST
          </div>

          {isLoading ? (
            <p style={{ font: `400 13px/1.5 ${SANS}`, color: C.mute, marginTop: 8 }}>Loading modules…</p>
          ) : !modules || modules.length === 0 ? (
            <p style={{ font: `400 13px/1.5 ${SANS}`, color: C.mute, marginTop: 8 }}>Modules coming soon.</p>
          ) : (
            <div style={{ marginTop: 4 }}>
              {modules.map((m) => (
                <div key={m.id} style={{ display: "flex", alignItems: "start", gap: 13, padding: "10px 0", borderTop: `1px solid ${C.line}` }}>
                  <span style={{ font: `600 11px/1 ${MONO}`, color: C.faint, width: 22, flexShrink: 0, marginTop: 2 }}>
                    {String(m.order_index).padStart(2, "0")}
                  </span>
                  {m.completed && (
                    <CheckCircle2 size={16} color={C.green} style={{ flexShrink: 0, marginTop: 1 }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ font: `500 14px/1.35 ${SANS}`, color: C.text }}>{m.title}</div>
                    {m.description && (
                      <div style={{ font: `400 12px/1.5 ${SANS}`, color: C.mute, marginTop: 2 }}>{m.description}</div>
                    )}
                  </div>
                  <button
                    onClick={(e) => onStartModule(m.id, e)}
                    style={{
                      flexShrink: 0, background: "transparent", color: C.amber,
                      border: `1px solid ${C.amber}44`, borderRadius: 7, padding: "5px 10px",
                      font: `600 11px/1 ${SANS}`, cursor: "pointer",
                    }}
                  >
                    Start
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AcademyDashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AcademyUser | null>(null);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [modulesByCourseId, setModulesByCourseId] = useState<Record<string, AcademyModule[]>>({});
  const [loadingCourseId, setLoadingCourseId] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("academy_user");
    if (!raw) {
      navigate({ to: "/academy" });
      return;
    }
    setUser(JSON.parse(raw));
  }, [navigate]);

  function handleSignOut() {
    sessionStorage.removeItem("academy_user");
    navigate({ to: "/academy" });
  }

  async function handleToggleCourse(courseId: string) {
    if (expandedCourseId === courseId) {
      setExpandedCourseId(null);
      return;
    }
    setExpandedCourseId(courseId);
    if (courseId in modulesByCourseId) return; // already cached, don't refetch
    if (!user) return;

    setLoadingCourseId(courseId);
    try {
      const modules = await getCourseModules(courseId, user.id);
      setModulesByCourseId((m) => ({ ...m, [courseId]: modules }));
    } catch (err) {
      console.error("[Academy] failed to load modules:", err);
      setModulesByCourseId((m) => ({ ...m, [courseId]: [] }));
    } finally {
      setLoadingCourseId(null);
    }
  }

  function handleStartModule(course: AcademyCourse, moduleId: string, e: React.MouseEvent) {
    e.stopPropagation();
    navigate({ to: "/academy/courses/$slug/modules/$moduleId", params: { slug: course.slug, moduleId } });
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
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <button
          onClick={() => navigate({ to: "/" })}
          style={{ background: "transparent", border: "none", color: C.mute, cursor: "pointer", display: "flex", padding: 4 }}
          aria-label="Back to home"
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
            user.courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                isExpanded={expandedCourseId === course.id}
                modules={modulesByCourseId[course.id]}
                isLoading={loadingCourseId === course.id}
                onToggle={() => handleToggleCourse(course.id)}
                onStartModule={(moduleId, e) => handleStartModule(course, moduleId, e)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
