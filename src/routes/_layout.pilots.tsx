// Removed: Work with us page - not relevant to product scope.
// Redirect to /contact if needed.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/pilots")({
  loader: () => {
    throw redirect({ to: "/contact", replace: true });
  },
  component: () => null,
});
