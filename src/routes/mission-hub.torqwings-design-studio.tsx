import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { MissionHubShell } from "@/components/mission-hub/Shell";
import { useMissionHubAuth } from "@/lib/mission-hub/context";
import { toast } from "sonner";

export const Route = createFileRoute("/mission-hub/torqwings-design-studio")({
  ssr: false,
  head: () => ({ meta: [{ title: "TorqWings Design Studio" }] }),
  component: StudioRoot,
});

function StudioRoot() {
  return (
    <MissionHubShell title="Design Studio">
      <AccessGate>
        <Outlet />
      </AccessGate>
    </MissionHubShell>
  );
}

function AccessGate({ children }: { children: React.ReactNode }) {
  const { loading, profile, verticals } = useMissionHubAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  const hasAccess = isAdmin || verticals.includes("design-studio" as any);

  useEffect(() => {
    if (loading || !profile) return;
    if (!hasAccess) {
      toast.error("You do not have access to the Design Studio.");
      navigate({ to: "/mission-hub/dashboard" });
    }
  }, [loading, profile, hasAccess, navigate]);

  // Gate on `!profile`, not `loading`: a background auth refresh (token refresh,
  // tab focus) flips `loading` true while the existing profile is still valid.
  // Tearing down `{children}` there would unmount an in-progress wizard/form.
  // Mirrors the same fix in MissionHubShell.
  if (!profile || !hasAccess) return null;
  return <>{children}</>;
}
