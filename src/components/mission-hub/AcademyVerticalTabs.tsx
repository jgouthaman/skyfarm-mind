import { useEffect, useState } from "react";
import { Inbox } from "lucide-react";
import { MhCard } from "@/components/mission-hub/Shell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Tab = "courses" | "modules" | "users";

const TABS: { id: Tab; label: string }[] = [
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

type AcademyUserRow = {
  id: string;
  full_name: string;
  email: string;
  status: string;
  course_id: string | null;
  activated_at: string;
};

export function AcademyVerticalTabs() {
  const [tab, setTab] = useState<Tab>("courses");
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [academyUsers, setAcademyUsers] = useState<AcademyUserRow[]>([]);

  async function loadAll() {
    const [coursesRes, modulesRes, academyUsersRes] = await Promise.all([
      supabase.from("academy_courses" as any).select("*").order("order_index", { ascending: true }),
      supabase.from("academy_course_modules" as any).select("*").order("order_index", { ascending: true }),
      supabase.from("academy_users" as any)
        .select("id, full_name, email, status, course_id, activated_at")
        .eq("status", "active")
        .order("activated_at", { ascending: false }),
    ]);
    if (coursesRes.error) console.error("[Academy] failed to load courses:", coursesRes.error);
    if (modulesRes.error) console.error("[Academy] failed to load modules:", modulesRes.error);
    if (academyUsersRes.error) console.error("[Academy] failed to load academy_users:", academyUsersRes.error);
    setCourses((coursesRes.data ?? []) as unknown as CourseRow[]);
    setModules((modulesRes.data ?? []) as unknown as ModuleRow[]);
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

  async function handleAddCourse(input: {
    title: string; slug: string; level: string; price: number; hours: number; project_count: number;
  }) {
    const nextOrderIndex = courses.reduce((max, c) => Math.max(max, c.order_index ?? 0), 0) + 1;
    const { error } = await supabase.from("academy_courses" as any).insert({
      title: input.title,
      slug: input.slug,
      level: input.level,
      price: input.price,
      hours: input.hours,
      project_count: input.project_count,
      status: "coming_soon",
      order_index: nextOrderIndex,
    } as any);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Course added");
    await loadAll();
    return true;
  }

  async function handleAddModule(input: { course_id: string; title: string }) {
    const nextOrderIndex = modules
      .filter((m) => m.course_id === input.course_id)
      .reduce((max, m) => Math.max(max, m.order_index ?? 0), 0) + 1;
    const { error } = await supabase.from("academy_course_modules" as any).insert({
      course_id: input.course_id,
      title: input.title,
      order_index: nextOrderIndex,
    } as any);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Module added");
    await loadAll();
    return true;
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
          {tab === "courses" && (
            <CoursesTab rows={courses} onStatusChange={handleStatusChange} onAdd={handleAddCourse} />
          )}
          {tab === "modules" && (
            <ModulesTab modules={modules} courses={courses} onAdd={handleAddModule} />
          )}
          {tab === "users" && <UsersTab rows={academyUsers} courseById={courseById} />}
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

function slugify(title: string): string {
  return title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const EMPTY_COURSE_FORM = { title: "", slug: "", level: "Foundation", price: "", hours: "", project_count: "" };

function AddCourseForm({
  onAdd, onDone,
}: {
  onAdd: (input: { title: string; slug: string; level: string; price: number; hours: number; project_count: number }) => Promise<boolean>;
  onDone: () => void;
}) {
  const [form, setForm] = useState(EMPTY_COURSE_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  function setTitle(title: string) {
    setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.slug.trim()) {
      toast.error("Title and slug are required.");
      return;
    }
    setSaving(true);
    const ok = await onAdd({
      title: form.title.trim(),
      slug: form.slug.trim(),
      level: form.level,
      price: Number(form.price) || 0,
      hours: Number(form.hours) || 0,
      project_count: Number(form.project_count) || 0,
    });
    setSaving(false);
    if (ok) onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="px-5 py-4 border-b border-white/[0.08] grid grid-cols-2 gap-3">
      <label className="flex flex-col gap-1 text-[11px] text-white/50">
        Title
        <input
          value={form.title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-transparent border border-white/[0.1] rounded px-2 py-1.5 text-sm text-white"
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-[11px] text-white/50">
        Slug
        <input
          value={form.slug}
          onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: e.target.value })); }}
          className="bg-transparent border border-white/[0.1] rounded px-2 py-1.5 text-sm text-white"
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-[11px] text-white/50">
        Level
        <input
          value={form.level}
          onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
          className="bg-transparent border border-white/[0.1] rounded px-2 py-1.5 text-sm text-white"
        />
      </label>
      <label className="flex flex-col gap-1 text-[11px] text-white/50">
        Price (₹)
        <input
          type="number" min={0} value={form.price}
          onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          className="bg-transparent border border-white/[0.1] rounded px-2 py-1.5 text-sm text-white"
        />
      </label>
      <label className="flex flex-col gap-1 text-[11px] text-white/50">
        Hours
        <input
          type="number" min={0} value={form.hours}
          onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
          className="bg-transparent border border-white/[0.1] rounded px-2 py-1.5 text-sm text-white"
        />
      </label>
      <label className="flex flex-col gap-1 text-[11px] text-white/50">
        Projects
        <input
          type="number" min={0} value={form.project_count}
          onChange={(e) => setForm((f) => ({ ...f, project_count: e.target.value }))}
          className="bg-transparent border border-white/[0.1] rounded px-2 py-1.5 text-sm text-white"
        />
      </label>
      <div className="col-span-2 flex items-center gap-2 mt-1">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg px-4 py-1.5 text-sm"
          style={{ background: "#2BB3B0", color: "#0a0f1c", fontWeight: 500, opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "Adding…" : "Add course"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg px-4 py-1.5 text-sm text-white/60 hover:text-white"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function CoursesTab({
  rows, onStatusChange, onAdd,
}: {
  rows: CourseRow[];
  onStatusChange: (id: string, newStatus: string) => void;
  onAdd: (input: { title: string; slug: string; level: string; price: number; hours: number; project_count: number }) => Promise<boolean>;
}) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-lg px-4 py-1.5 text-sm"
            style={{ background: "#2BB3B0", color: "#0a0f1c", fontWeight: 500 }}
          >
            + Add course
          </button>
        )}
      </div>
      <MhCard className="overflow-hidden">
        {showAdd && <AddCourseForm onAdd={onAdd} onDone={() => setShowAdd(false)} />}
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
    </div>
  );
}

function AddModuleForm({
  courses, onAdd, onDone,
}: {
  courses: CourseRow[];
  onAdd: (input: { course_id: string; title: string }) => Promise<boolean>;
  onDone: () => void;
}) {
  const sortedCourses = [...courses].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  const [courseId, setCourseId] = useState(sortedCourses[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!courseId || !title.trim()) {
      toast.error("Course and title are required.");
      return;
    }
    setSaving(true);
    const ok = await onAdd({ course_id: courseId, title: title.trim() });
    setSaving(false);
    if (ok) onDone();
  }

  if (sortedCourses.length === 0) {
    return (
      <div className="px-5 py-4 border-b border-white/[0.08] text-sm text-white/50">
        Add a course first — modules need a course to belong to.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="px-5 py-4 border-b border-white/[0.08] grid grid-cols-2 gap-3">
      <label className="flex flex-col gap-1 text-[11px] text-white/50">
        Course
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="bg-transparent border border-white/[0.1] rounded px-2 py-1.5 text-sm text-white"
        >
          {sortedCourses.map((c) => (
            <option key={c.id} value={c.id} style={{ color: "#fff", background: "#1a2035" }}>
              {c.title}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[11px] text-white/50">
        Module title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-transparent border border-white/[0.1] rounded px-2 py-1.5 text-sm text-white"
          required
        />
      </label>
      <div className="col-span-2 flex items-center gap-2 mt-1">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg px-4 py-1.5 text-sm"
          style={{ background: "#2BB3B0", color: "#0a0f1c", fontWeight: 500, opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "Adding…" : "Add module"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg px-4 py-1.5 text-sm text-white/60 hover:text-white"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function ModulesTab({
  modules, courses, onAdd,
}: {
  modules: ModuleRow[];
  courses: CourseRow[];
  onAdd: (input: { course_id: string; title: string }) => Promise<boolean>;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const sortedCourses = [...courses].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-lg px-4 py-1.5 text-sm"
            style={{ background: "#2BB3B0", color: "#0a0f1c", fontWeight: 500 }}
          >
            + Add module
          </button>
        )}
      </div>

      {showAdd && (
        <MhCard className="overflow-hidden">
          <AddModuleForm courses={courses} onAdd={onAdd} onDone={() => setShowAdd(false)} />
        </MhCard>
      )}

      {modules.length === 0 ? (
        <MhCard className="overflow-hidden">
          <EmptyState message="No modules found." />
        </MhCard>
      ) : (
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
      )}
    </div>
  );
}

function UsersTab({
  rows, courseById,
}: {
  rows: AcademyUserRow[];
  courseById: Map<string, CourseRow>;
}) {
  return (
    <MhCard className="overflow-hidden">
      {rows.length === 0 ? (
        <EmptyState message="No active academy users yet." />
      ) : (
        <TableShell headers={["User", "Email", "Course", "Status", "Activated"]}>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-white/[0.05]">
              <td className="px-4 py-3 text-white/70 text-[12px]">{r.full_name}</td>
              <td className="px-4 py-3 text-white/70 text-[12px]">{r.email}</td>
              <td className="px-4 py-3 text-white/70 text-[12px]">
                {r.course_id ? (courseById.get(r.course_id)?.title ?? "—") : "—"}
              </td>
              <td className="px-4 py-3 text-[12px] text-white/70">{r.status}</td>
              <td className="px-4 py-3 text-[12px] text-white/60">{new Date(r.activated_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </TableShell>
      )}
    </MhCard>
  );
}
