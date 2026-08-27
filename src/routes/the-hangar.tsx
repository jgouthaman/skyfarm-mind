import { createFileRoute, Outlet } from "@tanstack/react-router";

// Minimal layout, Outlet only — mirrors destud.tsx's exact reasoning: without
// this, TanStack Router's flat-file routing would nest the-hangar.welcome
// under the-hangar.index's own route instead of as a sibling under /the-hangar.
// Fully isolated from destud.tsx — no shared imports, no shared files.
export const Route = createFileRoute("/the-hangar")({
  component: TheHangarLayout,
});

function TheHangarLayout() {
  return <Outlet />;
}
