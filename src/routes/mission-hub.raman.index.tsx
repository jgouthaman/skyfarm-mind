import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Database, FolderOpen, Plus, RefreshCw, Search } from "lucide-react";
import { RamanFrame, RamanHero } from "@/components/raman/RamanFrame";
import { Btn, Card, ErrorNote, fmt } from "@/components/raman/ui";
import { ramanApi, type CustomerListItem } from "@/lib/raman/ramanBrowserApi";

// Mission Hub -> Upcoming Agents -> Raman: customer list (spec §0.5 "Login
// and customer selection"). Choosing a vehicle opens its latest engagement
// at the furthest tab reached; New cycle starts the next version.
export const Route = createFileRoute("/mission-hub/raman/")({
  component: RamanCustomersPage,
});

const VEHICLE_TYPES = [
  { value: "multirotor", label: "Multirotor" },
  { value: "vtol", label: "VTOL (Spiral 4)" },
  { value: "fixed_wing", label: "Fixed-wing (Spiral 4)" },
];

function NewCustomerForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await ramanApi.createCustomer(form);
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <h3 className="font-semibold">New customer</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(["name", "company", "email", "phone"] as const).map((k) => (
          <label key={k} className="text-sm capitalize">
            {k}{k === "name" ? " *" : ""}
            <input className="rmn-input mt-1" value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
          </label>
        ))}
      </div>
      <label className="mt-3 block text-sm">
        Notes
        <textarea className="rmn-input mt-1" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
      </label>
      {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
      <Btn kind="accent" className="mt-3" onClick={save} disabled={busy || !form.name.trim()}>Save customer</Btn>
    </Card>
  );
}

function NewVehicleForm({ customerId, onCreated }: { customerId: string; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", vehicle_type: "multirotor", layout: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await ramanApi.createVehicle({ customer_id: customerId, ...form, vehicle_type: form.vehicle_type as "multirotor" });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-3 rounded-lg p-3" style={{ background: "#F2F7FB" }}>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          Vehicle name *
          <input className="rmn-input mt-1" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </label>
        <label className="text-sm">
          Type
          <select className="rmn-input mt-1" value={form.vehicle_type} onChange={(e) => setForm((f) => ({ ...f, vehicle_type: e.target.value }))}>
            {VEHICLE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Layout
          <input className="rmn-input mt-1" placeholder="quad, hexa, octo, coaxial" value={form.layout} onChange={(e) => setForm((f) => ({ ...f, layout: e.target.value }))} />
        </label>
      </div>
      {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
      <Btn kind="navy" className="mt-3" onClick={save} disabled={busy || !form.name.trim()}>Save vehicle</Btn>
    </div>
  );
}

function RamanCustomersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<CustomerListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [vehicleFormFor, setVehicleFormFor] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (q: string) => {
    try {
      setCustomers(await ramanApi.customers(q));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(search), 250);
    return () => clearTimeout(t);
  }, [search, load]);

  const openEngagement = (id: string) => navigate({ to: "/mission-hub/raman/$engagementId", params: { engagementId: id } });

  const newCycle = async (vehicleId: string) => {
    setBusy(vehicleId);
    try {
      const e = await ramanApi.startEngagement(vehicleId);
      openEngagement(e.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(null);
    }
  };

  return (
    <RamanFrame title="Ask Raman">
      <RamanHero
        right={
          <Link to="/mission-hub/raman/propellers" className="inline-flex items-center gap-1.5 text-sm" style={{ color: "var(--rmn-on-navy-dim)" }}>
            <Database className="h-4 w-4" /> Propeller DB
          </Link>
        }
      />
      <h2 className="mt-6 text-2xl font-semibold">Customers</h2>
      <p className="text-sm" style={{ color: "var(--rmn-on-navy-dim)" }}>Choose a vehicle to open its latest engagement at the furthest tab reached.</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--rmn-dim)" }} aria-hidden="true" />
          <input className="rmn-input pl-9" placeholder="Search name, company or email" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search customers" />
        </div>
        <Btn kind="accent" onClick={() => setShowNew((s) => !s)}><Plus className="h-4 w-4" /> New customer</Btn>
      </div>

      {showNew && (
        <div className="mt-4">
          <NewCustomerForm onCreated={() => { setShowNew(false); void load(search); }} />
        </div>
      )}
      {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}

      <div className="mt-4 space-y-3">
        {customers === null && <p style={{ color: "var(--rmn-on-navy-dim)" }}>Loading…</p>}
        {customers?.length === 0 && <Card><p className="text-sm">No customers yet. Add one with New customer.</p></Card>}
        {customers?.map((c) => (
          <Card key={c.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{c.name}</div>
                <div className="rmn-label">{[c.company, c.email, c.phone].filter(Boolean).join(" · ") || "No contact details"}</div>
              </div>
              <Btn kind="ghost" style={{ color: "var(--rmn-ink)" }} onClick={() => setVehicleFormFor((v) => (v === c.id ? null : c.id))}>
                <Plus className="h-4 w-4" /> New vehicle
              </Btn>
            </div>
            {vehicleFormFor === c.id && (
              <NewVehicleForm customerId={c.id} onCreated={() => { setVehicleFormFor(null); void load(search); }} />
            )}
            {c.raman_vehicles.length > 0 && (
              <div className="mt-3 overflow-x-auto">
              <table className="rmn-table">
                <thead>
                  <tr><th>Vehicle</th><th>Type</th><th>Latest cycle</th><th>Before</th><th>After</th><th /></tr>
                </thead>
                <tbody>
                  {c.raman_vehicles.map((v) => {
                    const latest = [...v.raman_engagements].sort((a, b) => b.cycle - a.cycle)[0];
                    return (
                      <tr key={v.id}>
                        <td className="font-medium">{v.name}{v.layout ? <span className="rmn-label"> · {v.layout}</span> : null}</td>
                        <td>{v.vehicle_type}</td>
                        <td>{latest ? `v${latest.cycle} · ${latest.status} · tab ${latest.furthest_tab}` : "--"}</td>
                        <td>{latest?.before_dba != null ? `${fmt(latest.before_dba)} dBA` : "--"}</td>
                        <td>{latest?.after_dba != null ? `${fmt(latest.after_dba)} dBA` : "--"}</td>
                        <td className="whitespace-nowrap text-right">
                          {latest && (
                            <Btn kind="navy" className="mr-2" onClick={() => openEngagement(latest.id)}><FolderOpen className="h-4 w-4" /> Open</Btn>
                          )}
                          <Btn kind="ghost" style={{ color: "var(--rmn-ink)" }} disabled={busy === v.id} onClick={() => newCycle(v.id)}>
                            <RefreshCw className="h-4 w-4" /> {latest ? "New cycle" : "Start v1"}
                          </Btn>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            )}
          </Card>
        ))}
      </div>
    </RamanFrame>
  );
}
