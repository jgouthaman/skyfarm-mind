import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, CheckCircle2, Plane, ArrowLeft, Calendar, Clock, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  listDrones, createDrone, listMissionsForDrone, listFarms, listPilots,
  type Drone, type Mission, type Farm, type Pilot,
} from "@/lib/cloud-api";

export function DronesSection() {
  const [selected, setSelected] = useState<Drone | null>(null);
  if (selected) return <DroneDetail drone={selected} onBack={() => setSelected(null)} />;
  return <DronesList onOpen={setSelected} />;
}

function statusTone(s: string) {
  if (s === "available") return "bg-accent/15 text-accent border-accent/50";
  if (s === "in_mission" || s === "assigned") return "bg-primary/15 text-primary border-primary/50";
  if (s === "maintenance") return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
  return "bg-muted text-muted-foreground border-border";
}

function DronesList({ onOpen }: { onOpen: (d: Drone) => void }) {
  const qc = useQueryClient();
  const { data: drones = [], isLoading, refetch } = useQuery({ queryKey: ["drones"], queryFn: listDrones });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", model: "", serial_no: "", capacity_litres: "", notes: "" });

  const m = useMutation({
    mutationFn: createDrone,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drones"] });
      setOpen(false);
      setForm({ name: "", model: "", serial_no: "", capacity_litres: "", notes: "" });
      toast.success("Drone onboarded");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = () => {
    if (!form.name.trim()) return toast.error("Enter drone name / tail no.");
    m.mutate({
      name: form.name.trim(),
      model: form.model || undefined,
      serial_no: form.serial_no || undefined,
      capacity_litres: form.capacity_litres ? Number(form.capacity_litres) : undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Drones</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Onboard drones into the fleet, then map them to pilot+farm assignments.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh</Button>
          <Button className="bg-gradient-agri text-primary-foreground" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Onboard Drone</Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-gradient-card shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading drones…</div>
        ) : drones.length === 0 ? (
          <div className="p-10 text-center">
            <Plane className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No drones yet. Onboard your first drone to provision it for missions.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>{["Drone", "Model", "Serial", "Capacity", "Status", "Onboarded", ""].map(h => <th key={h} className="text-left font-medium px-4 py-3">{h}</th>)}</tr>
              </thead>
              <tbody>
                {drones.map((d) => (
                  <tr key={d.id} className="border-t border-border/60 hover:bg-muted/20 cursor-pointer" onClick={() => onOpen(d)}>
                    <td className="px-4 py-3 font-medium flex items-center gap-2"><Plane className="h-4 w-4 text-primary" /> {d.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{d.model || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{d.serial_no || "—"}</td>
                    <td className="px-4 py-3">{d.capacity_litres ? `${d.capacity_litres} L` : "—"}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${statusTone(d.status)}`}>{d.status.replace("_", " ")}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onOpen(d); }}>View</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Onboard drone</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Name / Tail no.</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. AS-01" /></div>
              <div className="space-y-1.5"><Label>Model</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="DJI Agras T40" /></div>
              <div className="space-y-1.5"><Label>Serial number</Label><Input value={form.serial_no} onChange={(e) => setForm({ ...form, serial_no: e.target.value })} placeholder="SN-XXXX" /></div>
              <div className="space-y-1.5"><Label>Tank capacity (L)</Label><Input inputMode="decimal" value={form.capacity_litres} onChange={(e) => setForm({ ...form, capacity_litres: e.target.value })} placeholder="40" /></div>
            </div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Battery count, accessories, etc." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={m.isPending} className="bg-gradient-agri text-primary-foreground">
              {m.isPending ? "Adding…" : <><CheckCircle2 className="h-4 w-4 mr-1" /> Onboard Drone</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DroneDetail({ drone, onBack }: { drone: Drone; onBack: () => void }) {
  const { data: missions = [] } = useQuery({ queryKey: ["missions", "drone", drone.id], queryFn: () => listMissionsForDrone(drone.id) });
  const { data: farms = [] } = useQuery({ queryKey: ["farms"], queryFn: listFarms });
  const { data: pilots = [] } = useQuery({ queryKey: ["pilots"], queryFn: listPilots });

  const farmName = (id: string) => farms.find((f: Farm) => f.id === id)?.name || "—";
  const pilotName = (id: string | null) => pilots.find((p: Pilot) => p.id === id)?.name || "—";

  const now = Date.now();
  const upcoming = missions.filter((m) => m.status !== "completed" && (!m.scheduled_at || new Date(m.scheduled_at).getTime() >= now - 3600_000));
  const past = missions.filter((m) => !upcoming.includes(m));
  const isBusy = missions.some((m) => m.status === "assigned" || m.status === "in_progress");

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground mb-2 flex items-center gap-1"><ArrowLeft className="h-3 w-3" /> Back to Drones</button>
          <h1 className="text-2xl sm:text-3xl font-semibold flex items-center gap-2"><Plane className="h-6 w-6 text-primary" /> {drone.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground flex items-center gap-3 flex-wrap">
            {drone.model && <span>{drone.model}</span>}
            {drone.serial_no && <span>SN {drone.serial_no}</span>}
            {drone.capacity_litres && <span>{drone.capacity_litres} L tank</span>}
          </p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs border capitalize ${isBusy ? "bg-primary/15 text-primary border-primary/50" : "bg-accent/15 text-accent border-accent/50"}`}>
          {isBusy ? "On mission" : "Available now"}
        </span>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Calendar className="h-4 w-4 text-accent" /> Current schedule</h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming missions. Drone is free for assignment.</p>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((m: Mission) => (
                <li key={m.id} className="rounded-lg border border-border/60 bg-card p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{m.service} · {farmName(m.farm_id)}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-primary/20 text-primary border-primary/50 capitalize">{m.status.replace("_", " ")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    <Clock className="h-3 w-3" /> {m.scheduled_at ? new Date(m.scheduled_at).toLocaleString() : "Unscheduled"}
                    <span>· Pilot {pilotName(m.pilot_id)}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Activity className="h-4 w-4 text-accent" /> Recent history</h3>
          {past.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed missions yet.</p>
          ) : (
            <ul className="space-y-2">
              {past.slice(0, 6).map((m) => (
                <li key={m.id} className="text-xs text-muted-foreground border-b border-border/40 pb-2">
                  <div className="text-foreground">{m.service} · {farmName(m.farm_id)}</div>
                  <div>{new Date(m.created_at).toLocaleString()} · {m.status}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
