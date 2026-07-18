import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import type { AcademyUser } from "@/lib/academy-auth";
import { getAcademyDashboard, type AcademyEnrolledCourse } from "@/lib/academy-student.functions";

export const Route = createFileRoute("/_layout/academy/dashboard")({
  component: AcademyDashboardPage,
});

function AcademyDashboardPage() {
  const navigate = useNavigate();
  const loadDashboard = useServerFn(getAcademyDashboard);
  const [user, setUser] = useState<AcademyUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<AcademyEnrolledCourse[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("academy_user");
    if (!raw) {
      navigate({ to: "/academy/sign-in" });
      return;
    }
    setUser(JSON.parse(raw));
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const result = await loadDashboard({ data: { name: user.full_name, email: user.email } });
        setCourses(result.courses);
      } catch (err) {
        console.error("[Academy] failed to load dashboard:", err);
        setError("We couldn't load your enrolled courses — please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, loadDashboard]);

  function handleSignOut() {
    sessionStorage.removeItem("academy_user");
    navigate({ to: "/academy/sign-in" });
  }

  if (!user) return null;

  return (
    <section className="mx-auto max-w-4xl px-5 lg:px-8 py-16 lg:py-20">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Welcome, {user.full_name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="text-sm text-muted-foreground underline underline-offset-2 hover:opacity-80"
        >
          Sign out
        </button>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">Your enrolled courses</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : courses.length === 0 ? (
          <p className="text-sm text-muted-foreground">You're not enrolled in any courses yet.</p>
        ) : (
          <div className="space-y-3">
            {courses.map((c) => (
              <div
                key={c.enrollmentId}
                className="rounded-xl bg-card p-5"
                style={{ border: "0.5px solid var(--color-border)" }}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-semibold text-foreground">{c.title}</h3>
                  <span className="text-xs text-muted-foreground">{c.status}</span>
                </div>
                {c.level && <p className="mt-1 text-xs text-muted-foreground">{c.level}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
