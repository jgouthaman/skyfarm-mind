import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_layout/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          window.location.href = "/learn";
        } else {
          window.location.href = "/learn/drone-design-fundamentals";
        }
      } else {
        window.location.href = "/learn";
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <p>Signing you in...</p>
      </div>
    </div>
  );
}
