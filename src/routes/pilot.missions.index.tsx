import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { usePilotStore } from "@/lib/pilot-store";
import { MapPin, Clock, ArrowRight, Search } from "lucide-react";

export const Route = createFileRoute("/pilot/missions/")({
  head: () => ({ meta: [{ title: "AgriSky Pilot — Missions" }] }),
  component: MissionsList,
});

const filters = ["ALL", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "SYNC_PENDING"] as const;

function statusBadge(s: string) {
  const map: Record<string, string> = {
    ASSIGNED: "bg-primary/15 text-primary border-primary/30",
    IN_PROGRESS: "bg-amber-400/15 text-amber-700 border-amber-400/30",
    COMPLETED: "bg-accent/15 text-accent border-accent/30",
    SYNC_PENDING: "bg-destructive/15 text-destructive border-destructive/30",
  };
  return map[s] || "bg-muted text-muted-foreground";
}

function MissionsList() {
  const missions = usePilotStore((s) => s.missions);
  const [filter, setFilter] = useState<(typeof filters)[number]>("ALL");
  const [q, setQ] = useState("");

  const visible = missions
    .filter((m) => filter === "ALL" || m.status === filter)
    .filter((m) => !q || m.farmName.toLowerCase().includes(q.toLowerCase()) || m.missionCode.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Missions</h1>
        <p className="text-sm text-muted-foreground">All farm operations assigned to you.</p>
      </div>

      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search farm or mission ID"
          className="w-full h-11 pl-9 pr-3 rounded-xl bg-input/40 border border-border/60 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap text-[11px] px-3 py-1.5 rounded-full border ${filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/40 text-muted-foreground border-border/60"}`}
          >
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          No missions match this filter.
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((m) => (
            <Link key={m.id} to="/pilot/missions/$id" params={{ id: m.id }}
              className="block rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-muted-foreground">{m.missionCode} · {m.assignedDrone}</div>
                  <div className="font-semibold">{m.farmName}</div>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full border ${statusBadge(m.status)}`}>{m.status.replace("_", " ")}</span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{m.farmLocation}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{m.scheduledTime}</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-md bg-secondary/60 border border-border/60">
                  {m.missionType === "SURVEY" ? "Farm Survey" : "Spraying"}
                </span>
                <span className="text-xs text-primary flex items-center gap-1">Open <ArrowRight className="h-3 w-3" /></span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
