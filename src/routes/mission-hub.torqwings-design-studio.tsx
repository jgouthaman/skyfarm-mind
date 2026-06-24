import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { StudioSidebar } from "@/components/design-studio/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { useCurrentProject } from "@/lib/design-studio/store";
import { Plane, ArrowLeft } from "lucide-react";
import { MissionHubAuthProvider, useMissionHubAuth } from "@/lib/mission-hub/context";
import { toast } from "sonner";

export const Route = createFileRoute("/mission-hub/torqwings-design-studio")({
  ssr: false,
  head: () => ({ meta: [{ title: "TorqWings Design Studio" }] }),
  component: StudioRoot,
});

function StudioRoot() {
  return (
    <MissionHubAuthProvider>
      <Toaster richColors position="top-center" theme="dark" />
      <AccessGate>
        <StudioLayout />
      </AccessGate>
    </MissionHubAuthProvider>
  );
}

function AccessGate({ children }: { children: React.ReactNode }) {
  const { loading, profile, verticals } = useMissionHubAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  const hasAccess = isAdmin || verticals.includes("design-studio" as any);

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      navigate({ to: "/mission-hub/login" });
      return;
    }
    if (!hasAccess) {
      toast.error("You do not have access to the Design Studio.");
      navigate({ to: "/mission-hub/dashboard" });
    }
  }, [loading, profile, hasAccess, navigate]);

  if (loading || !profile || !hasAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-white/50 text-sm">
        Loading Design Studio…
      </div>
    );
  }
  return <>{children}</>;
}

function StudioLayout() {
  const project = useCurrentProject();
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <StudioSidebar />
      <div className="flex-1 min-w-0">
        <header className="h-14 border-b border-border/60 bg-card/40 backdrop-blur sticky top-0 z-30 flex items-center justify-between px-6">
          <div className="flex items-center gap-2 text-sm">
            <Plane className="h-4 w-4 text-primary" />
            <Link to="/mission-hub/design-studio" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Mission Hub
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">Design Studio</span>
            {project && <>
              <span className="text-muted-foreground">/</span>
              <span className="text-primary">{project.projectName}</span>
            </>}
          </div>
          <span className="text-xs text-muted-foreground">torqwings.com</span>
        </header>
        <main className="p-6 lg:p-8 max-w-7xl">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
