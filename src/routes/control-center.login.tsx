import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plane, Smartphone, ArrowRight, Shield, Lock, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { phoneToEmail, isValidPhone } from "@/lib/phone-email";
import { adminBootstrapAvailable, bootstrapAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/control-center/login")({
  head: () => ({
    meta: [
      { title: "AeroSpawn Control Center — Login" },
      { name: "description", content: "Secure login for AeroSpawn Control Center. Manage drone operations, aerial intelligence, and farm workflows." },
      { property: "og:title", content: "AeroSpawn Control Center — Login" },
      { property: "og:description", content: "Secure login for AeroSpawn Control Center. Manage drone operations, aerial intelligence, and farm workflows." },
      { property: "og:url", content: "/control-center/login" },
    ],
    links: [
      { rel: "canonical", href: "/control-center/login" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const checkBootstrap = useServerFn(adminBootstrapAvailable);
  const runBootstrap = useServerFn(bootstrapAdmin);

  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "setup">("signin");
  const [bootstrapPhone, setBootstrapPhone] = useState("9940263589");
  const [setupAvailable, setSetupAvailable] = useState(false);

  useEffect(() => {
    checkBootstrap()
      .then((r) => {
        setSetupAvailable(r.available);
        setBootstrapPhone(r.bootstrapPhone);
        if (r.available) setMode("setup");
      })
      .catch(() => {});
  }, [checkBootstrap]);

  const handleDigits = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = e.target.value.replace(/\D/g, "");
    if (d.length <= 10) setter(d);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPhone(mobile)) return toast.error("Enter a valid 10-digit mobile number.");
    if (!password) return toast.error("Enter your password.");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(mobile),
      password,
    });
    setLoading(false);
    if (error) return toast.error(error.message || "Invalid mobile number or password.");
    toast.success("Welcome to AeroSpawn Control Center");
    setTimeout(() => navigate({ to: "/control-center" }), 200);
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mobile !== bootstrapPhone) return toast.error(`Setup is only available for ${bootstrapPhone}.`);
    if (password.length < 8) return toast.error("Password must be at least 8 characters.");
    if (password !== confirm) return toast.error("Passwords do not match.");
    setLoading(true);
    try {
      await runBootstrap({ data: { phone: mobile, password, fullName: "Administrator" } });
      // Sign in immediately
      const { error } = await supabase.auth.signInWithPassword({
        email: phoneToEmail(mobile),
        password,
      });
      if (error) throw error;
      toast.success("Admin account ready — signed in.");
      setTimeout(() => navigate({ to: "/control-center" }), 200);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Setup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero relative overflow-hidden">
      <Toaster richColors position="top-center" theme="dark" />
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />

      <header className="relative z-10 mx-auto max-w-7xl px-5 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display font-semibold text-lg">
          <span className="grid place-items-center h-8 w-8 rounded-lg bg-gradient-primary shadow-glow">
            <Plane className="h-4 w-4 text-primary-foreground" />
          </span>
          <span>AeroSpawn</span>
        </Link>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to site</Link>
      </header>

      <main className="relative z-10 mx-auto max-w-md px-5 pt-10 pb-20">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary/90 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full">
            <Shield className="h-3.5 w-3.5" /> Secure access
          </span>
          <h1 className="mt-5 text-3xl sm:text-4xl font-semibold">AeroSpawn Control Center</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {mode === "setup"
              ? `First-time setup for the admin account (${bootstrapPhone}). Choose a strong password.`
              : "Sign in with your mobile number and password."}
          </p>
        </div>

        <form
          onSubmit={mode === "setup" ? handleSetup : handleSignIn}
          className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-6 shadow-card space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile Number</Label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="mobile"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                required
                value={mobile}
                onChange={handleDigits(setMobile)}
                className="pl-9"
                placeholder="9876543210"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9"
                placeholder="••••••••"
              />
            </div>
          </div>

          {mode === "setup" && (
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm Password</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm"
                  type="password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="pl-9"
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
          >
            {loading ? "Please wait…" : mode === "setup" ? "Set password & sign in" : "Sign in"}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>

          {setupAvailable && mode === "signin" && (
            <button type="button" onClick={() => setMode("setup")} className="block w-full text-center text-xs text-primary hover:underline">
              First-time admin setup ({bootstrapPhone})
            </button>
          )}
          {!setupAvailable && mode === "setup" && (
            <button type="button" onClick={() => setMode("signin")} className="block w-full text-center text-xs text-primary hover:underline">
              Back to sign in
            </button>
          )}

          <p className="text-center text-xs text-muted-foreground pt-2">
            Accounts are managed by an admin. Contact your administrator if you need access.
          </p>
        </form>
      </main>
    </div>
  );
}
