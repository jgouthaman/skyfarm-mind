import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/pilot/")({
  beforeLoad: () => { throw redirect({ to: "/field" }); },
  component: () => null,
});
