import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const GetDashboardSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export type AcademyEnrolledCourse = {
  enrollmentId: string;
  status: string;
  enrolledAt: string;
  courseId: string | null;
  title: string;
  level: string | null;
  price: number | null;
};

// Re-verifies name+email server-side (same RPC the sign-in page uses) before
// reading enrollments via the service-role client. There is no real auth
// session for academy students to scope an RLS policy against, so this
// re-check is what stands in for "is this really you" on every dashboard load.
export const getAcademyDashboard = createServerFn({ method: "POST" })
  .validator((d: unknown) => GetDashboardSchema.parse(d))
  .handler(async ({ data }) => {
    const { data: verified, error: verifyError } = await supabase.rpc("verify_academy_user" as any, {
      p_name: data.name.trim(),
      p_email: data.email.trim(),
    } as any);
    if (verifyError) throw new Error(verifyError.message);
    const user = (Array.isArray(verified) ? verified[0] : verified) as
      | { id: string; full_name: string; email: string }
      | null
      | undefined;
    if (!user) throw new Error("No matching academy account found");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: enrollments, error: enrollError } = await supabaseAdmin
      .from("enrollments" as any)
      .select("id, status, enrolled_at, course_id")
      .eq("user_id", user.id)
      .order("enrolled_at", { ascending: false });
    if (enrollError) throw new Error(enrollError.message);

    const rows = (enrollments ?? []) as any[];
    const courseIds = rows.map((r) => r.course_id).filter(Boolean);

    let courseById = new Map<string, any>();
    if (courseIds.length) {
      const { data: courseRows, error: courseError } = await supabaseAdmin
        .from("academy_courses" as any)
        .select("id, title, level, price")
        .in("id", courseIds);
      if (courseError) throw new Error(courseError.message);
      courseById = new Map((courseRows ?? []).map((c: any) => [c.id, c]));
    }

    const courses: AcademyEnrolledCourse[] = rows.map((r) => ({
      enrollmentId: r.id,
      status: r.status,
      enrolledAt: r.enrolled_at,
      courseId: r.course_id,
      title: r.course_id ? (courseById.get(r.course_id)?.title ?? "Unknown course") : "Full bundle",
      level: r.course_id ? (courseById.get(r.course_id)?.level ?? null) : null,
      price: r.course_id ? Number(courseById.get(r.course_id)?.price ?? 0) : null,
    }));

    return { user, courses };
  });
