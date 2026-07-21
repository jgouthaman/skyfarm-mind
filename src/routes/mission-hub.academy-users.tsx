import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Inbox } from "lucide-react";
import { MissionHubShell, MhCard } from "@/components/mission-hub/Shell";
import { useMissionHubAuth } from "@/lib/mission-hub/context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/mission-hub/academy-users")({
  component: AcademyUsersPage,
});

type WaitlistRow = {
  id: string;
  email: string;
  name: string | null;
  course_id: string | null;
  created_at: string;
  status: string;
};

type CourseRow = { id: string; title: string };

function AcademyUsersPage() {
  const { profile, loading: authLoading } = useMissionHubAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<WaitlistRow[]>([]);
  const [courseById, setCourseById] = useState<Map<string, CourseRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && profile && profile.role === "user") {
      toast.error("Access restricted.");
      navigate({ to: "/mission-hub/dashboard" });
    }
  }, [authLoading, profile, navigate]);

  async function loadAll() {
    const [waitlistRes, coursesRes] = await Promise.all([
      supabase.from("academy_waitlist" as any).select("*").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("academy_courses" as any).select("id, title"),
    ]);
    if (waitlistRes.error) console.error("[Academy Users] failed to load waitlist:", waitlistRes.error);
    if (coursesRes.error) console.error("[Academy Users] failed to load courses:", coursesRes.error);
    setRows((waitlistRes.data ?? []) as unknown as WaitlistRow[]);
    setCourseById(new Map(((coursesRes.data ?? []) as unknown as CourseRow[]).map((c) => [c.id, c])));
  }

  useEffect(() => {
    (async () => {
      await loadAll();
      setLoading(false);
    })();
  }, []);

  // Deletes the row from academy_waitlist and inserts the person into
  // academy_users, atomically, via the enroll_waitlist_user RPC (RLS blocks
  // a plain client-side delete/insert here — see that migration's comment).
  async function handleEnroll(row: WaitlistRow) {
    if (row.status !== "pending" || processingId) return;
    const confirmed = window.confirm(
      `Change ${row.email}'s status to Enrolled? This removes them from the waitlist and creates their Academy account.`,
    );
    if (!confirmed) return;

    setProcessingId(row.id);
    const { error } = await (supabase.rpc as any)("enroll_waitlist_user", { p_waitlist_id: row.id });
    if (error) {
      toast.error(error.message);
      setProcessingId(null);
      return;
    }
    toast.success(`${row.email} enrolled`);
    setRows((rs) => rs.filter((r) => r.id !== row.id));
    setProcessingId(null);
  }

  if (authLoading || loading) {
    return (
      <MissionHubShell title="Academy Users">
        <p className="text-sm text-white/40">Loading…</p>
      </MissionHubShell>
    );
  }

  return (
    <MissionHubShell title="Academy Users">
      <MhCard className="overflow-hidden">
        {rows.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            <Inbox className="h-8 w-8 mx-auto mb-3" />
            <p className="text-sm">No pending academy waitlist entries.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0a0f1c] text-[11px] uppercase text-white/40 text-left">
                  {["Email", "Name", "Course", "Date", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isProcessing = processingId === r.id;
                  const isLocked = processingId !== null;
                  return (
                    <tr
                      key={r.id}
                      className="border-t border-white/[0.05]"
                      style={{ opacity: isProcessing ? 0.5 : 1 }}
                    >
                      <td className="px-4 py-3 text-white/85">{r.email}</td>
                      <td className="px-4 py-3 text-white/70 text-[12px]">{r.name ?? "—"}</td>
                      <td className="px-4 py-3 text-white/70 text-[12px]">
                        {r.course_id ? (courseById.get(r.course_id)?.title ?? "—") : "Full bundle"}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-white/60">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value="pending"
                          disabled={isLocked}
                          onChange={(e) => { if (e.target.value === "enrolled") handleEnroll(r); }}
                          className="bg-transparent border border-white/[0.1] rounded px-2 py-1 text-[11px] text-white"
                        >
                          <option value="pending" style={{ color: "#fff", background: "#1a2035" }}>Pending</option>
                          <option value="enrolled" style={{ color: "#fff", background: "#1a2035" }}>Enrolled</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </MhCard>
    </MissionHubShell>
  );
}
