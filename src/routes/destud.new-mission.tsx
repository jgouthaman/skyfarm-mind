import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useDestudUser, resolveDestudTier, destudDashboardPath } from "@/lib/destud-auth";
import { MissionWizard } from "@/components/design-studio/wizard/MissionWizard";
import { Topbar } from "@/components/destud/Topbar";

export const Route = createFileRoute("/destud/new-mission")({
  component: DestudNewMission,
});

// Runs the same wizard steps as the Mission Hub staff flow
// (mission-hub.torqwings-design-studio.new.tsx), but owned by the DeStud
// user's own id (studio_projects.user_id has no FK tying it to
// mission_hub_users specifically, and RLS on that table is open to anon —
// see MissionWizard's userId doc comment) so it works without a real
// Supabase Auth session, and returns to the correct tier dashboard instead
// of the staff-only design-review route.
function DestudNewMission() {
  const navigate = useNavigate();
  const user = useDestudUser();

  if (!user) return null;

  const resolution = resolveDestudTier(user.plan);
  const tier = resolution.kind === "resolved" ? resolution.tier : "explorer";

  function handleSignOut() {
    sessionStorage.removeItem("destud_user");
    navigate({ to: "/destud" });
  }

  return (
    <div style={{ background: "#0a0f1c", color: "#fff", minHeight: "100vh" }}>
      <Topbar fullName={user.full_name} tier={tier} onSignOut={handleSignOut} />
      <MissionWizard
        userId={user.id}
        stepStorageKey="destud:wizard-step"
        formStorageKey="destud:wizard-form"
        onSubmitted={() => navigate({ to: destudDashboardPath(tier) })}
      />
    </div>
  );
}
