import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, ExternalLink, Pencil, Search, Sparkles, X } from "lucide-react";
import { RamanBrand, RamanFrame } from "@/components/raman/RamanFrame";
import { Btn, Card, ErrorNote, ViaProvider } from "@/components/raman/ui";
import { ramanApi } from "@/lib/raman/ramanBrowserApi";
import type { RamanPropellerRow } from "@/lib/raman/ramanPersistence";

// Raman propeller DB admin (spec §0.3): list, search, edit; Load runs a
// Claude research call with web search and saves what it finds as
// unverified with source links; a team member then verifies or rejects.
export const Route = createFileRoute("/mission-hub/raman/propellers")({
  component: PropellerDbPage,
});

const STATUS_STYLE: Record<RamanPropellerRow["status"], { bg: string; color: string }> = {
  unverified: { bg: "#FFF7E8", color: "#8A5A00" },
  verified: { bg: "#E8F6E8", color: "#006300" },
  rejected: { bg: "#FDECEC", color: "#A32323" },
};

const EDIT_FIELDS: { key: keyof RamanPropellerRow; label: string; numeric?: boolean }[] = [
  { key: "brand", label: "Brand" },
  { key: "model", label: "Model" },
  { key: "diameter_in", label: "Diameter (in)", numeric: true },
  { key: "pitch_in", label: "Pitch (in)", numeric: true },
  { key: "blade_count", label: "Blades", numeric: true },
  { key: "chord_075_over_r", label: "Chord at 0.75R / R", numeric: true },
  { key: "source_url", label: "Source URL" },
];

function EditRow({ prop, onSaved, onCancel }: { prop: Partial<RamanPropellerRow>; onSaved: () => void; onCancel: () => void }) {
  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(EDIT_FIELDS.map((f) => [f.key, prop[f.key] == null ? "" : String(prop[f.key])])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = prop.id ? { id: prop.id } : {};
      for (const f of EDIT_FIELDS) body[f.key] = f.numeric ? (form[f.key] === "" ? null : Number(form[f.key])) : form[f.key];
      await ramanApi.saveProp(body);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-lg p-3" style={{ background: "#F2F7FB" }}>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {EDIT_FIELDS.map((f) => (
          <label key={f.key} className="text-sm">
            {f.label}
            <input className="rmn-input mt-1" inputMode={f.numeric ? "decimal" : undefined} value={form[f.key]} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))} />
          </label>
        ))}
      </div>
      {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
      <div className="mt-3 flex gap-2">
        <Btn kind="navy" onClick={save} disabled={busy || !form.brand.trim() || !form.model.trim()}>Save</Btn>
        <Btn kind="ghost" style={{ color: "var(--rmn-ink)" }} onClick={onCancel}>Cancel</Btn>
      </div>
    </div>
  );
}

function PropellerDbPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<RamanPropellerRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadNote, setLoadNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await ramanApi.propellers(search, status));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [search, status]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  const research = async () => {
    setLoading(true);
    setLoadNote(null);
    setError(null);
    try {
      const res = await ramanApi.loadProps(query);
      setLoadNote(
        `Saved ${res.saved.length} unverified entr${res.saved.length === 1 ? "y" : "ies"}.` +
          (res.skipped.length ? ` Skipped: ${res.skipped.join("; ")}.` : ""),
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const decide = async (id: string, s: "verified" | "rejected" | "unverified") => {
    try {
      await ramanApi.saveProp({ id, status: s });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <RamanFrame title="Ask Raman · Propeller DB">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <RamanBrand />
        <Link to="/mission-hub/raman" className="inline-flex items-center gap-1.5 text-sm" style={{ color: "var(--rmn-on-navy-dim)" }}>
          <ArrowLeft className="h-4 w-4" /> Customers
        </Link>
      </div>
      <h2 className="mt-5 text-2xl font-semibold">Propeller database</h2>
      <p className="text-sm" style={{ color: "var(--rmn-on-navy-dim)" }}>
        Only verified entries appear in the Tab 1 propeller picker. Loaded entries stay unverified until a team member approves them.
      </p>

      <Card className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">Load</h3>
          <ViaProvider provider="anthropic" />
        </div>
        <p className="rmn-label">
          Claude searches the web for specs and returns them with source links. Entries whose source wasn't in the search results are skipped.
          Load always uses Claude, whatever the AI Providers order: it needs Anthropic's web search to return real source links.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input className="rmn-input min-w-[240px] flex-1" placeholder="e.g. T-Motor 13 inch carbon propellers" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Propellers to research" />
          <Btn kind="accent" onClick={research} disabled={loading || !query.trim()}>
            <Sparkles className="h-4 w-4" /> {loading ? "Researching… (up to a minute)" : "Load"}
          </Btn>
        </div>
        {loadNote && <p className="mt-2 text-sm">{loadNote}</p>}
      </Card>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--rmn-dim)" }} aria-hidden="true" />
          <input className="rmn-input pl-9" placeholder="Search brand or model" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search propellers" />
        </div>
        <select className="rmn-input w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status filter">
          <option value="">All statuses</option>
          <option value="unverified">Unverified</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
        <Btn kind="accent" onClick={() => setEditing("new")}>Add manually</Btn>
      </div>
      {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}

      <Card className="mt-4">
        {editing === "new" && (
          <div className="mb-4">
            <EditRow prop={{}} onSaved={() => { setEditing(null); void load(); }} onCancel={() => setEditing(null)} />
          </div>
        )}
        {rows === null ? (
          <p className="rmn-label">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="rmn-label">No propellers yet. Use Load or Add manually.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="rmn-table">
              <thead>
                <tr><th>Brand / model</th><th>Diameter</th><th>Pitch</th><th>Blades</th><th>Chord</th><th>Source</th><th>Status</th><th /></tr>
              </thead>
              <tbody>
                {rows.map((p) =>
                  editing === p.id ? (
                    <tr key={p.id}>
                      <td colSpan={8}>
                        <EditRow prop={p} onSaved={() => { setEditing(null); void load(); }} onCancel={() => setEditing(null)} />
                      </td>
                    </tr>
                  ) : (
                    <tr key={p.id}>
                      <td className="font-medium">
                        {p.brand} {p.model}
                        <div className="rmn-label">{p.loaded_via === "llm" ? "Loaded via Claude" : "Manual"}{p.verified_at ? ` · decided ${new Date(p.verified_at).toLocaleDateString("en-GB")}` : ""}</div>
                      </td>
                      <td>{p.diameter_in ?? "--"} in</td>
                      <td>{p.pitch_in ?? "--"} in</td>
                      <td>{p.blade_count ?? "--"}</td>
                      <td>{p.chord_075_over_r ?? "--"}</td>
                      <td>
                        {p.source_url ? (
                          <a href={p.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
                            link <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : "--"}
                      </td>
                      <td>
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: STATUS_STYLE[p.status].bg, color: STATUS_STYLE[p.status].color }}>
                          {p.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-right">
                        <button type="button" className="mr-2 inline-flex" title="Edit" aria-label="Edit" onClick={() => setEditing(p.id)}><Pencil className="h-4 w-4" /></button>
                        {p.status !== "verified" && (
                          <button type="button" className="mr-2 inline-flex items-center gap-1 text-xs font-medium" style={{ color: "var(--rmn-pass-ink)" }} onClick={() => decide(p.id, "verified")}>
                            <Check className="h-4 w-4" /> Verify
                          </button>
                        )}
                        {p.status !== "rejected" && (
                          <button type="button" className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: "var(--rmn-fail-ink)" }} onClick={() => decide(p.id, "rejected")}>
                            <X className="h-4 w-4" /> Reject
                          </button>
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </RamanFrame>
  );
}
