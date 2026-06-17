import { createFileRoute, Outlet } from "@tanstack/react-router";
import { MissionHubAuthProvider } from "@/lib/mission-hub/context";
import { Toaster } from "sonner";

export const Route = createFileRoute("/mission-hub")({
  ssr: false,
  component: MissionHubLayout,
});

function MissionHubLayout() {
  return (
    <MissionHubAuthProvider>
      <Outlet />
      <Toaster theme="dark" position="top-right" richColors />
    </MissionHubAuthProvider>
  );
}
