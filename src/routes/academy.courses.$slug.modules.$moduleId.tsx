import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Lock } from "lucide-react";
import type { AcademyModuleSection, AcademyUser } from "@/lib/academy-auth";
import { getModuleSections } from "@/lib/academy-auth";
import { supabase } from "@/integrations/supabase/client";
import { getCompletedSectionIds } from "@/lib/academy/module-progress";
import { buildModuleGrid, computeSectionStates, type SectionState } from "@/lib/academy/module-grid";
import { ErrorRetry, Skeleton } from "@/components/academy/module-player/SectionPlayers";
import { ModuleTopBar } from "@/components/academy/module-player/ModuleTopBar";
import { C, DISPLAY, MONO, SANS } from "@/components/academy/module-player/theme";

export const Route = createFileRoute("/academy/courses/$slug/modules/$moduleId")({
  component: AcademyModuleGridPage,
});

function GridCell({
  kind, number, state, onOpen, fullWidth,
}: {
  kind: string;
  number: number | null;
  state: SectionState | null;
  onOpen: (state: SectionState) => void;
  fullWidth?: boolean;
}) {
  if (!state) {
    return <div style={{ borderRadius: 12, border: `1px dashed ${C.line}`, minHeight: 56 }} />;
  }

  const { section, isLocked, isComplete, isCurrent } = state;
  const badge = number !== null ? String(number).padStart(2, "0") : "★";
  const borderColor = isLocked ? C.line2 : isComplete ? C.green : C.amber;
  const bg = isLocked ? C.panel : isCurrent ? C.amberSoft : isComplete ? C.greenSoft : C.panel;

  return (
    <button
      type="button"
      onClick={() => onOpen(state)}
      disabled={isLocked}
      title={section.title}
      aria-label={`${kind} ${badge}: ${section.title}${isLocked ? " (locked)" : isComplete ? " (completed)" : ""}`}
      style={{
        display: "flex", alignItems: "center", gap: 10, textAlign: "left", width: "100%",
        border: `1px solid ${borderColor}`, borderRadius: 12, background: bg,
        padding: "12px 14px", minHeight: 56, cursor: isLocked ? "default" : "pointer",
        opacity: isLocked ? 0.55 : 1, gridColumn: fullWidth ? "1 / -1" : undefined,
        boxShadow: isCurrent ? `0 0 0 1px ${C.amber}55` : "none",
      }}
    >
      <span style={{ font: `700 11px/1 ${MONO}`, color: isLocked ? C.faint : isComplete ? C.green : C.amber, flexShrink: 0, minWidth: 18 }}>
        {badge}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: `500 10px/1 ${MONO}`, letterSpacing: ".08em", textTransform: "uppercase", color: C.faint, marginBottom: 2 }}>
          {kind}
        </div>
        <div style={{
          font: `600 13px/1.3 ${SANS}`, color: isLocked ? C.mute : C.text,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {section.title}
        </div>
      </span>
      {isLocked && <Lock size={15} color={C.faint} style={{ flexShrink: 0 }} />}
      {isComplete && <CheckCircle2 size={16} color={C.green} style={{ flexShrink: 0 }} />}
      {!isLocked && !isComplete && <ArrowRight size={15} color={C.amber} style={{ flexShrink: 0 }} />}
    </button>
  );
}

function AcademyModuleGridPage() {
  const { slug, moduleId } = Route.useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState<AcademyUser | null>(null);
  const [moduleTitle, setModuleTitle] = useState<string | null>(null);
  const [sections, setSections] = useState<AcademyModuleSection[] | null>(null);
  const [sectionsError, setSectionsError] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const raw = sessionStorage.getItem("academy_user");
    if (!raw) {
      navigate({ to: "/academy" });
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
      setModuleTitle((data as any)?.title ?? null);
    })();
  }, [moduleId, user]);

  // Re-runs on every mount, which includes returning from a lesson/quiz
  // route — that's what picks up freshly-completed sections.
  const loadSections = useCallback(async () => {
    setSectionsError(false);
    setSections(null);
    try {
      const rows = await getModuleSections(moduleId);
      setSections(rows);
      setCompletedIds(getCompletedSectionIds(moduleId));
    } catch (err) {
      console.error("[Academy] failed to load module sections:", err);
      setSectionsError(true);
    }
  }, [moduleId]);

  useEffect(() => {
    if (!user) return;
    loadSections();
  }, [user, loadSections]);

  const states = useMemo(() => (sections ? computeSectionStates(sections, completedIds) : []), [sections, completedIds]);
  const grid = useMemo(() => buildModuleGrid(states), [states]);

  function openSection(state: SectionState) {
    if (state.isLocked) return;
    const { section } = state;
    if (section.section_type === "content") {
      navigate({
        to: "/academy/module/$moduleId/lesson/$lessonId",
        params: { moduleId, lessonId: section.id },
        search: { slug },
      });
    } else {
      navigate({
        to: "/academy/module/$moduleId/quiz/$quizId",
        params: { moduleId, quizId: section.id },
        search: { slug },
      });
    }
  }

  if (!user) return null;

  return (
    <div style={{
      background: C.bg, color: C.text, minHeight: "100vh", fontFamily: SANS,
      backgroundImage: `radial-gradient(900px 500px at 78% -8%, rgba(255,176,32,.05), transparent 60%),
        linear-gradient(${C.line}22 1px, transparent 1px), linear-gradient(90deg, ${C.line}22 1px, transparent 1px)`,
      backgroundSize: "auto, 44px 44px, 44px 44px",
    }}>
      <ModuleTopBar onBack={() => navigate({ to: "/academy/dashboard" })} backLabel="Back to courses" />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "clamp(28px,4vw,48px) clamp(20px,4vw,44px)" }}>
        {moduleTitle && (
          <h1 style={{ font: `700 clamp(20px,3vw,26px)/1.2 ${DISPLAY}`, color: C.text, margin: "0 0 24px" }}>{moduleTitle}</h1>
        )}

        {sections === null && !sectionsError && <Skeleton label="Loading module…" />}
        {sectionsError && <ErrorRetry message="Couldn't load this module. Try again." onRetry={loadSections} />}

        {sections !== null && sections.length === 0 && (
          <p style={{ font: `400 13px/1.5 ${SANS}`, color: C.mute }}>This module doesn't have any sections yet.</p>
        )}

        {sections !== null && sections.length > 0 && (
          <>
            <div style={{
              display: "flex", alignItems: "center", gap: 6, marginBottom: 18,
              font: `600 10px/1 ${MONO}`, letterSpacing: ".06em", textTransform: "uppercase",
              color: completedIds.size === sections.length ? C.green : C.mute,
            }}>
              {completedIds.size === sections.length && <CheckCircle2 size={12} color={C.green} />}
              {completedIds.size} of {sections.length} sections completed
            </div>

            {grid.rows.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px", marginBottom: 8 }}>
                <div style={{ font: `600 10px/1 ${MONO}`, letterSpacing: ".1em", textTransform: "uppercase", color: C.faint, paddingLeft: 2 }}>
                  Lessons
                </div>
                <div style={{ font: `600 10px/1 ${MONO}`, letterSpacing: ".1em", textTransform: "uppercase", color: C.faint, paddingLeft: 2 }}>
                  Quizzes
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {grid.rows.map((row) => (
                <div key={row.rowIndex} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <GridCell kind="Lesson" number={row.rowIndex + 1} state={row.lesson} onOpen={openSection} />
                  <GridCell kind="Quiz" number={row.rowIndex + 1} state={row.quiz} onOpen={openSection} />
                </div>
              ))}
            </div>

            {grid.finalTest && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                <GridCell kind="Final Assessment" number={null} state={grid.finalTest} onOpen={openSection} fullWidth />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
