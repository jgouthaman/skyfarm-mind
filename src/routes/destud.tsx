import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Toaster } from "sonner";

export const Route = createFileRoute("/destud")({
  component: DestudLayout,
});

// No shared chrome here on purpose — mirrors academy.tsx: the sign-in page
// (destud.index.tsx) and the tier dashboards each render their own full-page
// dark theme and shouldn't be wrapped in anything else. Without this
// separate layout file, TanStack Router's flat-file routing would have
// nested destud.dashboard.explorer/engineer as children of the sign-in
// page's own route (since it was previously the sole "destud.tsx"), and
// their content would never render — the sign-in page has no <Outlet/> to
// display it in.
//
// Toaster IS needed here (unlike academy.tsx): MissionWizard's handleSubmit
// (shared with the Mission Hub staff wizard) reports success/failure via
// sonner's toast(), and without a mounted <Toaster/> anywhere under this
// route tree, both toast.success and toast.error calls are silently
// swallowed — clicking "Generate Drone Design" looks like it does nothing,
// whether the save succeeded or failed.
function DestudLayout() {
  return (
    <>
      <Outlet />
      <Toaster theme="dark" position="top-right" richColors />
    </>
  );
}
