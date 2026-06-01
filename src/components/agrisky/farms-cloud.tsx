import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus, MapPin, Sprout, RefreshCw, ArrowLeft, Camera, Smartphone, ImageOff,
  CheckCircle2, Tractor, Eye, Plane,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listFarms, createFarm, listPilots, createMission, listMissionsForFarm,
  listFieldUploadsForFarm, SERVICES,
  type Farm, type Pilot, type Mission, type FieldUpload,
} from "@/lib/cloud-api";

export function FarmsCloudSection() {
  const [selected, setSelected] = useState<Farm | null>(null);
  if (selected) return <FarmDetail farm={selected} onBack={() => setSelected(null)} />;
  return <FarmsList onOpen={setSelected} />;
}

function FarmsList({ onOpen }: { onOpen: (f: Farm) => void }) {
  const qc = useQueryClient();
  const { data: farms = [], isLoading, refetch } = useQuery({ queryKey: ["farms"], queryFn: listFarms });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", farmer: "", location: "", size_acres: "", crop: "", service_needed: SERVICES[0] as string });

  const m = useMutation({
    mutationFn: createFarm,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["farms"] });
      setOpen(false);
      setForm({ name: "", farmer: "", location: "", size_acres: "", crop: "", service_needed: SERVICES[0] });
      toast.success("Farm added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = () => {
    if (!form.name.trim()) return toast.error("Enter farm name");
    m.mutate({
      name: form.name.trim(),
      farmer: form.farmer || undefined,
      location: form.location || undefined,
      size_acres: form.size_acres ? Number(form.size_acres) : undefined,
      crop: form.crop || undefined,
      service_needed: form.service_needed,
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Farms</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Add farms, pick the service needed, and assign a pilot. Field photos from the mobile app appear under each farm.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh</Button>
          <Button className="bg-gradient-agri text-primary-foreground" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Farm</Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-gradient-card shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading farms…</div>
        ) : farms.length === 0 ? (
          <div className="p-10 text-center">
            <Tractor className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No farms yet. Add a farm to start the demo flow.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>{["Farm", "Farmer", "Location", "Size", "Crop", "Service needed", ""].map(h => <th key={h} className="text-left font-medium px-4 py-3">{h}</th>)}</tr>
              </thead>
              <tbody>
                {farms.map((f) => (
                  <tr key={f.id} className="border-t border-border/60 hover:bg-muted/20 cursor-pointer" onClick={() => onOpen(f)}>
                    <td className="px-4 py-3 font-medium">{f.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{f.farmer || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{f.location || "—"}</td>
                    <td className="px-4 py-3">{f.size_acres ? `${f.size_acres} ac` : "—"}</td>
                    <td className="px-4 py-3">{f.crop || "—"}</td>
                    <td className="px-4 py-3">{f.service_needed ? <span className="text-xs px-2 py-0.5 rounded-full border bg-accent/10 text-accent border-accent/30">{f.service_needed}</span> : "—"}</td>
                    <td className="px-4 py-3"><Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onOpen(f); }}><Eye className="h-3.5 w-3.5" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add farm</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Farm name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Arunamangala Farm" /></div>
              <div className="space-y-1.5"><Label>Farmer</Label><Input value={form.farmer} onChange={(e) => setForm({ ...form, farmer: e.target.value })} placeholder="Owner name" /></div>
              <div className="space-y-1.5"><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="District, State" /></div>
              <div className="space-y-1.5"><Label>Size (acres)</Label><Input inputMode="decimal" value={form.size_acres} onChange={(e) => setForm({ ...form, size_acres: e.target.value })} placeholder="2" /></div>
              <div className="space-y-1.5"><Label>Crop</Label><Input value={form.crop} onChange={(e) => setForm({ ...form, crop: e.target.value })} placeholder="Mixed vegetables" /></div>
              <div className="space-y-1.5">
                <Label>Service needed</Label>
                <Select value={form.service_needed} onValueChange={(v) => setForm({ ...form, service_needed: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={m.isPending} className="bg-gradient-agri text-primary-foreground">{m.isPending ? "Adding…" : "Add Farm"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FarmDetail({ farm, onBack }: { farm: Farm; onBack: () => void }) {
  const qc = useQueryClient();
  const { data: pilots = [] } = useQuery({ queryKey: ["pilots"], queryFn: listPilots });
  const { data: missions = [], refetch: refetchMissions } = useQuery({
    queryKey: ["missions", farm.id],
    queryFn: () => listMissionsForFarm(farm.id),
  });
  const { data: uploads = [], refetch: refetchUploads } = useQuery({
    queryKey: ["uploads", farm.id],
    queryFn: () => listFieldUploadsForFarm(farm.id),
  });

  const [assignOpen, setAssignOpen] = useState(false);
  const [pilotId, setPilotId] = useState<string>("");
  const [service, setService] = useState<string>(farm.service_needed || SERVICES[0]);
  const [notes, setNotes] = useState("");

  // Realtime: new uploads for this farm
  useEffect(() => {
    const ch = supabase
      .channel(`farm-uploads-${farm.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "field_uploads", filter: `farm_id=eq.${farm.id}` },
        () => {
          toast.success("📸 New photo synced from the field");
          refetchUploads();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "missions", filter: `farm_id=eq.${farm.id}` },
        () => refetchMissions()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [farm.id, refetchUploads, refetchMissions]);

  const create = useMutation({
    mutationFn: createMission,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["missions", farm.id] });
      setAssignOpen(false); setNotes("");
      toast.success("Mission created and pilot assigned");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assignedPilot = (mId: string | null) => pilots.find((p) => p.id === mId)?.name || "—";

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground mb-2 flex items-center gap-1"><ArrowLeft className="h-3 w-3" /> Back to Farms</button>
          <h1 className="text-2xl sm:text-3xl font-semibold">{farm.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground flex items-center gap-3 flex-wrap">
            {farm.farmer && <span><Tractor className="inline h-3.5 w-3.5 mr-1" />{farm.farmer}</span>}
            {farm.location && <span><MapPin className="inline h-3.5 w-3.5 mr-1" />{farm.location}</span>}
            {farm.crop && <span><Sprout className="inline h-3.5 w-3.5 mr-1" />{farm.crop}</span>}
            {farm.service_needed && <span className="text-xs px-2 py-0.5 rounded-full border bg-accent/10 text-accent border-accent/30">{farm.service_needed}</span>}
          </p>
        </div>
        <Button className="bg-gradient-agri text-primary-foreground" onClick={() => setAssignOpen(true)}>
          <Plane className="h-4 w-4 mr-1" /> Assign Pilot / Create Mission
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2"><Camera className="h-4 w-4 text-accent" /> Field photos from pilot mobile app</h3>
            <span className="flex items-center gap-1.5 text-xs text-accent">
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-accent" /></span>
              Live
            </span>
          </div>
          {uploads.length === 0 ? (
            <div className="p-10 text-center border border-dashed border-border/60 rounded-xl">
              <ImageOff className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">No photos yet. Once the assigned pilot uploads from the mobile app, they appear here instantly.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {uploads.map((u: FieldUpload) => (
                <div key={u.id} className="rounded-lg overflow-hidden border border-border/60 bg-card">
                  <div className="aspect-[4/3] bg-muted overflow-hidden">
                    <img src={u.image_url} alt="Field upload" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="p-2 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1"><Smartphone className="h-3 w-3 text-accent" /> Uploaded {new Date(u.captured_at).toLocaleString()}</p>
                    <p className="text-muted-foreground/80">{pilots.find(p => p.id === u.pilot_id)?.name || "Pilot"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <h3 className="font-semibold mb-4">Missions</h3>
          {missions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No missions yet. Assign a pilot to start.</p>
          ) : (
            <ul className="space-y-3">
              {missions.map((m: Mission) => (
                <li key={m.id} className="rounded-lg border border-border/60 bg-card p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{m.service}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/30 capitalize">{m.status.replace("_", " ")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Pilot: {assignedPilot(m.pilot_id)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</p>
                  {m.notes && <p className="text-xs mt-1">{m.notes}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign pilot to {farm.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Pilot</Label>
              {pilots.length === 0 ? (
                <p className="text-xs text-destructive">No pilots available. Add a pilot first in the Pilots tab.</p>
              ) : (
                <Select value={pilotId} onValueChange={setPilotId}>
                  <SelectTrigger><SelectValue placeholder="Choose pilot" /></SelectTrigger>
                  <SelectContent>{pilots.map(p => <SelectItem key={p.id} value={p.id}>{p.name} · {p.phone}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Service</Label>
              <Select value={service} onValueChange={setService}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the pilot should know" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!pilotId) return toast.error("Pick a pilot");
                create.mutate({ farm_id: farm.id, pilot_id: pilotId, service, notes: notes || undefined });
              }}
              disabled={create.isPending || pilots.length === 0}
              className="bg-gradient-agri text-primary-foreground"
            >
              {create.isPending ? "Assigning…" : <><CheckCircle2 className="h-4 w-4 mr-1" /> Create Mission</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
