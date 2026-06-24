import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MissionHubShell, MhCard } from "@/components/mission-hub/Shell";
import { useMissionHubAuth } from "@/lib/mission-hub/context";
import { fetchProjectStats, fetchProjectsPage } from "@/lib/design-studio/project-service";
import { RISK_TONE } from "@/lib/design-studio/constants";
import { toast } from "sonner";
import { ArrowUpRight, Inbox, Plus } from "lucide-react";

const PAGE_SIZE = 10;

export const Route = createFileRoute("/mission-hub/design-studio")({
  component: DesignStudioPage,
});


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
      <MyProjects isAdmin={isAdmin} userId={profile.id} />
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
          to="/control-center/torqwings-design-studio/new"
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] text-white"
          style={{ background: "#185FA5" }}
        >
          <Plus className="h-4 w-4" /> New project
        </Link>
      </div>
    </MhCard>
  );
}

function MyProjects({ isAdmin, userId }: { isAdmin: boolean; userId: string }) {
  const [stats, setStats] = useState({ total: 0, draft: 0, designed: 0, simulated: 0, reviewed: 0 });
  const [rows, setRows] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loadingRows, setLoadingRows] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  // Stats — run once on mount via service layer, never re-run on page/search change
  useEffect(() => {
    fetchProjectStats(userId, isAdmin).then(setStats).catch(() => {});
  }, []);

  // Debounce search input 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to first page whenever search term changes
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  // Rows — re-run on page, search, or manual retry via service layer
  useEffect(() => {
    let cancelled = false;
    setLoadingRows(true);
    setFetchError(null);
    fetchProjectsPage(userId, isAdmin, page, PAGE_SIZE, debouncedSearch)
      .then(({ rows: r, total }) => {
        if (cancelled) return;
        setRows(r);
        setTotalRows(total);
      })
      .catch((e: any) => {
        if (!cancelled) setFetchError(e?.message ?? "Unknown error");
      })
      .finally(() => {
        if (!cancelled) setLoadingRows(false);
      });
    return () => { cancelled = true; };
  }, [page, debouncedSearch, retryTick]);

  return (
    <div className="mb-8">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
        <Stat label={isAdmin ? "Total projects" : "Your projects"} value={stats.total} />
        <Stat label="Draft" value={stats.draft} />
        <Stat label="Designed" value={stats.designed} />
        <Stat label="Simulated" value={stats.simulated} />
        <Stat label="Reviewed" value={stats.reviewed} />
      </div>

      <MhCard className="overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4">
          <h3 className="text-white text-base shrink-0" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>
            {isAdmin ? "All Design Studio projects" : "Your Design Studio projects"}
          </h3>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search projects…"
              className="h-8 w-52 rounded-lg bg-white/8 border border-white/10
                text-sm text-white/80 placeholder-white/30 px-3
                focus:outline-none focus:border-white/25"
            />
            {search && (
              <button
                onClick={() => { setSearch(""); setPage(0); }}
                className="text-white/40 hover:text-white/70 text-xs ml-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {loadingRows ? (
          <div className="py-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 rounded bg-white/5 animate-pulse mx-4 my-2" />
            ))}
          </div>
        ) : fetchError ? (
          <div className="text-white/50 text-sm text-center py-8">
            Failed to load projects.
            <button
              onClick={() => setRetryTick((t) => t + 1)}
              className="underline ml-2 hover:text-white/70"
            >
              Retry
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            <Inbox className="h-8 w-8 mx-auto mb-3" />
            <p className="text-sm">No projects yet</p>
            <p className="text-[12px] mt-1">Click "New project" above to start your first drone design.</p>
          </div>
        ) : (
          <>
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
                      <td className={`px-4 py-3 text-[12px] ${RISK_TONE[r.risk_level]?.text ?? "text-white/60"}`}>{r.risk_level ?? "—"}</td>
                      <td className="px-4 py-3 text-[12px] text-white/60">{new Date(r.updated_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to="/control-center/torqwings-design-studio"
                          className="text-[12px] text-[#378ADD] inline-flex items-center gap-1"
                          onClick={() => {
                            if (typeof window !== "undefined") {
                              window.sessionStorage.setItem("torqwings-studio:selected", r.id);
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

            {totalRows > PAGE_SIZE && (
              <div className="flex items-center justify-between px-5 py-3
                border-t border-white/[0.05] text-[12px] text-white/40">
                <span>
                  Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalRows)} of {totalRows}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1 rounded border border-white/10 text-white/60
                      hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Prev
                  </button>
                  <button
                    disabled={(page + 1) * PAGE_SIZE >= totalRows}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1 rounded border border-white/10 text-white/60
                      hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </MhCard>
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
