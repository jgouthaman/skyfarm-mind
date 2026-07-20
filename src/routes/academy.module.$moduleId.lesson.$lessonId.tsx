import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { AcademyModuleSection, AcademyUser } from "@/lib/academy-auth";
import { getModuleSections, getCourseSlugForModule } from "@/lib/academy-auth";
import { getCompletedSectionIds, markSectionComplete } from "@/lib/academy/module-progress";
import { computeSectionStates, nextContentLabel } from "@/lib/academy/module-grid";
import {
  ContentSection, AuthoredContentSection, ErrorRetry, Skeleton, LockedSection, getAuthoredLessonForSection,
} from "@/components/academy/module-player/SectionPlayers";
import { PlayerStyles } from "@/components/academy/module-player/PlayerStyles";
import { ModuleTopBar } from "@/components/academy/module-player/ModuleTopBar";
import { C, MONO, SANS } from "@/components/academy/module-player/theme";

export const Route = createFileRoute("/academy/module/$moduleId/lesson/$lessonId")({
  component: AcademyLessonPage,
  validateSearch: (search: Record<string, unknown>) => ({
    slug: typeof search.slug === "string" ? search.slug : undefined,
  }),
});

function AcademyLessonPage() {
  const { moduleId, lessonId } = Route.useParams();
  const { slug: searchSlug } = Route.useSearch();
  const navigate = useNavigate();

  const [user, setUser] = useState<AcademyUser | null>(null);
  const [sections, setSections] = useState<AcademyModuleSection[] | null>(null);
  const [sectionsError, setSectionsError] = useState(false);
  const [slug, setSlug] = useState<string | null>(searchSlug ?? null);

  useEffect(() => {
    const raw = sessionStorage.getItem("academy_user");
    if (!raw) {
      navigate({ to: "/academy" });
      return;
    }
    setUser(JSON.parse(raw));
  }, [navigate]);

  const loadSections = useCallback(async () => {
    setSectionsError(false);
    setSections(null);
    try {
      const rows = await getModuleSections(moduleId);
      setSections(rows);
    } catch (err) {
      console.error("[Academy] failed to load module sections:", err);
      setSectionsError(true);
    }
  }, [moduleId]);

  useEffect(() => {
    if (!user) return;
    loadSections();
  }, [user, loadSections]);

  // Direct link without a carried-over slug (e.g. a bookmark) — look it up
  // once so "Back to module" still resolves to the right course.
  useEffect(() => {
    if (slug || searchSlug) return;
    getCourseSlugForModule(moduleId)
      .then((s) => setSlug(s))
      .catch((err) => console.error("[Academy] failed to resolve course slug:", err));
  }, [moduleId, slug, searchSlug]);

  function backToModule() {
    if (slug) navigate({ to: "/academy/courses/$slug/modules/$moduleId", params: { slug, moduleId } });
    else navigate({ to: "/academy/dashboard" });
  }

  const states = useMemo(() => (sections ? computeSectionStates(sections, getCompletedSectionIds(moduleId)) : []), [sections, moduleId]);
  const target = states.find((s) => s.section.id === lessonId) ?? null;
  const lessonStates = states.filter((s) => s.section.section_type === "content");
  const lessonNumber = lessonStates.findIndex((s) => s.section.id === lessonId) + 1;

  function handleComplete() {
    markSectionComplete(moduleId, lessonId);
    backToModule();
  }

  if (!user) return null;

  return (
    <div style={{
      background: C.bg, color: C.text, minHeight: "100vh", fontFamily: SANS,
      backgroundImage: `radial-gradient(900px 500px at 78% -8%, rgba(255,176,32,.05), transparent 60%),
        linear-gradient(${C.line}22 1px, transparent 1px), linear-gradient(90deg, ${C.line}22 1px, transparent 1px)`,
      backgroundSize: "auto, 44px 44px, 44px 44px",
    }}>
      <PlayerStyles />

      <ModuleTopBar onBack={backToModule} backLabel="Back to module">
        <div style={{ padding: "0 clamp(20px,4vw,44px) 12px" }}>
          <button
            onClick={backToModule}
            style={{
              display: "flex", alignItems: "center", gap: 4, background: "transparent", border: "none",
              color: C.faint, font: `600 11px/1 ${MONO}`, letterSpacing: ".04em", cursor: "pointer", padding: 0,
            }}
          >
            <ChevronLeft size={13} /> Back to module
          </button>
        </div>
      </ModuleTopBar>

      <div style={{ maxWidth: 1340, margin: "0 auto", padding: "clamp(28px,4vw,48px) clamp(20px,4vw,44px)" }}>
        {sections === null && !sectionsError && <Skeleton label="Loading lesson…" />}
        {sectionsError && <ErrorRetry message="Couldn't load this lesson. Try again." onRetry={loadSections} />}

        {sections !== null && !sectionsError && !target && (
          <p style={{ font: `400 13px/1.5 ${SANS}`, color: C.mute }}>This lesson couldn't be found.</p>
        )}

        {target && target.isLocked && <LockedSection title={target.section.title} />}

        {target && !target.isLocked && (() => {
          const authoredLesson = getAuthoredLessonForSection(target.section.title);
          const label = nextContentLabel(sections!, target.index);
          return authoredLesson ? (
            <AuthoredContentSection
              lesson={authoredLesson}
              sectionNumber={lessonNumber}
              totalSections={lessonStates.length}
              sectionTitle={target.section.title}
              isActive={!target.isComplete}
              nextLabel={label}
              onComplete={handleComplete}
            />
          ) : (
            <ContentSection
              section={target.section}
              sectionNumber={lessonNumber}
              totalSections={lessonStates.length}
              isActive={!target.isComplete}
              nextLabel={label}
              onComplete={handleComplete}
            />
          );
        })()}
      </div>
    </div>
  );
}
