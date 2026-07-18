import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyAcademyUser } from "@/lib/academy-auth";

export const Route = createFileRoute("/_layout/academy/sign-in")({
  component: AcademySignInPage,
});

function AcademySignInPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await verifyAcademyUser(fullName, email);
      if (!user) {
        setError("We couldn't find a matching account. Check your name and email, or contact academy@torqwings.com.");
        return;
      }
      sessionStorage.setItem("academy_user", JSON.stringify(user));
      navigate({ to: "/academy/dashboard" });
    } catch (err) {
      console.error("[Academy] verifyAcademyUser failed:", err);
      setError("We couldn't verify your account — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="min-h-[70vh] flex items-center justify-center px-5 py-20">
      <div
        className="w-full max-w-sm rounded-xl bg-card p-6 md:p-8"
        style={{ border: "0.5px solid var(--color-border)" }}
      >
        <h1 className="text-2xl font-bold text-foreground text-center">Academy Sign In</h1>
        <p className="mt-2 text-sm text-muted-foreground text-center">
          Enter the name and email you used to enroll.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="signin-name" className="text-xs uppercase tracking-wider text-muted-foreground">
              Full name
            </Label>
            <Input
              id="signin-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="mt-1.5"
              placeholder="Jothi Gouthaman"
            />
          </div>
          <div>
            <Label htmlFor="signin-email" className="text-xs uppercase tracking-wider text-muted-foreground">
              Email
            </Label>
            <Input
              id="signin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1.5"
              placeholder="you@email.com"
            />
          </div>
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Verifying…" : "Sign in"}
          </Button>
        </form>
      </div>
    </section>
  );
}
