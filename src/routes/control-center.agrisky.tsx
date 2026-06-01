import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Plane, Leaf, LayoutDashboard, Tractor, ScanLine, Map as MapIcon, Droplets,
  Sprout, Activity, FileText, Settings, Bell, Search, ChevronDown, Plus,
  Upload, CheckCircle2, AlertTriangle, Clock, Play, Pause, X as XIcon,
  Download, Share2, Eye, PencilLine, Users, Package, Smartphone, RadioTower,
} from "lucide-react";
import { FieldSyncMonitor, MissionDetail, ACTIVE_MISSION_ID } from "@/components/agrisky/field-sync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

export const Route = createFileRoute("/control-center/agrisky")({
  head: () => ({ meta: [{ title: "AgriSky Control Center — AtomSky" }] }),
  component: AgriSky,
});

type TabId =
  | "overview" | "farms" | "survey" | "boundary" | "input"
  | "spraying" | "field-sync" | "activity" | "reports" | "settings";

const navItems: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "farms", label: "Farms", icon: Tractor },
  { id: "survey", label: "Aerial Survey", icon: ScanLine },
  { id: "boundary", label: "Boundary Mapping", icon: MapIcon },
  { id: "input", label: "Input Loading", icon: Droplets },
  { id: "spraying", label: "Spraying Missions", icon: Sprout },
  { id: "field-sync", label: "Field Sync Monitor", icon: RadioTower },
  { id: "activity", label: "Activity Log", icon: Activity },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
];

function AgriSky() {
  const [tab, setTab] = useState<TabId>("overview");
  const [openMission, setOpenMission] = useState<string | null>(null);
  const goMission = (id: string) => { setOpenMission(id); setTab("spraying"); };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Toaster richColors position="top-center" theme="dark" />

      {/* SIDEBAR */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border/60 bg-card/40 backdrop-blur sticky top-0 h-screen">
        <div className="h-16 flex items-center px-5 border-b border-border/60">
          <Link to="/control-center" className="flex items-center gap-2 font-display font-semibold">
            <span className="grid place-items-center h-8 w-8 rounded-lg bg-gradient-agri shadow-glow">
              <Leaf className="h-4 w-4 text-primary-foreground" />
            </span>
            <span>AgriSky</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((n) => {
            const Icon = n.icon;
            const active = tab === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active ? "bg-accent/15 text-accent border border-accent/30" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border/60">
          <Link to="/control-center" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground px-3 py-2">
            <Plane className="h-3.5 w-3.5" /> Back to AtomSky Hub
          </Link>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* TOP BAR */}
        <header className="h-16 border-b border-border/60 bg-card/40 backdrop-blur sticky top-0 z-30 flex items-center justify-between px-5 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="md:hidden">
              <Select value={tab} onValueChange={(v) => setTab(v as TabId)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {navItems.map(n => <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Select defaultValue="arunamangala">
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="arunamangala">Arunamangala Farm</SelectItem>
                <SelectItem value="green-valley">Green Valley Plot</SelectItem>
                <SelectItem value="organic-a">Organic Field A</SelectItem>
                <SelectItem value="all">All farms</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="7d">
              <SelectTrigger className="w-32 hidden sm:flex"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="season">This season</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-md hover:bg-muted relative" onClick={() => toast("3 new activities")}>
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
            </button>
            <div className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted cursor-pointer">
              <span className="grid place-items-center h-7 w-7 rounded-full bg-gradient-primary text-primary-foreground text-xs font-semibold">GT</span>
              <span className="hidden sm:block text-sm">Gouthaman</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>
        </header>

        <main className="flex-1 p-5 lg:p-8 max-w-[1400px] w-full mx-auto">
          {tab === "overview" && <Overview />}
          {tab === "farms" && <Farms />}
          {tab === "survey" && <Survey />}
          {tab === "boundary" && <Boundary />}
          {tab === "input" && <InputLoading />}
          {tab === "spraying" && <Spraying />}
          {tab === "activity" && <ActivityLog />}
          {tab === "reports" && <Reports />}
          {tab === "settings" && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}

/* ---------- shared ---------- */
function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function StatCard({ label, value, hint, icon: Icon, tone = "primary" }: { label: string; value: string; hint?: string; icon: React.ComponentType<{ className?: string }>; tone?: "primary" | "agri" }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className={`grid place-items-center h-9 w-9 rounded-lg border ${tone === "agri" ? "bg-accent/10 border-accent/30 text-accent" : "bg-primary/10 border-primary/20 text-primary"}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-4 text-2xl font-display font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
      {hint && <div className="mt-2 text-xs text-accent">{hint}</div>}
    </div>
  );
}

/* ---------- OVERVIEW ---------- */
function Overview() {
  return (
    <>
      <PageHeader
        title="AgriSky Control Center"
        subtitle="Farm aerial survey, crop zone mapping, input loading, spraying missions, and operational activity logs."
      />

      <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5 mb-6 flex flex-wrap items-center gap-4 justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-accent">Featured farm</p>
          <h3 className="mt-1 text-lg font-semibold">Arunamangala Farm · Gouthaman</h3>
          <p className="text-sm text-muted-foreground">Arunamangala, Tamil Nadu · 2 acres · Mixed vegetables and leafy greens</p>
        </div>
        <span className="px-3 py-1.5 rounded-full text-xs bg-accent/15 text-accent border border-accent/30">Monitoring Active</span>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Farms" value="3" icon={Tractor} />
        <StatCard label="Acres Monitored" value="10" icon={MapIcon} tone="agri" />
        <StatCard label="Surveys Completed" value="12" icon={ScanLine} />
        <StatCard label="Spraying Missions" value="8" icon={Sprout} tone="agri" />
        <StatCard label="Inputs Used (L)" value="64" icon={Droplets} />
        <StatCard label="Pending Activities" value="2" icon={Clock} />
      </div>

      <div className="mt-8 grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <h3 className="font-semibold mb-4">Recent activity</h3>
          <Timeline limit={5} />
        </div>
        <div className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <h3 className="font-semibold mb-4">Positioning</h3>
          <p className="text-sm text-muted-foreground">
            AgriSky Control Center helps drone operators, farm managers, and agronomists manage farm aerial surveys, mark boundaries and crop zones, record fertilizer and organic input loading, monitor spraying missions, and maintain a complete activity log for every farm operation.
          </p>
        </div>
      </div>
    </>
  );
}

/* ---------- FARMS ---------- */
const farmsData = [
  { name: "Arunamangala Farm", farmer: "Gouthaman", location: "Arunamangala, Tamil Nadu", size: "2 acres", crop: "Mixed vegetables", last: "22 May 2026", status: "Monitoring Active", tone: "active" },
  { name: "Green Valley Plot", farmer: "Farmer 2", location: "Tamil Nadu", size: "5 acres", crop: "Paddy", last: "Not Surveyed", status: "Pending", tone: "warn" },
  { name: "Organic Field A", farmer: "Farmer 3", location: "Tamil Nadu", size: "3 acres", crop: "Tomato", last: "20 May 2026", status: "Spraying Scheduled", tone: "info" },
];

function statusPill(tone: string) {
  if (tone === "active") return "bg-accent/15 text-accent border-accent/30";
  if (tone === "warn") return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
  if (tone === "info") return "bg-primary/15 text-primary border-primary/30";
  return "bg-muted text-muted-foreground border-border";
}

function Farms() {
  const [q, setQ] = useState("");
  const rows = useMemo(() => farmsData.filter(f => f.name.toLowerCase().includes(q.toLowerCase())), [q]);
  return (
    <>
      <PageHeader
        title="Farms"
        subtitle="Manage farm records, crop type, and monitoring status."
        action={<Button className="bg-gradient-agri text-primary-foreground" onClick={() => toast.success("Farm form opened")}><Plus className="h-4 w-4 mr-1" /> Add Farm</Button>}
      />
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search farms" className="pl-9" />
        </div>
        <Select defaultValue="all"><SelectTrigger className="w-44"><SelectValue placeholder="Crop type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All crop types</SelectItem>
            <SelectItem value="veg">Mixed vegetables</SelectItem>
            <SelectItem value="paddy">Paddy</SelectItem>
            <SelectItem value="tomato">Tomato</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="all"><SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Monitoring Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sched">Spraying Scheduled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border/60 bg-gradient-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                {["Farm Name","Farmer","Location","Size","Crop","Last Survey","Status","Action"].map(h => (
                  <th key={h} className="text-left font-medium px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className="border-t border-border/60 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.farmer}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.location}</td>
                  <td className="px-4 py-3">{r.size}</td>
                  <td className="px-4 py-3">{r.crop}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.last}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2.5 py-1 rounded-full border ${statusPill(r.tone)}`}>{r.status}</span></td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="ghost" onClick={() => toast(`Opened ${r.name}`)}><Eye className="h-3.5 w-3.5" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ---------- AERIAL SURVEY ---------- */
function Survey() {
  return (
    <>
      <PageHeader title="Aerial Survey" subtitle="Upload drone survey images, mark observations, and save survey records." />

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card">
            <div className="aspect-[16/9] rounded-xl border border-border/60 bg-muted/40 relative overflow-hidden grid place-items-center">
              <div className="absolute inset-0 grid-bg opacity-30" />
              <div className="relative text-center">
                <ScanLine className="h-10 w-10 mx-auto text-accent" />
                <p className="mt-3 text-sm text-muted-foreground">Aerial farm image preview — Arunamangala Farm</p>
                <p className="text-xs text-muted-foreground mt-1">Sample placeholder · 2 acres</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => toast.success("Survey uploaded successfully")}><Upload className="h-4 w-4 mr-1" /> Upload Images</Button>
              <Button variant="outline" onClick={() => toast("Boundary tool opened")}><MapIcon className="h-4 w-4 mr-1" /> Mark Boundary</Button>
              <Button variant="outline" onClick={() => toast("Observation added")}><Plus className="h-4 w-4 mr-1" /> Add Observation</Button>
              <Button variant="outline" className="bg-accent/10 border-accent/30 text-accent" onClick={() => toast.success("Survey saved")}><CheckCircle2 className="h-4 w-4 mr-1" /> Save Survey</Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card">
            <h3 className="font-semibold mb-3">Observations</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { t: "Crop growth variation observed", tone: "info" },
                { t: "Possible water stress area", tone: "warn" },
                { t: "Dense vegetation zone", tone: "active" },
                { t: "Empty patch / low growth patch", tone: "warn" },
              ].map((o) => (
                <div key={o.t} className="rounded-xl border border-border/60 bg-card p-4 flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{o.t}</p>
                    <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full border ${statusPill(o.tone)}`}>{o.tone === "warn" ? "Attention" : o.tone === "active" ? "Healthy" : "Note"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card space-y-4 h-fit">
          <h3 className="font-semibold">Survey details</h3>
          <div className="space-y-2"><Label>Farm</Label>
            <Select defaultValue="arun"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="arun">Arunamangala Farm</SelectItem><SelectItem value="gv">Green Valley Plot</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Survey date</Label><Input type="date" defaultValue="2026-05-22" /></div>
          <div className="space-y-2"><Label>Drone / Operator</Label><Input defaultValue="AS-Hex-01 · Operator 1" /></div>
          <div className="space-y-2"><Label>Survey notes</Label><Textarea rows={4} placeholder="Wind 8 km/h, clear sky, NDVI baseline captured." /></div>
        </div>
      </div>
    </>
  );
}

/* ---------- BOUNDARY ---------- */
const zones = [
  { id: "A", name: "Zone A", crop: "Tomato", area: "0.8 acre", health: "Healthy", tone: "active", irrigation: "Adequate" },
  { id: "B", name: "Zone B", crop: "Leafy Greens", area: "0.5 acre", health: "Water Stress", tone: "warn", irrigation: "Required" },
  { id: "C", name: "Zone C", crop: "Brinjal", area: "0.7 acre", health: "Pest Risk", tone: "warn", irrigation: "Adequate" },
];

function Boundary() {
  const [selected, setSelected] = useState("B");
  const zone = zones.find(z => z.id === selected)!;
  return (
    <>
      <PageHeader
        title="Boundary Mapping"
        subtitle="Draw farm boundary, mark internal crop zones, and record zone health."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => toast("Boundary cleared")}>Clear Boundary</Button>
            <Button variant="outline" onClick={() => toast.success("Zone added")}><Plus className="h-4 w-4 mr-1" /> Add Zone</Button>
            <Button className="bg-gradient-agri text-primary-foreground" onClick={() => toast.success("Boundary saved")}><CheckCircle2 className="h-4 w-4 mr-1" /> Save Boundary</Button>
          </div>
        }
      />
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <div className="aspect-[16/10] rounded-xl border border-border/60 bg-muted/40 relative overflow-hidden">
            <div className="absolute inset-0 grid-bg opacity-40" />
            {/* Mock boundary polygon */}
            <svg viewBox="0 0 800 500" className="absolute inset-0 w-full h-full">
              <polygon points="80,80 720,60 740,420 100,440" fill="oklch(0.7 0.13 165 / 0.08)" stroke="oklch(0.7 0.13 165)" strokeWidth="2" strokeDasharray="6 4" />
              {/* Zone A */}
              <polygon points="120,110 380,100 380,250 120,260" fill="oklch(0.7 0.13 165 / 0.18)" stroke="oklch(0.7 0.13 165)" strokeWidth="1.5" onClick={() => setSelected("A")} style={{ cursor: "pointer" }} />
              <text x="240" y="180" textAnchor="middle" fill="white" fontSize="14" fontWeight="600">Zone A</text>
              {/* Zone B */}
              <polygon points="400,100 700,90 700,250 400,250" fill="oklch(0.75 0.15 70 / 0.25)" stroke="oklch(0.75 0.15 70)" strokeWidth="1.5" onClick={() => setSelected("B")} style={{ cursor: "pointer" }} />
              <text x="550" y="180" textAnchor="middle" fill="white" fontSize="14" fontWeight="600">Zone B</text>
              {/* Zone C */}
              <polygon points="120,280 700,270 720,410 130,420" fill="oklch(0.65 0.2 30 / 0.2)" stroke="oklch(0.65 0.2 30)" strokeWidth="1.5" onClick={() => setSelected("C")} style={{ cursor: "pointer" }} />
              <text x="420" y="350" textAnchor="middle" fill="white" fontSize="14" fontWeight="600">Zone C</text>
            </svg>
            <div className="absolute bottom-3 left-3 text-xs text-muted-foreground bg-background/80 backdrop-blur px-2 py-1 rounded">
              Click a zone to view details
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {zones.map(z => (
              <button key={z.id} onClick={() => setSelected(z.id)} className={`px-3 py-1.5 rounded-lg text-xs border ${selected === z.id ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:text-foreground"}`}>
                {z.name} · {z.crop}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card space-y-3 h-fit">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Zone details</h3>
            <Button size="sm" variant="ghost" onClick={() => toast("Edit zone")}><PencilLine className="h-3.5 w-3.5" /></Button>
          </div>
          <div className="space-y-2"><Label>Zone Name</Label><Input value={zone.name} readOnly /></div>
          <div className="space-y-2"><Label>Crop Type</Label><Input value={zone.crop} readOnly /></div>
          <div className="space-y-2"><Label>Area</Label><Input value={zone.area} readOnly /></div>
          <div className="space-y-2"><Label>Health Status</Label>
            <Select value={zone.health}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Healthy","Water Stress","Pest Risk","Disease Suspected","Needs Inspection"].map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Irrigation Status</Label><Input value={zone.irrigation} readOnly /></div>
          <div className="space-y-2"><Label>Notes</Label><Textarea rows={3} placeholder="Spray neem oil within 24h." /></div>
        </div>
      </div>
    </>
  );
}

/* ---------- INPUT LOADING ---------- */
function InputLoading() {
  const checks = [
    "Correct input selected","Mixing ratio verified","Tank sealed","Nozzle checked",
    "Battery checked","Weather condition acceptable","Operator safety confirmed",
  ];
  return (
    <>
      <PageHeader title="Input Loading" subtitle="Record fertilizer, pesticide, and organic inputs loaded into the drone tank before spraying." />
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Select Farm</Label>
              <Select defaultValue="arun"><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="arun">Arunamangala Farm</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Select Zone</Label>
              <Select defaultValue="B"><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{zones.map(z => <SelectItem key={z.id} value={z.id}>{z.name} · {z.crop}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Input Name</Label><Input defaultValue="Neem Oil Solution" /></div>
            <div className="space-y-2"><Label>Input Type</Label>
              <Select defaultValue="organic"><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fert">Fertilizer</SelectItem>
                  <SelectItem value="organic">Organic Pesticide</SelectItem>
                  <SelectItem value="bio">Bio-Enzyme</SelectItem>
                  <SelectItem value="nut">Nutrient</SelectItem>
                  <SelectItem value="water">Water</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Quantity Loaded</Label><Input defaultValue="8" /></div>
            <div className="space-y-2"><Label>Unit</Label>
              <Select defaultValue="L"><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="L">Litres</SelectItem><SelectItem value="ml">Millilitres</SelectItem><SelectItem value="kg">Kg</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Mixing Ratio</Label><Input defaultValue="1:200" /></div>
            <div className="space-y-2"><Label>Tank Capacity</Label><Input defaultValue="10 L" /></div>
            <div className="space-y-2"><Label>Batch Number</Label><Input defaultValue="NMS-2026-0522" /></div>
            <div className="space-y-2"><Label>Loaded By</Label><Input defaultValue="Operator 1" /></div>
            <div className="space-y-2"><Label>Loading Time</Label><Input type="time" defaultValue="10:30" /></div>
          </div>
          <div className="space-y-2"><Label>Notes</Label><Textarea rows={3} placeholder="Loaded after stirring; tank purged before fill." /></div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button className="bg-gradient-agri text-primary-foreground" onClick={() => toast.success("Input loading saved")}><CheckCircle2 className="h-4 w-4 mr-1" /> Save Input Loading</Button>
            <Button variant="outline" onClick={() => toast.success("Spraying mission created")}><Sprout className="h-4 w-4 mr-1" /> Create Spraying Mission</Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card h-fit">
          <h3 className="font-semibold mb-3">Safety checklist</h3>
          <div className="space-y-2.5">
            {checks.map((c, i) => (
              <label key={c} className="flex items-center gap-2.5 text-sm">
                <Checkbox defaultChecked={i < 5} />
                <span>{c}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border/60 bg-gradient-card shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border/60"><h3 className="font-semibold">Recent input loading</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>{["Time","Farm","Zone","Input","Quantity","Loaded By","Status"].map(h => <th key={h} className="text-left font-medium px-4 py-3">{h}</th>)}</tr>
            </thead>
            <tbody>
              <tr className="border-t border-border/60">
                <td className="px-4 py-3">10:30 AM</td>
                <td className="px-4 py-3">Arunamangala Farm</td>
                <td className="px-4 py-3">Zone B</td>
                <td className="px-4 py-3">Neem Oil Solution</td>
                <td className="px-4 py-3">8 Litres</td>
                <td className="px-4 py-3">Operator 1</td>
                <td className="px-4 py-3"><span className={`text-xs px-2.5 py-1 rounded-full border ${statusPill("info")}`}>Ready for Spraying</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ---------- SPRAYING ---------- */
function Spraying() {
  return (
    <>
      <PageHeader
        title="Spraying Missions"
        subtitle="Schedule, monitor, and complete drone spraying missions for selected zones."
        action={<Button className="bg-gradient-agri text-primary-foreground" onClick={() => toast.success("Spraying mission created")}><Plus className="h-4 w-4 mr-1" /> New Mission</Button>}
      />

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <div className="aspect-[16/9] rounded-xl border border-border/60 bg-muted/40 relative overflow-hidden">
            <div className="absolute inset-0 grid-bg opacity-40" />
            <svg viewBox="0 0 800 450" className="absolute inset-0 w-full h-full">
              <rect x="100" y="80" width="600" height="290" fill="oklch(0.7 0.13 165 / 0.1)" stroke="oklch(0.7 0.13 165)" strokeWidth="2" rx="8" />
              <path d="M 140 120 L 660 120 L 660 160 L 140 160 L 140 200 L 660 200 L 660 240 L 140 240 L 140 280 L 660 280 L 660 320 L 140 320" fill="none" stroke="oklch(0.74 0.14 235)" strokeWidth="2.5" strokeDasharray="4 3" />
              <circle cx="660" cy="320" r="6" fill="oklch(0.74 0.14 235)" />
              <text x="400" y="60" textAnchor="middle" fill="white" fontSize="12" opacity="0.7">Zone B · Spray path</text>
            </svg>
          </div>
          <div className="mt-4 grid sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5"><span>Mission progress</span><span>62%</span></div>
              <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-gradient-agri" style={{ width: "62%" }} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div><p className="text-muted-foreground">Area covered</p><p className="font-semibold mt-1">0.31 ac</p></div>
              <div><p className="text-muted-foreground">Input used</p><p className="font-semibold mt-1">5 L</p></div>
              <div><p className="text-muted-foreground">Flight time</p><p className="font-semibold mt-1">14:20</p></div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button className="bg-gradient-agri text-primary-foreground" onClick={() => toast.success("Mission started")}><Play className="h-4 w-4 mr-1" /> Start Mission</Button>
            <Button variant="outline" onClick={() => toast("Mission paused")}><Pause className="h-4 w-4 mr-1" /> Pause</Button>
            <Button variant="outline" className="bg-accent/10 border-accent/30 text-accent" onClick={() => toast.success("Mission completed")}><CheckCircle2 className="h-4 w-4 mr-1" /> Complete</Button>
            <Button variant="outline" onClick={() => toast("Mission cancelled")}><XIcon className="h-4 w-4 mr-1" /> Cancel</Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card space-y-3 h-fit">
          <h3 className="font-semibold">Active mission</h3>
          <Field label="Farm" value="Arunamangala Farm" />
          <Field label="Zone" value="Zone B · Leafy Greens" />
          <Field label="Input" value="Neem Oil Solution · 8 L" />
          <Field label="Operator" value="Operator 1" />
          <Field label="Area" value="0.5 acre" />
          <Field label="Est. duration" value="22 min" />
          <div>
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <span className={`text-xs px-2.5 py-1 rounded-full border ${statusPill("info")}`}>Ready for Flight</span>
          </div>
          <div className="space-y-2"><Label>Operator notes</Label><Textarea rows={3} placeholder="Wind low, ready to launch." /></div>
        </div>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm border-b border-border/40 pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

/* ---------- ACTIVITY LOG ---------- */
const activities = [
  { time: "10:05 AM", user: "Operator 1", farm: "Arunamangala Farm", type: "Survey Uploaded", desc: "Drone survey image uploaded", status: "Completed", tone: "active" },
  { time: "10:12 AM", user: "Operator 1", farm: "Arunamangala Farm", type: "Boundary Marked", desc: "Farm boundary marked", status: "Completed", tone: "active" },
  { time: "10:20 AM", user: "Agronomist", farm: "Arunamangala Farm", type: "Zone Updated", desc: "Zone B marked as water stress area", status: "Completed", tone: "active" },
  { time: "10:30 AM", user: "Operator 1", farm: "Arunamangala Farm", type: "Input Loaded", desc: "Neem Oil Solution loaded, 8 litres", status: "Ready", tone: "info" },
  { time: "10:45 AM", user: "Operator 1", farm: "Arunamangala Farm", type: "Spraying Started", desc: "Spraying mission started for Zone B", status: "In Progress", tone: "info" },
  { time: "11:05 AM", user: "Operator 1", farm: "Arunamangala Farm", type: "Spraying Completed", desc: "Spraying mission completed", status: "Completed", tone: "active" },
  { time: "11:10 AM", user: "Farm Manager", farm: "Arunamangala Farm", type: "Report Generated", desc: "Farmer report generated", status: "Completed", tone: "active" },
];

function Timeline({ limit }: { limit?: number }) {
  const items = limit ? activities.slice(-limit).reverse() : activities;
  return (
    <ol className="relative border-l border-border/60 ml-2 space-y-4">
      {items.map((a, i) => (
        <li key={i} className="pl-5 relative">
          <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-accent border-2 border-background" />
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-xs text-muted-foreground">{a.time}</span>
            <span className="text-xs px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/30">{a.type}</span>
          </div>
          <p className="text-sm mt-1">{a.desc}</p>
        </li>
      ))}
    </ol>
  );
}

function ActivityLog() {
  return (
    <>
      <PageHeader title="Activity Log" subtitle="Every major action across farms, surveys, inputs, and missions." />

      <div className="flex flex-wrap gap-3 mb-4">
        <Select defaultValue="all"><SelectTrigger className="w-44"><SelectValue placeholder="Farm" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All farms</SelectItem><SelectItem value="arun">Arunamangala</SelectItem></SelectContent>
        </Select>
        <Select defaultValue="all"><SelectTrigger className="w-44"><SelectValue placeholder="Activity Type" /></SelectTrigger>
          <SelectContent>
            {["all","Farm Created","Survey Uploaded","Boundary Marked","Zone Updated","Input Loaded","Spraying Started","Spraying Completed","Report Generated","Alert Raised","Notes Added"].map(v => <SelectItem key={v} value={v}>{v === "all" ? "All activity types" : v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" className="w-44" defaultValue="2026-05-22" />
        <Select defaultValue="all"><SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All status</SelectItem><SelectItem value="done">Completed</SelectItem><SelectItem value="prog">In Progress</SelectItem></SelectContent>
        </Select>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <h3 className="font-semibold mb-4">Timeline</h3>
          <Timeline />
        </div>
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-gradient-card shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>{["Time","User","Farm","Type","Description","Status","Action"].map(h => <th key={h} className="text-left font-medium px-4 py-3">{h}</th>)}</tr>
              </thead>
              <tbody>
                {activities.map((a, i) => (
                  <tr key={i} className="border-t border-border/60">
                    <td className="px-4 py-3 whitespace-nowrap">{a.time}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.user}</td>
                    <td className="px-4 py-3">{a.farm}</td>
                    <td className="px-4 py-3">{a.type}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.desc}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2.5 py-1 rounded-full border ${statusPill(a.tone)}`}>{a.status}</span></td>
                    <td className="px-4 py-3"><Button size="sm" variant="ghost" onClick={() => toast("Activity opened")}><Eye className="h-3.5 w-3.5" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- REPORTS ---------- */
function Reports() {
  const types = [
    { t: "Farm Survey Report", icon: ScanLine },
    { t: "Spraying Report", icon: Sprout },
    { t: "Input Usage Report", icon: Droplets },
    { t: "Activity Log Report", icon: Activity },
  ];
  return (
    <>
      <PageHeader title="Reports" subtitle="Generate and share farm reports across surveys, spraying, inputs, and activity." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {types.map(({ t, icon: Icon }) => (
          <div key={t} className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card">
            <span className="grid place-items-center h-10 w-10 rounded-lg bg-accent/10 border border-accent/30 text-accent"><Icon className="h-4 w-4" /></span>
            <h3 className="mt-3 font-semibold text-sm">{t}</h3>
            <Button size="sm" className="mt-3 w-full bg-gradient-agri text-primary-foreground" onClick={() => toast.success("Report generated")}>Generate Report</Button>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card">
        <h3 className="font-semibold mb-4">Recent reports</h3>
        <div className="rounded-xl border border-border/60 bg-card p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">Arunamangala Farm — Crop Health & Spraying Report</p>
            <p className="text-xs text-muted-foreground mt-1">Farm: Arunamangala · Type: Combined · Date range: May 2026 · Generated by: Farm Manager</p>
            <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full border ${statusPill("active")}`}>Ready</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => toast("Opened report")}><Eye className="h-3.5 w-3.5 mr-1" /> View</Button>
            <Button size="sm" variant="outline" onClick={() => toast.success("PDF download started")}><Download className="h-3.5 w-3.5 mr-1" /> PDF</Button>
            <Button size="sm" variant="outline" onClick={() => toast.success("Shared on WhatsApp")}><Share2 className="h-3.5 w-3.5 mr-1" /> WhatsApp</Button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- SETTINGS ---------- */
function SettingsPage() {
  const sections = [
    { t: "Farm settings", d: "Default crop calendars, units, and farm metadata.", icon: Tractor },
    { t: "Drone / operator settings", d: "Drone fleet, operator profiles, and flight defaults.", icon: Plane },
    { t: "Input library", d: "Manage fertilizers, organic inputs, and mixing ratios.", icon: Package },
    { t: "Crop library", d: "Crops, growth stages, and recommended workflows.", icon: Sprout },
    { t: "User roles", d: "Admin, Farm Manager, Drone Operator, Agronomist, Viewer.", icon: Users },
    { t: "Notification settings", d: "Alerts via in-app, email, and WhatsApp.", icon: Bell },
  ];
  return (
    <>
      <PageHeader title="Settings" subtitle="Configure AgriSky Control Center for your team and operations." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map(({ t, d, icon: Icon }) => (
          <div key={t} className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card">
            <span className="grid place-items-center h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 text-primary"><Icon className="h-4 w-4" /></span>
            <h3 className="mt-3 font-semibold">{t}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            <Button size="sm" variant="outline" className="mt-4" onClick={() => toast(`${t} opened`)}>Manage</Button>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card">
        <h3 className="font-semibold mb-3">User roles</h3>
        <div className="flex flex-wrap gap-2">
          {["Admin","Farm Manager","Drone Operator","Agronomist","Viewer"].map(r => (
            <span key={r} className="text-xs px-2.5 py-1 rounded-full border bg-primary/10 text-primary border-primary/30">{r}</span>
          ))}
        </div>
      </div>
    </>
  );
}
