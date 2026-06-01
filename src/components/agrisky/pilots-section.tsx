import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Smartphone, Plus, Phone, RefreshCw, CheckCircle2, User2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { listPilots, createPilot, type Pilot } from "@/lib/cloud-api";

export function PilotsSection() {
  const qc = useQueryClient();
  const { data: pilots = [], isLoading, refetch } = useQuery({ queryKey: ["pilots"], queryFn: listPilots });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const m = useMutation({
    mutationFn: createPilot,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pilots"] });
      setOpen(false); setName(""); setPhone("");
      toast.success("Pilot added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = () => {
    if (name.trim().length < 2) return toast.error("Enter pilot name");
    if (phone.replace(/\D/g, "").length !== 10) return toast.error("Enter a 10-digit mobile");
    m.mutate({ name: name.trim(), phone });
  };

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Pilots</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Pilots registered in Lovable Cloud. Their mobile number is the bridge to the AgriSky Pilot App.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh</Button>
          <Button className="bg-gradient-agri text-primary-foreground" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Pilot</Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-gradient-card shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading pilots…</div>
        ) : pilots.length === 0 ? (
          <div className="p-10 text-center">
            <User2 className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No pilots yet. Add your first pilot to enable mobile-app sign-in.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>{["Name", "Mobile", "Status", "Added", "Mobile OTP (demo)"].map(h => <th key={h} className="text-left font-medium px-4 py-3">{h}</th>)}</tr>
              </thead>
              <tbody>
                {pilots.map((p: Pilot) => (
                  <tr key={p.id} className="border-t border-border/60">
                    <td className="px-4 py-3 font-medium flex items-center gap-2"><span className="grid place-items-center h-7 w-7 rounded-full bg-primary/15 text-primary text-xs font-semibold">{p.name.slice(0,2).toUpperCase()}</span>{p.name}</td>
                    <td className="px-4 py-3 text-muted-foreground"><span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {p.phone}</span></td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full border bg-accent/15 text-accent border-accent/30 capitalize">{p.status}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(p.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground"><code className="px-1.5 py-0.5 rounded bg-muted">{p.phone.slice(-5)}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add pilot</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Karthik R." />
            </div>
            <div className="space-y-1.5">
              <Label>Mobile number</Label>
              <Input inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0,10))} placeholder="10-digit mobile" />
            </div>
            <p className="text-xs text-muted-foreground flex items-start gap-1.5"><Smartphone className="h-3 w-3 mt-0.5" /> The pilot signs into the mobile app with this number. Demo OTP = last 5 digits.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={m.isPending} className="bg-gradient-agri text-primary-foreground">
              {m.isPending ? "Adding…" : <><CheckCircle2 className="h-4 w-4 mr-1" /> Add Pilot</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
