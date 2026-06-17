import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MissionHubShell, MhCard } from "@/components/mission-hub/Shell";
import { RecordsTable } from "@/components/mission-hub/RecordsTable";
import { useMissionHubAuth } from "@/lib/mission-hub/context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/mission-hub/design-studio")({
  component: DesignStudioPage,
});

const STATUS = [
  { value: "new", label: "New", color: "#378ADD", bg: "rgba(55,138,221,0.15)" },
  { value: "contacted", label: "Contacted", color: "#EF9F27", bg: "rgba(239,159,39,0.15)" },
  { value: "converted", label: "Converted", color: "#1D9E75", bg: "rgba(29,158,117,0.15)" },
  { value: "not_interested", label: "Not interested", color: "rgba(255,255,255,0.6)", bg: "rgba(255,255,255,0.06)" },
];

const PROJECTS = [
  { name: "AgriSpray X1", vertical: "AgriSky", status: "Production" },
  { name: "Solar Scout", vertical: "InfraSky", status: "Pilot" },
  { name: "FireWatch Pro", vertical: "GuardSky", status: "Beta" },
  { name: "MapStream 300", vertical: "GeoSky", status: "Pilot" },
  { name: "CargoLift 50", vertical: "Labs", status: "Prototype" },
];

function DesignStudioPage() {
  const { profile, loading } = useMissionHubAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, explorer: 0, engineer: 0, week: 0 });

  useEffect(() => {
    if (!loading && profile && profile.role === "user") {
      toast.error("Access restricted.");
      navigate({ to: "/mission-hub/dashboard" });
    }
  }, [loading, profile, navigate]);

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
    <MissionHubShell title="Design Studio">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
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

      <MhCard className="p-6 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-base" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>Design projects — coming soon</h3>
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: "rgba(239,159,39,0.15)", color: "#EF9F27" }}>
            Preview data — live projects in next release
          </span>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[10px] uppercase text-white/40">
            <th className="py-2 font-normal">Project</th><th className="py-2 font-normal">Vertical</th><th className="py-2 font-normal">Status</th>
          </tr></thead>
          <tbody>
            {PROJECTS.map((p) => (
              <tr key={p.name} className="border-t border-white/[0.05]">
                <td className="py-2.5 text-white/85">{p.name}</td>
                <td className="py-2.5 text-white/70">{p.vertical}</td>
                <td className="py-2.5 text-white/70">{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </MhCard>
    </MissionHubShell>
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
