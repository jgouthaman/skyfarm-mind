import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MissionHubShell, MhCard } from "@/components/mission-hub/Shell";
import { useMissionHubAuth } from "@/lib/mission-hub/context";
import { supabase } from "@/integrations/supabase/client";
import { ALL_VERTICALS, VERTICAL_LABELS, type Vertical } from "@/lib/mission-hub/types";
import { Inbox } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/mission-hub/verticals/$vertical")({
  component: VerticalPage,
});

function VerticalPage() {
  const { vertical } = Route.useParams();
  const v = vertical as Vertical;
  const navigate = useNavigate();
  const { profile, verticals, loading } = useMissionHubAuth();
  const [stats, setStats] = useState({ contacts: 0, users: 0, week: 0 });
  const [rows, setRows] = useState<any[]>([]);
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";

  useEffect(() => {
    if (!ALL_VERTICALS.includes(v)) {
      navigate({ to: "/mission-hub/dashboard" }); return;
    }
    if (!loading && profile && !isAdmin && !verticals.includes(v)) {
      toast.error("You are not mapped to this vertical.");
      navigate({ to: "/mission-hub/dashboard" });
    }
  }, [v, loading, profile, verticals, isAdmin, navigate]);

  useEffect(() => {
    if (!ALL_VERTICALS.includes(v)) return;
    (async () => {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const [a, b, c, d] = await Promise.all([
        supabase.from("contacts").select("*", { count: "exact", head: true }).eq("vertical_interest", v),
        supabase.from("user_verticals").select("*", { count: "exact", head: true }).eq("vertical", v),
        supabase.from("contacts").select("*", { count: "exact", head: true }).eq("vertical_interest", v).gte("created_at", since),
        supabase.from("contacts").select("*").eq("vertical_interest", v).order("created_at", { ascending: false }).limit(20),
      ]);
      setStats({ contacts: a.count ?? 0, users: b.count ?? 0, week: c.count ?? 0 });
      setRows(d.data ?? []);
    })();
  }, [v]);

  if (!ALL_VERTICALS.includes(v)) return null;

  return (
    <MissionHubShell title={VERTICAL_LABELS[v]}>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-[22px] text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{VERTICAL_LABELS[v]}</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-7">
        <Stat label="Contacts from this vertical" value={stats.contacts} />
        <Stat label="Users mapped to this vertical" value={stats.users} />
        <Stat label="New this week" value={stats.week} />
      </div>

      <MhCard className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <h3 className="text-white text-base" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>Contacts</h3>
          <Link to="/mission-hub/contacts" search={{ vertical: v }} className="text-[12px] text-[#378ADD]">View all in Contacts →</Link>
        </div>
        {rows.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            <Inbox className="h-8 w-8 mx-auto mb-3" />
            <p className="text-sm">No activity yet for {VERTICAL_LABELS[v]}</p>
            <p className="text-[12px] mt-1">Contacts and leads mapped to this vertical will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-[#0a0f1c] text-[11px] uppercase text-white/40 text-left">
                <th className="px-4 py-3 font-normal">Name</th>
                <th className="px-4 py-3 font-normal">Email</th>
                <th className="px-4 py-3 font-normal">Phone</th>
                <th className="px-4 py-3 font-normal">Location</th>
                <th className="px-4 py-3 font-normal">Status</th>
                <th className="px-4 py-3 font-normal">Date</th>
              </tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-white/[0.05]">
                    <td className="px-4 py-3 text-white/85">{r.name}</td>
                    <td className="px-4 py-3 text-white/70 text-[12px]">{r.email}</td>
                    <td className="px-4 py-3 text-white/70 text-[12px]">{r.phone}</td>
                    <td className="px-4 py-3 text-white/70 text-[12px]">{r.location}</td>
                    <td className="px-4 py-3 text-[12px] text-white/70">{r.status}</td>
                    <td className="px-4 py-3 text-[12px] text-white/60">{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
