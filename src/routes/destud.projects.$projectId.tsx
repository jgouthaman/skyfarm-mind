import { useEffect, useState } from "react";
import { createFileRoute, useParams, useNavigate, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import { useDestudUser, resolveDestudTier, destudDashboardPath } from "@/lib/destud-auth";
import { fetchDestudProject, type DestudProjectDetail } from "@/lib/design-studio/project-service";
import { buildDesignStudioOutput } from "@/lib/intelligence/designStudioBuilder";
import { INITIAL_FORM } from "@/lib/design-studio/wizard-types";
import type { IntelligenceResult } from "@/lib/intelligence/types";
import { DesignStudioOutputView } from "@/components/design-studio/wizard/DesignStudioOutputView";
import { Topbar } from "@/components/destud/Topbar";

export const Route = createFileRoute("/destud/projects/$projectId")({
  component: DestudProjectDetailPage,
});

// Reconstructs just enough of a WizardFormState for buildDesignStudioOutput
// (which only ever reads payloadWeight/requiredFlightTime) from the raw
// requirements jsonb buildInsertPayload() originally stored — see
// fetchDestudProject's doc comment in project-service.ts for exactly which
// column holds what.
function formFromRequirements(requirements: Record<string, unknown> | null) {
  return {
    ...INITIAL_FORM,
    payloadWeight: String(requirements?.payloadWeight ?? ""),
    requiredFlightTime: String(requirements?.requiredFlightTime ?? ""),
  };
}

function DestudProjectDetailPage() {
  const { projectId } = useParams({ from: "/destud/projects/$projectId" });
  const navigate = useNavigate();
  const user = useDestudUser();
  const [project, setProject] = useState<DestudProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchDestudProject(user.id, projectId)
      .then((data) => {
        if (cancelled) return;
        setProject(data);
        setLoading(false);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setError(err?.message ?? "Failed to load this project.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, projectId]);

  if (!user) return null;

  const resolution = resolveDestudTier(user.plan);
  const tier = resolution.kind === "resolved" ? resolution.tier : "explorer";
  const dashboardPath = destudDashboardPath(tier);

  function handleSignOut() {
    sessionStorage.removeItem("destud_user");
    navigate({ to: "/destud" });
  }

  return (
    <div style={{ background: "#0a0f1c", color: "#fff", minHeight: "100vh" }}>
      <Topbar fullName={user.full_name} tier={tier} onSignOut={handleSignOut} />

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <Link
          to={dashboardPath}
          className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>

        {loading && (
          <div
            className="rounded-2xl border p-8 flex flex-col items-center justify-center gap-4 min-h-[280px]"
            style={{ background: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.15)" }}
          >
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#378ADD" }} />
            <p className="text-white/60 text-sm">Loading project…</p>
          </div>
        )}

        {!loading && (error || !project) && (
          <div
            className="rounded-2xl border p-8 flex flex-col items-center justify-center gap-4 min-h-[280px]"
            style={{ background: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.15)" }}
          >
            <div className="grid h-12 w-12 place-items-center rounded-full bg-red-500/15 border border-red-500/30">
              <AlertTriangle className="h-6 w-6 text-red-400" aria-hidden="true" />
            </div>
            <p className="text-white font-medium">
              {error ?? "Project not found"}
            </p>
            <p className="text-sm text-white/40 text-center">
              {error ? "" : "This project doesn't exist, or isn't one of yours."}
            </p>
          </div>
        )}

        {!loading && !error && project && (
          <ProjectContent project={project} />
        )}
      </div>
    </div>
  );
}

function ProjectContent({ project }: { project: DestudProjectDetail }) {
  const designRecommendation = project.design_recommendation;

  return (
    <div className="space-y-6">
      {/* ── Page header — project context ── */}
      <div>
        <h1 className="text-2xl font-semibold text-white mb-1">
          {project.project_name || "Untitled mission"}
        </h1>
        <p className="text-sm text-white/50">
          {project.vertical} · {project.purpose} · {project.status} · Created{" "}
          {new Date(project.created_at).toLocaleDateString()}
        </p>
      </div>

      {!designRecommendation ? (
        <div
          className="rounded-2xl border p-8 flex flex-col items-center justify-center gap-3 min-h-[200px]"
          style={{ background: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.15)" }}
        >
          <p className="text-white/60 text-sm">No design output was saved for this project.</p>
        </div>
      ) : (
        <DesignOutput project={project} designRecommendation={designRecommendation} />
      )}
    </div>
  );
}

function DesignOutput({
  project,
  designRecommendation,
}: {
  project: DestudProjectDetail;
  designRecommendation: NonNullable<DestudProjectDetail["design_recommendation"]>;
}) {
  const { accepted_source: acceptedSource, ...recommendation } = designRecommendation;
  const form = formFromRequirements(project.requirements);
  const output = buildDesignStudioOutput(recommendation as IntelligenceResult, acceptedSource, form);

  if (!output) {
    return (
      <div
        className="rounded-2xl border p-8 flex flex-col items-center justify-center gap-3 min-h-[200px]"
        style={{ background: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.15)" }}
      >
        <div className="grid h-12 w-12 place-items-center rounded-full bg-red-500/15 border border-red-500/30">
          <AlertTriangle className="h-6 w-6 text-red-400" aria-hidden="true" />
        </div>
        <p className="text-white font-medium">No design data available</p>
      </div>
    );
  }

  return <DesignStudioOutputView output={output} />;
}
