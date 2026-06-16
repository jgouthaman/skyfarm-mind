import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { StudioSidebar } from "@/components/design-studio/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { useCurrentProject } from "@/lib/design-studio/store";
import { Plane } from "lucide-react";

export const Route = createFileRoute("/control-center/aerospawn-design-studio")({
  head: () => ({ meta: [{ title: "TorqWings Design Studio" }] }),
  component: StudioLayout,
});

function StudioLayout() {
  const project = useCurrentProject();
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Toaster richColors position="top-center" theme="dark" />
      <StudioSidebar />
      <div className="flex-1 min-w-0">
        <header className="h-14 border-b border-border/60 bg-card/40 backdrop-blur sticky top-0 z-30 flex items-center justify-between px-6">
          <div className="flex items-center gap-2 text-sm">
            <Plane className="h-4 w-4 text-primary" />
            <Link to="/control-center" className="text-muted-foreground hover:text-foreground">TorqWings Control Center</Link>
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
