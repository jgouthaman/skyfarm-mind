import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMissionHubAuth } from "@/lib/mission-hub/context";
import { fetchProjectStats, fetchProjectsPage } from "@/lib/design-studio/project-service";
import { RISK_TONE } from "@/lib/design-studio/constants";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/design-studio/sidebar";
import { FilePlus, FlaskConical, Sparkles, FileText, ChevronRight, Inbox } from "lucide-react";

export const Route = createFileRoute("/control-center/torqwings-design-studio/")({
  component: Dashboard,
});

function Dashboard() {
  const { profile } = useMissionHubAuth();
  const nav = useNavigate();
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  const userId = profile?.id ?? "";

  const [stats, setStats] = useState({ total: 0, draft: 0, designed: 0, simulated: 0, reviewed: 0 });
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetchProjectStats(userId, isAdmin).then(setStats).catch(() => {});
  }, [userId, isAdmin]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    fetchProjectsPage(userId, isAdmin, 0, 8, "")
      .then(({ rows: r }) => { if (!cancelled) setRows(r); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, isAdmin]);

  const kpis = [
    { label: "Total Projects",        value: stats.total,     tone: "text-sky-700" },
    { label: "Draft",                 value: stats.draft,     tone: "text-slate-500" },
    { label: "Designed",              value: stats.designed,  tone: "text-indigo-700" },
    { label: "Simulations Completed", value: stats.simulated, tone: "text-violet-700" },
    { label: "Reviewed",              value: stats.reviewed,  tone: "text-emerald-700" },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">TorqWings Design Studio</h1>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
          Design drone architectures from mission requirements, simulate performance, and generate component lists.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border/60 bg-card/60 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</div>
            <div className={`mt-2 text-2xl font-semibold ${k.tone}`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => nav({ to: "/control-center/torqwings-design-studio/new" })} className="bg-sky-500 hover:bg-sky-600 text-white">
          <FilePlus className="h-4 w-4 mr-1" /> Create New Drone Design
        </Button>
        <Button variant="outline" onClick={() => nav({ to: "/control-center/torqwings-design-studio/simulation" })}>
          <FlaskConical className="h-4 w-4 mr-1" /> Open Simulation Lab
        </Button>
        <Button variant="outline" onClick={() => nav({ to: "/control-center/torqwings-design-studio/advisor" })}>
          <Sparkles className="h-4 w-4 mr-1" /> Ask AI Advisor
        </Button>
        <Button variant="outline" onClick={() => nav({ to: "/control-center/torqwings-design-studio/report" })}>
          <FileText className="h-4 w-4 mr-1" /> View Reports
        </Button>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Recent Projects</h2>
        <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden">
          {loading ? (
            <div className="py-4 space-y-2 px-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-10 rounded bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Inbox className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No projects yet</p>
              <p className="text-xs mt-1">Click "Create New Drone Design" above to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    {["Project", "Vertical", "Purpose", "Status", "Risk", "Updated", ""].map((h) => (
                      <th key={h} className="text-left font-medium px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-border/60 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{r.project_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.vertical}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.purpose ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted/40 border border-border">
                          {r.status}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-xs ${RISK_TONE[r.risk_level]?.text ?? "text-muted-foreground"}`}>
                        {r.risk_level ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(r.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to="/control-center/torqwings-design-studio/design"
                          onClick={() => {
                            if (typeof window !== "undefined") {
                              window.sessionStorage.setItem("torqwings-studio:selected", r.id);
                            }
                          }}
                          className="text-primary text-xs inline-flex items-center"
                        >
                          Open <ChevronRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <Disclaimer />
    </div>
  );
}
