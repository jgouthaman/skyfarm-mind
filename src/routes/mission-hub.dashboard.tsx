import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Inbox } from "lucide-react";
import { MissionHubShell, MhCard } from "@/components/mission-hub/Shell";
import { useMissionHubAuth } from "@/lib/mission-hub/context";
import { supabase } from "@/integrations/supabase/client";
import { VERTICAL_LABELS, type Vertical } from "@/lib/mission-hub/types";

export const Route = createFileRoute("/mission-hub/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <MissionHubShell title="Dashboard">
      <DashboardInner />
    </MissionHubShell>
  );
}

function DashboardInner() {
  const { profile, verticals } = useMissionHubAuth();
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";

  if (!isAdmin) return <UserDashboard name={profile!.full_name} verticals={verticals} />;
  return <AdminDashboard />;
}

function AdminDashboard() {
  const [stats, setStats] = useState({ leads: 0, contacts: 0, users: 0, week: 0 });
  const [latestLeads, setLatestLeads] = useState<any[]>([]);
  const [latestContacts, setLatestContacts] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const [a, b, c, d, e, leads, contacts] = await Promise.all([
        supabase.from("design_studio_leads").select("*", { count: "exact", head: true }),
        supabase.from("contacts").select("*", { count: "exact", head: true }),
        supabase.from("mission_hub_users").select("*", { count: "exact", head: true }),
        supabase.from("design_studio_leads").select("*", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("contacts").select("*", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("design_studio_leads").select("*").order("created_at", { ascending: false }).limit(5),
        supabase.from("contacts").select("*").order("created_at", { ascending: false }).limit(5),
      ]);
      setStats({
        leads: a.count ?? 0,
        contacts: b.count ?? 0,
        users: c.count ?? 0,
        week: (d.count ?? 0) + (e.count ?? 0),
      });
      setLatestLeads(leads.data ?? []);
      setLatestContacts(contacts.data ?? []);
    })();
  }, []);

  return (
    <div className="space-y-7">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total waitlist leads" value={stats.leads} />
        <Stat label="Total contacts" value={stats.contacts} />
        <Stat label="Total users" value={stats.users} />
        <Stat label="New this week" value={stats.week} />
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Latest waitlist signups" linkTo="/mission-hub/waitlist">
          <SimpleTable
            headers={["Name", "Plan", "Date"]}
            rows={latestLeads.map((r) => [r.full_name, planPill(r.plan), date(r.created_at)])}
          />
        </Panel>
        <Panel title="Latest contacts" linkTo="/mission-hub/contacts">
          <SimpleTable
            headers={["Name", "Vertical", "Date"]}
            rows={latestContacts.map((r) => [r.name, r.vertical_interest || "—", date(r.created_at)])}
          />
        </Panel>
      </div>
    </div>
  );
}

function UserDashboard({ name, verticals }: { name: string; verticals: Vertical[] }) {
  const hasDesignStudio = verticals.includes("design-studio" as Vertical);
  const otherVerticals = verticals.filter((v) => v !== ("design-studio" as Vertical));
  return (
    <div>
      <h2 className="text-white text-2xl" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>
        Welcome back, {name}
      </h2>
      <p className="mt-2 text-sm text-white/55">Your workspace</p>
      {verticals.length === 0 ? (
        <div className="mt-10 text-center text-white/40">
          <Inbox className="h-8 w-8 mx-auto mb-3" />
          No access assigned yet. Contact your administrator.
        </div>
      ) : (
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hasDesignStudio && (
            <Link to="/mission-hub/design-studio">
              <MhCard className="p-5 hover:border-[#EF9F27]/50 transition-colors">
                <div className="text-white" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>
                  Design Studio
                </div>
                <div className="mt-1 text-[12px] text-[#EF9F27]">Open Studio →</div>
              </MhCard>
            </Link>
          )}
          {otherVerticals.map((v) => (
            <Link key={v} to="/mission-hub/verticals/$vertical" params={{ vertical: v }}>
              <MhCard className="p-5 hover:border-[#378ADD]/40 transition-colors">
                <div className="text-white" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>
                  {VERTICAL_LABELS[v]}
                </div>
                <div className="mt-1 text-[12px] text-[#378ADD]">Open →</div>
              </MhCard>
            </Link>
          ))}
        </div>
      )}
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

function Panel({ title, linkTo, children }: { title: string; linkTo: string; children: React.ReactNode }) {
  return (
    <MhCard className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white text-base" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>{title}</h3>
        <Link to={linkTo} className="text-[12px] text-[#378ADD]">View all →</Link>
      </div>
      {children}
    </MhCard>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="text-left text-[10px] uppercase text-white/40">
        {headers.map((h) => <th key={h} className="py-2 font-normal">{h}</th>)}
      </tr></thead>
      <tbody>
        {!rows.length && <tr><td colSpan={headers.length} className="py-6 text-center text-white/30 text-[12px]">No records</td></tr>}
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-white/[0.05]">
            {r.map((c, j) => <td key={j} className="py-2.5 text-white/85">{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const PLAN_COLORS: Record<string, { bg: string; color: string }> = {
  Explorer: { bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" },
  Engineer: { bg: "rgba(55,138,221,0.15)", color: "#378ADD" },
  Squadron: { bg: "rgba(239,159,39,0.15)", color: "#EF9F27" },
  Campus: { bg: "rgba(29,158,117,0.15)", color: "#1D9E75" },
  Waitlist: { bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" },
};

function planPill(plan: string) {
  const s = PLAN_COLORS[plan] ?? PLAN_COLORS.Waitlist;
  return <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>{plan}</span>;
}

function date(iso: string) {
  return <span className="text-[12px] text-white/60">{new Date(iso).toLocaleDateString()}</span>;
}
