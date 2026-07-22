import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMissionHubAuth } from "@/lib/mission-hub/context";
import { MissionWizard } from "@/components/design-studio/wizard/MissionWizard";

export const Route = createFileRoute("/mission-hub/torqwings-design-studio/new")({
  component: NewProjectWizard,
  ssr: false,
});

function NewProjectWizard() {
  const { profile } = useMissionHubAuth();
  const nav = useNavigate();

  if (!profile?.id) return null;

  return (
    <MissionWizard
      userId={profile.id}
      allowBaseDesign
      onSubmitted={(projectId) => {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem("torqwings-studio:selected", projectId);
        }
        nav({ to: "/mission-hub/torqwings-design-studio/design" });
      }}
    />
  );
}
