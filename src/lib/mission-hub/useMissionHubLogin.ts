import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMissionHubAuth } from "./context";

type Mode = "signin" | "forgot";

export function useMissionHubLogin() {
  const navigate = useNavigate();
  const { profile, loading, refresh } = useMissionHubAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("signin");
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    document.title = "Mission Hub — Sign in · TorqWings";
  }, []);

  useEffect(() => {
    if (!loading && profile) navigate({ to: "/mission-hub/dashboard" });
  }, [loading, profile, navigate]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setSubmitting(false);
      setErr(error.message.includes("Invalid") ? "Invalid email or password." : error.message);
      return;
    }
    const { data: p } = await supabase
      .from("mission_hub_users")
      .select("id")
      .eq("id", data.user!.id)
      .maybeSingle();
    if (!p) {
      await supabase.auth.signOut();
      setSubmitting(false);
      setErr("Your account is not fully set up. Contact your administrator.");
      return;
    }
    await refresh();
    navigate({ to: "/mission-hub/dashboard" });
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/mission-hub/reset-password`,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setResetSent(true);
  }

  function goToForgot() {
    setMode("forgot");
    setResetEmail(email);
  }

  function goToSignIn() {
    setMode("signin");
    setResetSent(false);
  }

  return {
    email,
    setEmail,
    password,
    setPassword,
    showPwd,
    setShowPwd,
    submitting,
    err,
    mode,
    resetEmail,
    setResetEmail,
    resetSent,
    handleSignIn,
    handleForgot,
    goToForgot,
    goToSignIn,
  };
}
