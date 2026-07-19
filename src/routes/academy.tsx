import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/academy")({
  component: AcademyLayout,
});

// No shared chrome here on purpose — the academy sign-in/dashboard pages
// render their own full-page dark theme and shouldn't inherit the public
// site's Navbar/Footer from _layout.tsx.
function AcademyLayout() {
  return <Outlet />;
}
