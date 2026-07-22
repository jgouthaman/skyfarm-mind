import { useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MhCard } from "./Shell";
import { SlidePanel, Field } from "./SlidePanel";

export type ColumnDef = {
  key: string;
  label: string;
  render?: (row: any) => React.ReactNode;
};

type Props = {
  table: "destud_waitlist" | "destud_users" | "contacts";
  title?: string;
  searchFields: string[];
  columns: ColumnDef[];
  filters?: { key: string; label: string; options: { value: string; label: string }[] }[];
  statusOptions?: { value: string; label: string; color: string; bg: string }[];
  showStatus?: boolean;
  detailFields: { key: string; label: string }[];
  csvFilename: string;
  initialFilters?: Record<string, string>;
};

const PAGE_SIZE = 20;

export function RecordsTable({
  table, title, searchFields, columns, filters = [], statusOptions = [], showStatus = true, detailFields, csvFilename, initialFilters = {},
}: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>(initialFilters);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(0); }, [debounced, filterValues, statusFilter, dateFrom, dateTo]);

  async function load() {
    setLoading(true);
    let q: any = supabase.from(table as any).select("*", { count: "exact" }).order("created_at", { ascending: false });
    if (debounced) {
      const ors = searchFields.map((f) => `${f}.ilike.%${debounced}%`).join(",");
      q = q.or(ors);
    }
    for (const [k, v] of Object.entries(filterValues)) if (v) q = q.eq(k, v);
    if (statusFilter) q = q.eq("status", statusFilter);
    if (dateFrom) q = q.gte("created_at", dateFrom);
    if (dateTo) q = q.lte("created_at", `${dateTo}T23:59:59`);
    q = q.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    const { data, count: c, error } = await q;
    if (error) toast.error(error.message);
    setRows((data as any) ?? []);
    setCount(c ?? 0);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, filterValues, statusFilter, dateFrom, dateTo, page, table]);

  async function updateStatus(id: string, newStatus: string) {
    if (table === "destud_waitlist" && newStatus === "converted") {
      if (!window.confirm("Convert this entry to a DeStud user? This moves it out of the waitlist.")) return;
      const { error } = await supabase.rpc("convert_destud_waitlist_entry" as any, { p_id: id } as any);
      if (error) { toast.error(error.message); return; }
      toast.success("Converted to DeStud user");
      setRows((r) => r.filter((row) => row.id !== id));
      setCount((c) => Math.max(0, c - 1));
      if (selected?.id === id) setSelected(null);
      return;
    }
    const { error } = await supabase.from(table as any).update({ status: newStatus }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setRows((r) => r.map((row) => (row.id === id ? { ...row, status: newStatus } : row)));
    if (selected?.id === id) setSelected({ ...selected, status: newStatus });
  }

  async function exportCsv() {
    let q: any = supabase.from(table as any).select("*").order("created_at", { ascending: false });
    if (debounced) {
      const ors = searchFields.map((f) => `${f}.ilike.%${debounced}%`).join(",");
      q = q.or(ors);
    }
    for (const [k, v] of Object.entries(filterValues)) if (v) q = q.eq(k, v);
    if (statusFilter) q = q.eq("status", statusFilter);
    if (dateFrom) q = q.gte("created_at", dateFrom);
    if (dateTo) q = q.lte("created_at", `${dateTo}T23:59:59`);
    const { data, error } = await q;
    if (error) { toast.error(error.message); return; }
    const allRows = (data as any[]) ?? [];
    if (!allRows.length) { toast.error("Nothing to export"); return; }
    const headers = Object.keys(allRows[0]);
    const escape = (v: any) => {
      if (v == null) return "";
      const s = typeof v === "object" ? JSON.stringify(v) : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.join(","), ...allRows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = csvFilename; a.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const statusStyle = (s: string) => statusOptions.find((o) => o.value === s);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[22px] text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {title ?? (table === "destud_waitlist" ? "DeStud Users" : "Contacts")}
          </h2>
          <span
            className="text-[12px] px-2.5 py-0.5 rounded-full"
            style={{ background: "rgba(55,138,221,0.12)", color: "#378ADD" }}
          >
            {count}
          </span>
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 text-[13px] text-white/70 hover:text-white border border-white/[0.1] rounded-lg px-3 py-1.5"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      {/* Filter bar */}
      <MhCard className="p-4 mb-5">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email…"
              className="w-full bg-[#0a0f1c] border border-white/[0.1] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#378ADD]/60 outline-none"
            />
          </div>
          {filters.map((f) => (
            <select
              key={f.key}
              value={filterValues[f.key] ?? ""}
              onChange={(e) => setFilterValues({ ...filterValues, [f.key]: e.target.value })}
              className="bg-[#0a0f1c] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="">All {f.label.toLowerCase()}</option>
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ))}
          {showStatus && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#0a0f1c] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="">All statuses</option>
              {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          )}
          <input
            type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="bg-[#0a0f1c] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white"
          />
          <input
            type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="bg-[#0a0f1c] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white"
          />
          <button
            onClick={() => { setSearch(""); setFilterValues({}); setStatusFilter(""); setDateFrom(""); setDateTo(""); }}
            className="text-[12px] text-white/60 hover:text-white"
          >
            Clear filters
          </button>
        </div>
      </MhCard>

      <MhCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0a0f1c] text-[11px] uppercase tracking-wider text-white/40 text-left">
                {columns.map((c) => <th key={c.key} className="px-4 py-3 font-normal">{c.label}</th>)}
                {showStatus && <th className="px-4 py-3 font-normal">Status</th>}
                <th className="px-4 py-3 font-normal">Submitted</th>
                <th className="px-4 py-3 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={columns.length + (showStatus ? 3 : 2)} className="px-4 py-10 text-center text-white/40">Loading…</td></tr>
              )}
              {!loading && !rows.length && (
                <tr><td colSpan={columns.length + (showStatus ? 3 : 2)} className="px-4 py-10 text-center text-white/40">No records</td></tr>
              )}
              {!loading && rows.map((row) => {
                const ss = statusStyle(row.status);
                return (
                  <tr key={row.id} className="border-t border-white/[0.05] hover:bg-white/[0.03]">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3 text-white/85">{c.render ? c.render(row) : row[c.key]}</td>
                    ))}
                    {showStatus && (
                      <td className="px-4 py-3">
                        <select
                          value={row.status}
                          onChange={(e) => updateStatus(row.id, e.target.value)}
                          className="bg-transparent border border-white/[0.1] rounded px-2 py-1 text-[11px]"
                          style={ss ? { color: ss.color, background: ss.bg } : undefined}
                        >
                          {statusOptions.map((o) => <option key={o.value} value={o.value} style={{ color: "#fff", background: "#1a2035" }}>{o.label}</option>)}
                        </select>
                      </td>
                    )}
                    <td className="px-4 py-3 text-white/60 text-[12px] whitespace-nowrap">
                      {new Date(row.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelected(row)}
                        className="text-[12px] text-white/70 hover:text-white border border-white/[0.1] rounded px-2.5 py-1"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </MhCard>

      <div className="flex items-center justify-end gap-3 mt-4 text-[12px] text-white/60">
        <span>Page {page + 1} of {totalPages}</span>
        <button
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          className="px-3 py-1 rounded border border-white/[0.1] disabled:opacity-30"
        >Prev</button>
        <button
          disabled={page >= totalPages - 1}
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-1 rounded border border-white/[0.1] disabled:opacity-30"
        >Next</button>
      </div>

      <SlidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={
          selected && (
            <div>
              <h3 className="text-white text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {selected.full_name || selected.name}
              </h3>
              {selected.plan && (
                <span className="text-[11px] text-white/60 mt-1 inline-block">{selected.plan}</span>
              )}
            </div>
          )
        }
      >
        {selected && (
          <>
            {detailFields.map((f) => <Field key={f.key} label={f.label} value={selected[f.key]} />)}
            <Field
              label="Submitted"
              value={new Date(selected.created_at).toLocaleString()}
            />
            {showStatus && (
              <div className="mt-4">
                <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Status</label>
                <select
                  value={selected.status}
                  onChange={(e) => updateStatus(selected.id, e.target.value)}
                  className="w-full bg-[#0a0f1c] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white"
                >
                  {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}
            {table === "destud_waitlist" && selected.status !== "contacted" && (
              <button
                onClick={() => updateStatus(selected.id, "contacted")}
                className="mt-4 w-full rounded-lg py-2.5 text-sm font-medium text-[#0a0f1c]"
                style={{ background: "#EF9F27" }}
              >
                Mark as contacted
              </button>
            )}
            {table === "destud_waitlist" && (
              <button
                onClick={() => updateStatus(selected.id, "converted")}
                className="mt-2.5 w-full rounded-lg py-2.5 text-sm font-medium text-[#0a0f1c]"
                style={{ background: "#1D9E75" }}
              >
                Convert to DeStud user
              </button>
            )}
          </>
        )}
      </SlidePanel>
    </div>
  );
}
