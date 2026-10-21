import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { FlaskConical } from "lucide-react";
import { markThSessionActive } from "@/lib/test-harness/session";

// Test Harness login — a single hardcoded credential check, no Supabase,
// no backend call. Intentionally simple per spec: this gates a test/demo
// tool, not production user data. Credentials are visible in the client
// bundle, same as any hardcoded frontend check — acceptable here because
// that's explicitly what was asked for, not an oversight.
const TH_USERNAME = "th@th.com";
const TH_PASSWORD = "tqth123";

export const Route = createFileRoute("/t-h/login")({
  head: () => ({
    meta: [
      { title: "Test Harness — Login" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TestHarnessLogin,
});

function TestHarnessLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (username === TH_USERNAME && password === TH_PASSWORD) {
      markThSessionActive();
      navigate({ to: "/t-h" });
      return;
    }
    toast.error("Invalid username or password");
  }

  return (
    <div className="min-h-screen bg-gradient-hero grid-bg flex items-center justify-center p-5">
      <Toaster richColors position="top-center" theme="dark" />
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="grid place-items-center h-10 w-10 rounded-xl bg-gradient-primary shadow-glow">
            <FlaskConical className="h-5 w-5 text-primary-foreground" />
          </span>
          <div className="text-left">
            <div className="font-display font-semibold leading-none">TorqWings</div>
            <div className="text-xs text-muted-foreground">Test Harness</div>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-border/60 bg-gradient-card p-6 shadow-card">
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="text-sm text-muted-foreground mt-1">Internal test tool — not for production data.</p>

          <label className="text-xs text-muted-foreground mt-5 block">Username</label>
          <input
            type="email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="th@th.com"
            className="mt-1 w-full h-12 rounded-lg bg-input/40 border border-border/60 px-3 text-base outline-none focus:ring-2 focus:ring-ring"
          />

          <label className="text-xs text-muted-foreground mt-4 block">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mt-1 w-full h-12 rounded-lg bg-input/40 border border-border/60 px-3 text-base outline-none focus:ring-2 focus:ring-ring"
          />

          <Button type="submit" className="mt-5 w-full h-12 bg-gradient-primary text-primary-foreground">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
