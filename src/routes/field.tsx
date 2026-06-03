import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import {
  Plane, Leaf, Camera, CheckCircle2, MapPin, ArrowLeft, Loader2, Smartphone,
  Image as ImageIcon, Upload,
} from "lucide-react";
import {
  getPilotByPhone, listMissionsForPilot, listFarms, uploadFieldPhoto,
  listFieldUploadsForFarm,
  type Pilot, type Mission, type Farm,
} from "@/lib/cloud-api";

export const Route = createFileRoute("/field")({
  head: () => ({
    meta: [
      { title: "AgriSky Field — Pilot" },
      { name: "description", content: "AgriSky Field for pilots. View missions, capture GPS-tagged farm photos, and sync data to the Control Center." },
      { property: "og:title", content: "AgriSky Field — Pilot" },
      { property: "og:description", content: "AgriSky Field for pilots. View missions, capture GPS-tagged farm photos, and sync data to the Control Center." },
    ],
    links: [
      { rel: "canonical", href: "/field" },
    ],
  }),
  component: FieldApp,
});

type View = "login" | "missions" | "capture";

function FieldApp() {
  const [pilot, setPilot] = useState<Pilot | null>(() => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(localStorage.getItem("field-pilot") || "null"); } catch { return null; }
  });
  const [view, setView] = useState<View>(pilot ? "missions" : "login");
  const [activeMission, setActiveMission] = useState<Mission | null>(null);

  useEffect(() => {
    if (pilot) localStorage.setItem("field-pilot", JSON.stringify(pilot));
    else localStorage.removeItem("field-pilot");
  }, [pilot]);

  return (
    <div className="min-h-screen bg-gradient-hero text-foreground">
      <Toaster richColors position="top-center" theme="dark" />
      <div className="mx-auto max-w-md min-h-screen flex flex-col">
        <header className="sticky top-0 z-30 backdrop-blur bg-background/60 border-b border-border/60 px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid place-items-center h-8 w-8 rounded-lg bg-gradient-primary shadow-glow"><Plane className="h-4 w-4 text-primary-foreground" /></span>
            <div className="leading-none">
              <div className="text-sm font-display font-semibold">AgriSky Field</div>
              <div className="text-[10px] text-muted-foreground">Pilot mobile</div>
            </div>
          </Link>
          {pilot && (
            <button onClick={() => { setPilot(null); setView("login"); }} className="text-[11px] text-muted-foreground">Sign out</button>
          )}
        </header>
        <main className="flex-1 p-4">
          {view === "login" && <Login onLogin={(p) => { setPilot(p); setView("missions"); }} />}
          {view === "missions" && pilot && (
            <Missions pilot={pilot} onPick={(m) => { setActiveMission(m); setView("capture"); }} />
          )}
          {view === "capture" && pilot && activeMission && (
            <Capture pilot={pilot} mission={activeMission} onBack={() => setView("missions")} />
          )}
        </main>
      </div>
    </div>
  );
}

function Login({ onLogin }: { onLogin: (p: Pilot) => void }) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const send = () => {
    if (phone.length !== 10) return toast.error("Enter a 10-digit mobile");
    setSent(true);
    toast.success("Demo OTP sent");
  };
  const verify = async () => {
    if (otp.length !== 5 || otp !== phone.slice(-5))
      return toast.error("Invalid OTP. Please enter the last 5 digits of your mobile number.");
    setLoading(true);
    try {
      const p = await getPilotByPhone(phone);
      if (!p) {
        toast.error("This mobile is not registered. Ask the Control Center to add you as a pilot.");
        setLoading(false);
        return;
      }
      toast.success(`Welcome, ${p.name}`);
      onLogin(p);
    } catch (e) {
      toast.error((e as Error).message);
      setLoading(false);
    }
  };

  return (
    <div className="pt-6">
      <div className="rounded-2xl border border-border/60 bg-gradient-card p-6 shadow-card">
        <div className="flex items-center gap-2 text-xs text-accent mb-3"><Leaf className="h-3.5 w-3.5" /> Field operations sign-in</div>
        <h1 className="text-xl font-semibold">Pilot login</h1>
        <p className="text-sm text-muted-foreground mt-1">Use the mobile number that the Control Center registered for you.</p>

        <label className="text-xs text-muted-foreground mt-5 block">Mobile number</label>
        <input
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="10-digit mobile"
          className="mt-1 w-full h-12 rounded-lg bg-input/40 border border-border/60 px-3 text-base outline-none focus:ring-2 focus:ring-ring"
        />
        {!sent ? (
          <Button onClick={send} className="mt-4 w-full h-12 bg-gradient-primary text-primary-foreground">Send OTP</Button>
        ) : (
          <>
            <label className="text-xs text-muted-foreground mt-4 block">Enter OTP</label>
            <input
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 5))}
              placeholder="5-digit OTP"
              className="mt-1 w-full h-12 rounded-lg bg-input/40 border border-border/60 px-3 text-center text-lg tracking-[0.5em] font-mono outline-none focus:ring-2 focus:ring-ring"
            />
            <Button onClick={verify} disabled={loading} className="mt-4 w-full h-12 bg-gradient-agri text-primary-foreground">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Login"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function Missions({ pilot, onPick }: { pilot: Pilot; onPick: (m: Mission) => void }) {
  const { data: missions = [], isLoading } = useQuery({
    queryKey: ["field-missions", pilot.id],
    queryFn: () => listMissionsForPilot(pilot.id),
    refetchInterval: 5000,
  });
  const { data: farms = [] } = useQuery({ queryKey: ["farms"], queryFn: listFarms });
  const farmOf = (id: string) => farms.find((f: Farm) => f.id === id);

  return (
    <div className="space-y-4 pt-2">
      <div>
        <p className="text-xs text-muted-foreground">Welcome back</p>
        <h1 className="text-2xl font-semibold">Hi, {pilot.name} 👋</h1>
        <p className="text-sm text-muted-foreground">Your assigned missions from the Control Center.</p>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-sm text-muted-foreground">Loading missions…</div>
      ) : missions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center">
          <Leaf className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No missions assigned yet. The Control Center will assign farms to you here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {missions.map((m) => {
            const f = farmOf(m.farm_id);
            return (
              <button key={m.id} onClick={() => onPick(m)} className="w-full text-left rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-muted-foreground">{m.service}</div>
                    <div className="font-semibold">{f?.name || "Farm"}</div>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-full border bg-primary/15 text-primary border-primary/30 capitalize">{m.status.replace("_", " ")}</span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                  {f?.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{f.location}</span>}
                  {f?.crop && <span>{f.crop}</span>}
                </div>
                <div className="mt-3 text-xs text-accent flex items-center gap-1"><Camera className="h-3 w-3" /> Tap to capture photo</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Capture({ pilot, mission, onBack }: { pilot: Pilot; mission: Mission; onBack: () => void }) {
  const qc = useQueryClient();
  const { data: farms = [] } = useQuery({ queryKey: ["farms"], queryFn: listFarms });
  const farm = farms.find((f: Farm) => f.id === mission.farm_id);
  const { data: uploads = [], refetch } = useQuery({
    queryKey: ["uploads", mission.farm_id],
    queryFn: () => listFieldUploadsForFarm(mission.farm_id),
  });

  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, []);

  const onPick = (f: File | null) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const up = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Pick a photo first");
      return uploadFieldPhoto({
        file, missionId: mission.id, farmId: mission.farm_id,
        pilotId: pilot.id, lat: coords?.lat ?? null, lng: coords?.lng ?? null,
      });
    },
    onSuccess: () => {
      toast.success("Photo synced to Control Center");
      setFile(null); setPreview(null);
      refetch();
      qc.invalidateQueries({ queryKey: ["field-missions", pilot.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4 pt-2 pb-8">
      <button onClick={onBack} className="text-xs text-muted-foreground flex items-center gap-1"><ArrowLeft className="h-3 w-3" /> Back to missions</button>
      <h1 className="text-xl font-semibold">Field Photo Capture</h1>

      <div className="rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card">
        <div className="text-[11px] text-muted-foreground">{mission.service}</div>
        <h2 className="text-lg font-semibold">{farm?.name}</h2>
        <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-1">
          {farm?.location && <span><MapPin className="inline h-3 w-3 mr-1" />{farm.location}</span>}
          {coords && <span className="text-accent">GPS: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</span>}
        </p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Camera className="h-4 w-4 text-accent" /> Capture field photo</h3>
        <input
          ref={fileRef} type="file" accept="image/*" capture="environment"
          className="hidden" onChange={(e) => onPick(e.target.files?.[0] || null)}
        />
        {preview ? (
          <div className="space-y-3">
            <img src={preview} alt="Captured field photo preview" className="w-full rounded-lg border border-border/60" />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => { setFile(null); setPreview(null); }}>Retake</Button>
              <Button onClick={() => up.mutate()} disabled={up.isPending} className="bg-gradient-agri text-primary-foreground">
                {up.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4 mr-1" /> Push to Control Center</>}
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => fileRef.current?.click()} className="w-full h-14 bg-gradient-primary text-primary-foreground">
            <Camera className="h-5 w-5 mr-2" /> Open camera
          </Button>
        )}
        <p className="text-[11px] text-muted-foreground flex items-start gap-1"><Smartphone className="h-3 w-3 mt-0.5" /> On mobile this opens the camera. On desktop you can pick a file.</p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><ImageIcon className="h-4 w-4 text-accent" /> Already uploaded ({uploads.length})</h3>
        {uploads.length === 0 ? (
          <p className="text-xs text-muted-foreground">No photos yet for this farm.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {uploads.slice(0, 9).map((u) => (
              <img key={u.id} src={u.image_url} alt="" loading="lazy" className="aspect-square w-full object-cover rounded-md border border-border/60" />
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 text-xs flex items-start gap-2">
        <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
        Photos appear in real-time under this farm in the Control Center (Farms → {farm?.name}).
      </div>
    </div>
  );
}
