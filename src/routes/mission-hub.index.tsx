import { createFileRoute } from "@tanstack/react-router";
import { MissionHubLoginForm } from "@/components/mission-hub/LoginForm";

export const Route = createFileRoute("/mission-hub/")({
  component: MissionHubLoginForm,
});
