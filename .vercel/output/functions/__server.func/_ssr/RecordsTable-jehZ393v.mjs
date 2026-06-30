import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { s as supabase } from "./client-DYtC4Igq.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { a as MhCard } from "./Shell-BRA8Q4Nz.mjs";
import { S as SlidePanel, F as Field } from "./SlidePanel-DNitnqUb.mjs";
import { Q as Download, T as Search } from "../_libs/lucide-react.mjs";
const PAGE_SIZE = 20;
function RecordsTable({
  table,
  searchFields,
  columns,
  filters = [],
  statusOptions,
  detailFields,
  csvFilename,
  initialFilters = {}
}) {
  const [rows, setRows] = reactExports.useState([]);
  const [count, setCount] = reactExports.useState(0);
  const [search, setSearch] = reactExports.useState("");
  const [debounced, setDebounced] = reactExports.useState("");
  const [filterValues, setFilterValues] = reactExports.useState(initialFilters);
  const [statusFilter, setStatusFilter] = reactExports.useState("");
  const [dateFrom, setDateFrom] = reactExports.useState("");
  const [dateTo, setDateTo] = reactExports.useState("");
  const [page, setPage] = reactExports.useState(0);
  const [loading, setLoading] = reactExports.useState(true);
  const [selected, setSelected] = reactExports.useState(null);
  reactExports.useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  reactExports.useEffect(() => {
    setPage(0);
  }, [debounced, filterValues, statusFilter, dateFrom, dateTo]);
  async function load() {
    setLoading(true);
    let q = supabase.from(table).select("*", { count: "exact" }).order("created_at", { ascending: false });
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
    setRows(data ?? []);
    setCount(c ?? 0);
    setLoading(false);
  }
  reactExports.useEffect(() => {
    load();
  }, [debounced, filterValues, statusFilter, dateFrom, dateTo, page, table]);
  async function updateStatus(id, newStatus) {
    const { error } = await supabase.from(table).update({ status: newStatus }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
    setRows((r) => r.map((row) => row.id === id ? { ...row, status: newStatus } : row));
    if (selected?.id === id) setSelected({ ...selected, status: newStatus });
  }
  async function exportCsv() {
    let q = supabase.from(table).select("*").order("created_at", { ascending: false });
    if (debounced) {
      const ors = searchFields.map((f) => `${f}.ilike.%${debounced}%`).join(",");
      q = q.or(ors);
    }
    for (const [k, v] of Object.entries(filterValues)) if (v) q = q.eq(k, v);
    if (statusFilter) q = q.eq("status", statusFilter);
    if (dateFrom) q = q.gte("created_at", dateFrom);
    if (dateTo) q = q.lte("created_at", `${dateTo}T23:59:59`);
    const { data, error } = await q;
    if (error) {
      toast.error(error.message);
      return;
    }
    const allRows = data ?? [];
    if (!allRows.length) {
      toast.error("Nothing to export");
      return;
    }
    const headers = Object.keys(allRows[0]);
    const escape = (v) => {
      if (v == null) return "";
      const s = typeof v === "object" ? JSON.stringify(v) : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.join(","), ...allRows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = csvFilename;
    a.click();
    URL.revokeObjectURL(url);
  }
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const statusStyle = (s) => statusOptions.find((o) => o.value === s);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-3 mb-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-[22px] text-white", style: { fontFamily: "'Space Grotesk', sans-serif" }, children: table === "design_studio_leads" ? "Subscriptions" : "Leads" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "text-[12px] px-2.5 py-0.5 rounded-full",
            style: { background: "rgba(55,138,221,0.12)", color: "#378ADD" },
            children: count
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: exportCsv,
          className: "flex items-center gap-1.5 text-[13px] text-white/70 hover:text-white border border-white/[0.1] rounded-lg px-3 py-1.5",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "h-3.5 w-3.5" }),
            " Export CSV"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(MhCard, { className: "p-4 mb-5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-3 items-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-1 min-w-[180px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            value: search,
            onChange: (e) => setSearch(e.target.value),
            placeholder: "Search name or email…",
            className: "w-full bg-[#0a0f1c] border border-white/[0.1] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#378ADD]/60 outline-none"
          }
        )
      ] }),
      filters.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "select",
        {
          value: filterValues[f.key] ?? "",
          onChange: (e) => setFilterValues({ ...filterValues, [f.key]: e.target.value }),
          className: "bg-[#0a0f1c] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: "", children: [
              "All ",
              f.label.toLowerCase()
            ] }),
            f.options.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: o.value, children: o.label }, o.value))
          ]
        },
        f.key
      )),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "select",
        {
          value: statusFilter,
          onChange: (e) => setStatusFilter(e.target.value),
          className: "bg-[#0a0f1c] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "All statuses" }),
            statusOptions.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: s.value, children: s.label }, s.value))
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "date",
          value: dateFrom,
          onChange: (e) => setDateFrom(e.target.value),
          className: "bg-[#0a0f1c] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "date",
          value: dateTo,
          onChange: (e) => setDateTo(e.target.value),
          className: "bg-[#0a0f1c] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => {
            setSearch("");
            setFilterValues({});
            setStatusFilter("");
            setDateFrom("");
            setDateTo("");
          },
          className: "text-[12px] text-white/60 hover:text-white",
          children: "Clear filters"
        }
      )
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(MhCard, { className: "overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "bg-[#0a0f1c] text-[11px] uppercase tracking-wider text-white/40 text-left", children: [
        columns.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 font-normal", children: c.label }, c.key)),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 font-normal", children: "Status" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 font-normal", children: "Submitted" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 font-normal text-right", children: "Actions" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        loading && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: columns.length + 3, className: "px-4 py-10 text-center text-white/40", children: "Loading…" }) }),
        !loading && !rows.length && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: columns.length + 3, className: "px-4 py-10 text-center text-white/40", children: "No records" }) }),
        !loading && rows.map((row) => {
          const ss = statusStyle(row.status);
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t border-white/[0.05] hover:bg-white/[0.03]", children: [
            columns.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-white/85", children: c.render ? c.render(row) : row[c.key] }, c.key)),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "select",
              {
                value: row.status,
                onChange: (e) => updateStatus(row.id, e.target.value),
                className: "bg-transparent border border-white/[0.1] rounded px-2 py-1 text-[11px]",
                style: ss ? { color: ss.color, background: ss.bg } : void 0,
                children: statusOptions.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: o.value, style: { color: "#fff", background: "#1a2035" }, children: o.label }, o.value))
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-white/60 text-[12px] whitespace-nowrap", children: new Date(row.created_at).toLocaleDateString() }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => setSelected(row),
                className: "text-[12px] text-white/70 hover:text-white border border-white/[0.1] rounded px-2.5 py-1",
                children: "View"
              }
            ) })
          ] }, row.id);
        })
      ] })
    ] }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-end gap-3 mt-4 text-[12px] text-white/60", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        "Page ",
        page + 1,
        " of ",
        totalPages
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          disabled: page === 0,
          onClick: () => setPage((p) => Math.max(0, p - 1)),
          className: "px-3 py-1 rounded border border-white/[0.1] disabled:opacity-30",
          children: "Prev"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          disabled: page >= totalPages - 1,
          onClick: () => setPage((p) => p + 1),
          className: "px-3 py-1 rounded border border-white/[0.1] disabled:opacity-30",
          children: "Next"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      SlidePanel,
      {
        open: !!selected,
        onClose: () => setSelected(null),
        title: selected && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-white text-lg", style: { fontFamily: "'Space Grotesk', sans-serif" }, children: selected.full_name || selected.name }),
          selected.plan && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-white/60 mt-1 inline-block", children: selected.plan })
        ] }),
        children: selected && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          detailFields.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: f.label, value: selected[f.key] }, f.key)),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Field,
            {
              label: "Submitted",
              value: new Date(selected.created_at).toLocaleString()
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[10px] uppercase tracking-wider text-white/40 mb-1.5", children: "Status" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "select",
              {
                value: selected.status,
                onChange: (e) => updateStatus(selected.id, e.target.value),
                className: "w-full bg-[#0a0f1c] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white",
                children: statusOptions.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: o.value, children: o.label }, o.value))
              }
            )
          ] }),
          table === "design_studio_leads" && selected.status !== "contacted" && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => updateStatus(selected.id, "contacted"),
              className: "mt-4 w-full rounded-lg py-2.5 text-sm font-medium text-[#0a0f1c]",
              style: { background: "#EF9F27" },
              children: "Mark as contacted"
            }
          )
        ] })
      }
    )
  ] });
}
export {
  RecordsTable as R
};
