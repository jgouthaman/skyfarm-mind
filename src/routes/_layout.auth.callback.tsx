import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_layout/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) {
      navigate({ to: "/learn" });
      return;
    }
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) navigate({ to: "/learn" });
      else navigate({ to: "/learn/drone-design-fundamentals" });
    });
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-muted"
        style={{ borderTopColor: "#2a78d6" }}
      />
      <p className="text-sm text-muted-foreground">Signing you in...</p>
    </div>
  );
}
