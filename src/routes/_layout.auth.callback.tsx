import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_layout/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        subscription.unsubscribe();
        window.location.href = "/learn/drone-design-fundamentals";
      }
    });

    // Fallback: if no SIGNED_IN event within 10s, go to academy
    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      window.location.href = "/learn";
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
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
