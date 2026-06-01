import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Plane, Mail, Lock, ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/control-center/login")({
  head: () => ({
    meta: [
      { title: "AtomSky Control Center — Login" },
      { name: "description", content: "Secure access for drone operations and aerial intelligence." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("operator@atomsky.in");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Welcome to AtomSky Control Center");
    setTimeout(() => navigate({ to: "/control-center" }), 300);
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
          <span>AtomSky</span>
        </Link>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to site</Link>
      </header>

      <main className="relative z-10 mx-auto max-w-md px-5 pt-10 pb-20">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary/90 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full">
            <Shield className="h-3.5 w-3.5" /> Secure access
          </span>
          <h1 className="mt-5 text-3xl sm:text-4xl font-semibold">AtomSky Control Center</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Secure access for drone operations, aerial intelligence, and vertical-specific mission control.
          </p>
        </div>

        <form onSubmit={handleLogin} className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-6 shadow-card space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" placeholder="you@company.com" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <button type="button" onClick={() => toast("Password reset link sent")} className="text-xs text-primary hover:underline">Forgot Password?</button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" placeholder="••••••••" />
            </div>
          </div>

          <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
            Login <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => toast.success("Access request submitted")}>
            Request Access
          </Button>

          <p className="text-center text-xs text-muted-foreground pt-2">
            Protected by AtomSky aerospace-grade access controls.
          </p>
        </form>
      </main>
    </div>
  );
}
