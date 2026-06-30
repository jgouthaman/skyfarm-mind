import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { d as useNavigate, L as Link } from "../_libs/tanstack__react-router.mjs";
import { A as ALL_VERTICALS, M as MissionHubShell, V as VERTICAL_LABELS, a as MhCard } from "./Shell-BRA8Q4Nz.mjs";
import { u as useMissionHubAuth } from "./context-BevYt8mH.mjs";
import { s as supabase } from "./client-DYtC4Igq.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { R as Route$b } from "./router-BXzEd6Tz.mjs";
import { a3 as Inbox } from "../_libs/lucide-react.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
import "../_libs/tanstack__query-core.mjs";
import "../_libs/tanstack__react-query.mjs";
function VerticalPage() {
  const {
    vertical
  } = Route$b.useParams();
  const v = vertical;
  const navigate = useNavigate();
  const {
    profile,
    verticals,
    loading
  } = useMissionHubAuth();
  const [stats, setStats] = reactExports.useState({
    contacts: 0,
    users: 0,
    week: 0
  });
  const [rows, setRows] = reactExports.useState([]);
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  reactExports.useEffect(() => {
    if (!ALL_VERTICALS.includes(v)) {
      navigate({
        to: "/mission-hub/dashboard"
      });
      return;
    }
    if (!loading && profile && !isAdmin && !verticals.includes(v)) {
      toast.error("You are not mapped to this vertical.");
      navigate({
        to: "/mission-hub/dashboard"
      });
    }
  }, [v, loading, profile, verticals, isAdmin, navigate]);
  reactExports.useEffect(() => {
    if (!ALL_VERTICALS.includes(v)) return;
    (async () => {
      const since = new Date(Date.now() - 7 * 864e5).toISOString();
      const [a, b, c, d] = await Promise.all([supabase.from("contacts").select("*", {
        count: "exact",
        head: true
      }).eq("vertical_interest", v), supabase.from("mission_hub_users").select("*", {
        count: "exact",
        head: true
      }).contains("industries", [v]), supabase.from("contacts").select("*", {
        count: "exact",
        head: true
      }).eq("vertical_interest", v).gte("created_at", since), supabase.from("contacts").select("*").eq("vertical_interest", v).order("created_at", {
        ascending: false
      }).limit(20)]);
      setStats({
        contacts: a.count ?? 0,
        users: b.count ?? 0,
        week: c.count ?? 0
      });
      setRows(d.data ?? []);
    })();
  }, [v]);
  if (!ALL_VERTICALS.includes(v)) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(MissionHubShell, { title: VERTICAL_LABELS[v], children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-3 gap-4 mb-7", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: "Contacts from this vertical", value: stats.contacts }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: "Users mapped to this vertical", value: stats.users }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: "New this week", value: stats.week })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(MhCard, { className: "overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-5 py-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-white text-base", style: {
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 500
        }, children: "Contacts" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/mission-hub/contacts", search: {
          vertical: v
        }, className: "text-[12px] text-[#378ADD]", children: "View all in Contacts →" })
      ] }),
      rows.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-12 text-white/40", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Inbox, { className: "h-8 w-8 mx-auto mb-3" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm", children: [
          "No activity yet for ",
          VERTICAL_LABELS[v]
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[12px] mt-1", children: "Contacts and leads mapped to this vertical will appear here." })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "bg-[#0a0f1c] text-[11px] uppercase text-white/40 text-left", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 font-normal", children: "Name" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 font-normal", children: "Email" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 font-normal", children: "Phone" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 font-normal", children: "Location" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 font-normal", children: "Status" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 font-normal", children: "Date" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: rows.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t border-white/[0.05]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-white/85", children: r.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-white/70 text-[12px]", children: r.email }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-white/70 text-[12px]", children: r.phone }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-white/70 text-[12px]", children: r.location }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-[12px] text-white/70", children: r.status }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-[12px] text-white/60", children: new Date(r.created_at).toLocaleDateString() })
        ] }, r.id)) })
      ] }) })
    ] })
  ] });
}
function Stat({
  label,
  value
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(MhCard, { className: "p-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-3xl text-white", style: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontWeight: 500
    }, children: value }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-[12px] text-white/50", children: label })
  ] });
}
export {
  VerticalPage as component
};
