import { createFileRoute, Outlet } from "@tanstack/react-router";

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
function DestudLayout() {
  return <Outlet />;
}
