import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MissionHubShell, MhCard } from "@/components/mission-hub/Shell";
import { RecordsTable } from "@/components/mission-hub/RecordsTable";
import { useMissionHubAuth } from "@/lib/mission-hub/context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowUpRight, Inbox, Plus } from "lucide-react";

export const Route = createFileRoute("/mission-hub/design-studio")({
  component: DesignStudioPage,
});

const STATUS = [
  { value: "new", label: "New", color: "#378ADD", bg: "rgba(55,138,221,0.15)" },
  { value: "contacted", label: "Contacted", color: "#EF9F27", bg: "rgba(239,159,39,0.15)" },
  { value: "converted", label: "Converted", color: "#1D9E75", bg: "rgba(29,158,117,0.15)" },
  { value: "not_interested", label: "Not interested", color: "rgba(255,255,255,0.6)", bg: "rgba(255,255,255,0.06)" },
];

function DesignStudioPage() {
  const { profile, verticals, loading } = useMissionHubAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  const hasAccess = isAdmin || verticals.includes("design-studio" as any);

  useEffect(() => {
    if (!loading && profile && !hasAccess) {
      toast.error("Access restricted.");
      navigate({ to: "/mission-hub/dashboard" });
    }
  }, [loading, profile, hasAccess, navigate]);

  if (loading || !profile) return null;
  if (!hasAccess) return null;

  return (
    <MissionHubShell title="Design Studio">
      <LaunchBanner />
      <MyProjects isAdmin={isAdmin} userId={profile.user_id} />
      {isAdmin && <AdminLeads />}
    </MissionHubShell>
  );
}

function LaunchBanner() {
  return (
    <MhCard className="p-6 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <div className="text-white text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>
          TorqWings Design Studio
        </div>
        <p className="mt-1 text-[13px] text-white/55 max-w-xl">
          Design drone architectures from mission requirements, run simulations, and generate component lists & reports. Your work is saved to your account.
        </p>
      </div>
      <div className="flex gap-2">
        <Link
          to="/control-center/aerospawn-design-studio/new"
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] text-white"
          style={{ background: "#185FA5" }}
        >
          <Plus className="h-4 w-4" /> New project
        </Link>
        <Link
          to="/control-center/aerospawn-design-studio"
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] text-white border"
          style={{ borderColor: "rgba(255,255,255,0.12)" }}
        >
          Open Studio <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </MhCard>
  );
}

function MyProjects({ isAdmin, userId }: { isAdmin: boolean; userId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, designed: 0, simulated: 0, reviewed: 0 });

  useEffect(() => {
    (async () => {
      // RLS already scopes non-admins to their own; admins see all. Keep it consistent.
      const { data } = await supabase
        .from("studio_projects")
        .select("id, project_name, vertical, purpose, status, risk_level, created_at, updated_at, user_id")
        .order("updated_at", { ascending: false });
      const list = data ?? [];
      setRows(list);
      setStats({
        total: list.length,
        designed: list.filter((p) => p.status === "Designed").length,
        simulated: list.filter((p) => p.status === "Simulated").length,
        reviewed: list.filter((p) => p.status === "Reviewed").length,
      });
    })();
  }, [userId]);

  return (
    <div className="mb-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <Stat label={isAdmin ? "Total projects" : "Your projects"} value={stats.total} />
        <Stat label="Designed" value={stats.designed} />
        <Stat label="Simulated" value={stats.simulated} />
        <Stat label="Reviewed" value={stats.reviewed} />
      </div>

      <MhCard className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <h3 className="text-white text-base" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>
            {isAdmin ? "All Design Studio projects" : "Your Design Studio projects"}
          </h3>
        </div>
        {rows.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            <Inbox className="h-8 w-8 mx-auto mb-3" />
            <p className="text-sm">No projects yet</p>
            <p className="text-[12px] mt-1">Click "New project" above to start your first drone design.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0a0f1c] text-[11px] uppercase text-white/40 text-left">
                  <th className="px-4 py-3 font-normal">Project</th>
                  <th className="px-4 py-3 font-normal">Vertical</th>
                  <th className="px-4 py-3 font-normal">Purpose</th>
                  <th className="px-4 py-3 font-normal">Status</th>
                  <th className="px-4 py-3 font-normal">Risk</th>
                  <th className="px-4 py-3 font-normal">Updated</th>
                  <th className="px-4 py-3 font-normal text-right">Open</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-white/[0.05]">
                    <td className="px-4 py-3 text-white/85">{r.project_name}</td>
                    <td className="px-4 py-3 text-white/70 text-[12px]">{r.vertical}</td>
                    <td className="px-4 py-3 text-white/70 text-[12px]">{r.purpose ?? "—"}</td>
                    <td className="px-4 py-3 text-[12px] text-white/70">{r.status}</td>
                    <td className="px-4 py-3 text-[12px]" style={{ color: riskTone(r.risk_level) }}>{r.risk_level ?? "—"}</td>
                    <td className="px-4 py-3 text-[12px] text-white/60">{new Date(r.updated_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/control-center/aerospawn-design-studio"
                        className="text-[12px] text-[#378ADD] inline-flex items-center gap-1"
                        onClick={() => {
                          if (typeof window !== "undefined") {
                            window.sessionStorage.setItem("aerospawn-studio:selected", r.id);
                          }
                        }}
                      >
                        Open <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </MhCard>
    </div>
  );
}

function riskTone(r: string | null) {
  if (r === "Safe") return "#1D9E75";
  if (r === "Warning") return "#EF9F27";
  if (r === "Unsafe") return "#ef4444";
  return "rgba(255,255,255,0.6)";
}

function AdminLeads() {
  const [stats, setStats] = useState({ total: 0, explorer: 0, engineer: 0, week: 0 });
  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const [a, b, c, d] = await Promise.all([
        supabase.from("design_studio_leads").select("*", { count: "exact", head: true }),
        supabase.from("design_studio_leads").select("*", { count: "exact", head: true }).eq("plan", "Explorer"),
        supabase.from("design_studio_leads").select("*", { count: "exact", head: true }).eq("plan", "Engineer"),
        supabase.from("design_studio_leads").select("*", { count: "exact", head: true }).gte("created_at", since),
      ]);
      setStats({ total: a.count ?? 0, explorer: b.count ?? 0, engineer: c.count ?? 0, week: d.count ?? 0 });
    })();
  }, []);

  return (
    <div className="mt-10">
      <h3 className="text-white text-base mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>
        Waitlist & leads
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <Stat label="Total waitlist leads" value={stats.total} />
        <Stat label="Explorer signups" value={stats.explorer} />
        <Stat label="Engineer signups" value={stats.engineer} />
        <Stat label="New this week" value={stats.week} />
      </div>
      <RecordsTable
        table="design_studio_leads"
        searchFields={["full_name", "email"]}
        csvFilename="design-studio-waitlist.csv"
        columns={[
          { key: "full_name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone" },
          { key: "organisation", label: "Organisation" },
          { key: "role", label: "Role" },
          { key: "plan", label: "Plan" },
          { key: "location", label: "Location" },
        ]}
        filters={[{
          key: "plan", label: "Plans",
          options: ["Explorer", "Engineer", "Squadron", "Campus", "Waitlist"].map((p) => ({ value: p, label: p })),
        }]}
        statusOptions={STATUS}
        detailFields={[
          { key: "full_name", label: "Full name" }, { key: "email", label: "Email" },
          { key: "phone", label: "Phone" }, { key: "organisation", label: "Organisation" },
          { key: "role", label: "Role" }, { key: "location", label: "Location" },
          { key: "plan", label: "Plan" }, { key: "message", label: "Message" },
        ]}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <MhCard className="p-5">
      <div className="text-3xl text-white" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>{value}</div>
      <div className="mt-1 text-[12px] text-white/50">{label}</div>
    </MhCard>
  );
}
