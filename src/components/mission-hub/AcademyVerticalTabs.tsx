import { useEffect, useState } from "react";
import { Inbox } from "lucide-react";
import { MhCard } from "@/components/mission-hub/Shell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Tab = "waitlist" | "courses" | "modules" | "users";

const TABS: { id: Tab; label: string }[] = [
  { id: "waitlist", label: "Waitlist" },
  { id: "courses", label: "Courses" },
  { id: "modules", label: "Modules" },
  { id: "users", label: "Users" },
];

const STATUS_DISPLAY_LABEL: Record<string, string> = {
  coming_soon: "Coming Soon",
  active: "Active",
};

type CourseRow = {
  id: string;
  title: string;
  level: string;
  price: number;
  hours: number;
  project_count: number;
  status: string;
  order_index: number | null;
};

type ModuleRow = {
  id: string;
  title: string;
  order_index: number;
  course_id: string;
};

type WaitlistRow = {
  id: string;
  email: string;
  name: string | null;
  course_id: string | null;
  created_at: string;
  status: string;
};

type EnrollmentRow = {
  id: string;
  user_id: string;
  course_id: string | null;
  enrolled_at: string;
  status: string;
};

type AcademyUserRow = {
  id: string;
  full_name: string;
  email: string;
};

export function AcademyVerticalTabs() {
  const [tab, setTab] = useState<Tab>("waitlist");
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistRow[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [academyUsers, setAcademyUsers] = useState<AcademyUserRow[]>([]);
  const [promotingId, setPromotingId] = useState<string | null>(null);

  async function loadAll() {
    const [coursesRes, modulesRes, waitlistRes, enrollmentsRes, academyUsersRes] = await Promise.all([
      supabase.from("academy_courses" as any).select("*").order("order_index", { ascending: true }),
      supabase.from("academy_course_modules" as any).select("*").order("order_index", { ascending: true }),
      supabase.from("academy_waitlist" as any).select("*").neq("status", "converted").order("created_at", { ascending: false }),
      supabase.from("enrollments" as any).select("*").order("enrolled_at", { ascending: false }),
      supabase.from("academy_users" as any).select("id, full_name, email"),
    ]);
    if (coursesRes.error) console.error("[Academy] failed to load courses:", coursesRes.error);
    if (modulesRes.error) console.error("[Academy] failed to load modules:", modulesRes.error);
    if (waitlistRes.error) console.error("[Academy] failed to load waitlist:", waitlistRes.error);
    if (enrollmentsRes.error) console.error("[Academy] failed to load enrollments:", enrollmentsRes.error);
    if (academyUsersRes.error) console.error("[Academy] failed to load academy_users:", academyUsersRes.error);
    setCourses((coursesRes.data ?? []) as unknown as CourseRow[]);
    setModules((modulesRes.data ?? []) as unknown as ModuleRow[]);
    setWaitlist((waitlistRes.data ?? []) as unknown as WaitlistRow[]);
    setEnrollments((enrollmentsRes.data ?? []) as unknown as EnrollmentRow[]);
    setAcademyUsers((academyUsersRes.data ?? []) as unknown as AcademyUserRow[]);
  }

  useEffect(() => {
    (async () => {
      await loadAll();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const courseById = new Map(courses.map((c) => [c.id, c]));
  const academyUserById = new Map(academyUsers.map((u) => [u.id, u]));

  async function handlePromote(row: WaitlistRow) {
    if (row.status !== "pending" || promotingId) return;
    const confirmed = window.confirm(`Promote ${row.email} to an active Academy user?`);
    if (!confirmed) return;

    setPromotingId(row.id);
    const { error } = await (supabase.rpc as any)("promote_waitlist_to_active", { p_waitlist_id: row.id });
    if (error) {
      toast.error(error.message);
      setPromotingId(null);
      return;
    }
    toast.success(`${row.email} promoted to an active user`);
    await loadAll();
    setPromotingId(null);
  }

  async function handleStatusChange(id: string, newStatus: string) {
    const prevCourse = courses.find((c) => c.id === id);
    if (!prevCourse || prevCourse.status === newStatus) return;
    const prevStatus = prevCourse.status;

    if (prevStatus === "coming_soon" && newStatus === "active") {
      const confirmed = window.confirm(
        "Make this course Active? This is the state that makes it publicly sellable.",
      );
      if (!confirmed) return;
    }

    setCourses((cs) => cs.map((c) => (c.id === id ? { ...c, status: newStatus } : c)));
    const { error } = await supabase.from("academy_courses" as any).update({ status: newStatus }).eq("id", id);
    if (error) {
      setCourses((cs) => cs.map((c) => (c.id === id ? { ...c, status: prevStatus } : c)));
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="rounded-full px-4 py-1.5 text-sm transition-colors"
            style={
              tab === t.id
                ? { background: "#2BB3B0", color: "#0a0f1c", fontWeight: 500 }
                : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : (
        <>
          {tab === "waitlist" && (
            <WaitlistTab
              rows={waitlist}
              courseById={courseById}
              onPromote={handlePromote}
              promotingId={promotingId}
            />
          )}
          {tab === "courses" && <CoursesTab rows={courses} onStatusChange={handleStatusChange} />}
          {tab === "modules" && <ModulesTab modules={modules} courses={courses} />}
          {tab === "users" && (
            <UsersTab rows={enrollments} courseById={courseById} academyUserById={academyUserById} />
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-white/40">
      <Inbox className="h-8 w-8 mx-auto mb-3" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function TableShell({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#0a0f1c] text-[11px] uppercase text-white/40 text-left">
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 font-normal">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function WaitlistTab({
  rows, courseById, onPromote, promotingId,
}: {
  rows: WaitlistRow[];
  courseById: Map<string, CourseRow>;
  onPromote: (row: WaitlistRow) => void;
  promotingId: string | null;
}) {
  return (
    <MhCard className="overflow-hidden">
      {rows.length === 0 ? (
        <EmptyState message="No pending waitlist entries." />
      ) : (
        <TableShell headers={["Email", "Name", "Course", "Date", "Status"]}>
          {rows.map((r) => {
            const isPending = r.status === "pending";
            const isPromoting = promotingId === r.id;
            const isLocked = promotingId !== null;
            return (
              <tr
                key={r.id}
                onDoubleClick={() => isPending && !isLocked && onPromote(r)}
                title={isPending ? "Double-click to promote to an active user" : undefined}
                className="border-t border-white/[0.05]"
                style={{
                  cursor: isPending && !isLocked ? "pointer" : "default",
                  opacity: isPromoting ? 0.5 : 1,
                }}
              >
                <td className="px-4 py-3 text-white/85">{r.email}</td>
                <td className="px-4 py-3 text-white/70 text-[12px]">{r.name ?? "—"}</td>
                <td className="px-4 py-3 text-white/70 text-[12px]">
                  {r.course_id ? (courseById.get(r.course_id)?.title ?? "—") : "Full bundle"}
                </td>
                <td className="px-4 py-3 text-[12px] text-white/60">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-[12px] text-white/70">
                  {isPromoting ? "Promoting…" : r.status}
                </td>
              </tr>
            );
          })}
        </TableShell>
      )}
    </MhCard>
  );
}

function CoursesTab({
  rows, onStatusChange,
}: { rows: CourseRow[]; onStatusChange: (id: string, newStatus: string) => void }) {
  return (
    <MhCard className="overflow-hidden">
      {rows.length === 0 ? (
        <EmptyState message="No courses found." />
      ) : (
        <TableShell headers={["Title", "Level", "Price", "Hours", "Projects", "Status"]}>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-white/[0.05]">
              <td className="px-4 py-3 text-white/85">{r.title}</td>
              <td className="px-4 py-3 text-white/70 text-[12px]">{r.level}</td>
              <td className="px-4 py-3 text-white/70 text-[12px]">₹{Number(r.price).toLocaleString("en-IN")}</td>
              <td className="px-4 py-3 text-white/70 text-[12px]">{r.hours}</td>
              <td className="px-4 py-3 text-white/70 text-[12px]">{r.project_count}</td>
              <td className="px-4 py-3">
                <select
                  value={r.status}
                  onChange={(e) => onStatusChange(r.id, e.target.value)}
                  className="bg-transparent border border-white/[0.1] rounded px-2 py-1 text-[11px] text-white"
                >
                  {Object.entries(STATUS_DISPLAY_LABEL).map(([value, label]) => (
                    <option key={value} value={value} style={{ color: "#fff", background: "#1a2035" }}>
                      {label}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </TableShell>
      )}
    </MhCard>
  );
}

function ModulesTab({ modules, courses }: { modules: ModuleRow[]; courses: CourseRow[] }) {
  if (modules.length === 0) {
    return (
      <MhCard className="overflow-hidden">
        <EmptyState message="No modules found." />
      </MhCard>
    );
  }
  const sortedCourses = [...courses].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  return (
    <div className="space-y-5">
      {sortedCourses.map((course) => {
        const courseModules = modules
          .filter((m) => m.course_id === course.id)
          .sort((a, b) => a.order_index - b.order_index);
        if (courseModules.length === 0) return null;
        return (
          <MhCard key={course.id} className="overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.08]">
              <h3 className="text-white text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>
                {course.title}
              </h3>
            </div>
            <TableShell headers={["#", "Module"]}>
              {courseModules.map((m) => (
                <tr key={m.id} className="border-t border-white/[0.05]">
                  <td className="px-4 py-3 text-white/50 text-[12px]">{m.order_index}</td>
                  <td className="px-4 py-3 text-white/85">{m.title}</td>
                </tr>
              ))}
            </TableShell>
          </MhCard>
        );
      })}
    </div>
  );
}

function UsersTab({
  rows, courseById, academyUserById,
}: {
  rows: EnrollmentRow[];
  courseById: Map<string, CourseRow>;
  academyUserById: Map<string, AcademyUserRow>;
}) {
  return (
    <MhCard className="overflow-hidden">
      {rows.length === 0 ? (
        <EmptyState message="No enrollments yet." />
      ) : (
        <TableShell headers={["User", "Email", "Course", "Status", "Enrolled"]}>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-white/[0.05]">
              <td className="px-4 py-3 text-white/70 text-[12px]">
                {academyUserById.get(r.user_id)?.full_name ?? r.user_id}
              </td>
              <td className="px-4 py-3 text-white/70 text-[12px]">
                {academyUserById.get(r.user_id)?.email ?? "—"}
              </td>
              <td className="px-4 py-3 text-white/70 text-[12px]">
                {r.course_id ? (courseById.get(r.course_id)?.title ?? "—") : "—"}
              </td>
              <td className="px-4 py-3 text-[12px] text-white/70">{r.status}</td>
              <td className="px-4 py-3 text-[12px] text-white/60">{new Date(r.enrolled_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </TableShell>
      )}
    </MhCard>
  );
}
