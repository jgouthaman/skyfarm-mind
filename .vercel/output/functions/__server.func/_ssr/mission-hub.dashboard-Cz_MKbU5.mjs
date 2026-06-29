import { j as jsxRuntimeExports, r as reactExports } from "../_libs/react.mjs";
import { L as Link } from "../_libs/tanstack__react-router.mjs";
import { M as MissionHubShell, a as MhCard, V as VERTICAL_LABELS } from "./Shell-BRA8Q4Nz.mjs";
import { u as useMissionHubAuth } from "./context-BevYt8mH.mjs";
import { s as supabase } from "./client-DYtC4Igq.mjs";
import "../_libs/sonner.mjs";
import { a2 as Inbox } from "../_libs/lucide-react.mjs";
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
function DashboardPage() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MissionHubShell, { title: "Dashboard", children: /* @__PURE__ */ jsxRuntimeExports.jsx(DashboardInner, {}) });
}
function DashboardInner() {
  const {
    profile,
    verticals
  } = useMissionHubAuth();
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  if (!isAdmin) return /* @__PURE__ */ jsxRuntimeExports.jsx(UserDashboard, { name: profile.full_name, verticals });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AdminDashboard, {});
}
function AdminDashboard() {
  const [stats, setStats] = reactExports.useState({
    leads: 0,
    contacts: 0,
    users: 0,
    week: 0
  });
  const [latestLeads, setLatestLeads] = reactExports.useState([]);
  const [latestContacts, setLatestContacts] = reactExports.useState([]);
  reactExports.useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 7 * 864e5).toISOString();
      const [a, b, c, d, e, leads, contacts] = await Promise.all([supabase.from("design_studio_leads").select("*", {
        count: "exact",
        head: true
      }), supabase.from("contacts").select("*", {
        count: "exact",
        head: true
      }), supabase.from("mission_hub_users").select("*", {
        count: "exact",
        head: true
      }), supabase.from("design_studio_leads").select("*", {
        count: "exact",
        head: true
      }).gte("created_at", since), supabase.from("contacts").select("*", {
        count: "exact",
        head: true
      }).gte("created_at", since), supabase.from("design_studio_leads").select("*").order("created_at", {
        ascending: false
      }).limit(5), supabase.from("contacts").select("*").order("created_at", {
        ascending: false
      }).limit(5)]);
      setStats({
        leads: a.count ?? 0,
        contacts: b.count ?? 0,
        users: c.count ?? 0,
        week: (d.count ?? 0) + (e.count ?? 0)
      });
      setLatestLeads(leads.data ?? []);
      setLatestContacts(contacts.data ?? []);
    })();
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-7", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: "Total waitlist leads", value: stats.leads }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: "Total contacts", value: stats.contacts }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: "Total users", value: stats.users }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: "New this week", value: stats.week })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid lg:grid-cols-2 gap-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Panel, { title: "Latest waitlist signups", linkTo: "/mission-hub/waitlist", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SimpleTable, { headers: ["Name", "Plan", "Date"], rows: latestLeads.map((r) => [r.full_name, planPill(r.plan), date(r.created_at)]) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Panel, { title: "Latest contacts", linkTo: "/mission-hub/contacts", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SimpleTable, { headers: ["Name", "Vertical", "Date"], rows: latestContacts.map((r) => [r.name, r.vertical_interest || "—", date(r.created_at)]) }) })
    ] })
  ] });
}
function UserDashboard({
  name,
  verticals
}) {
  const hasDesignStudio = verticals.includes("design-studio");
  const otherVerticals = verticals.filter((v) => v !== "design-studio");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-white text-2xl", style: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontWeight: 500
    }, children: [
      "Welcome back, ",
      name
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-white/55", children: "Your workspace" }),
    verticals.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-10 text-center text-white/40", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Inbox, { className: "h-8 w-8 mx-auto mb-3" }),
      "No access assigned yet. Contact your administrator."
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4", children: [
      hasDesignStudio && /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/mission-hub/design-studio", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(MhCard, { className: "p-5 hover:border-[#EF9F27]/50 transition-colors", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-white", style: {
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 500
        }, children: "Design Studio" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-[12px] text-[#EF9F27]", children: "Open Studio →" })
      ] }) }),
      otherVerticals.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/mission-hub/verticals/$vertical", params: {
        vertical: v
      }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(MhCard, { className: "p-5 hover:border-[#378ADD]/40 transition-colors", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-white", style: {
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 500
        }, children: VERTICAL_LABELS[v] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-[12px] text-[#378ADD]", children: "Open →" })
      ] }) }, v))
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
function Panel({
  title,
  linkTo,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(MhCard, { className: "p-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-white text-base", style: {
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 500
      }, children: title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: linkTo, className: "text-[12px] text-[#378ADD]", children: "View all →" })
    ] }),
    children
  ] });
}
function SimpleTable({
  headers,
  rows
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { className: "text-left text-[10px] uppercase text-white/40", children: headers.map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "py-2 font-normal", children: h }, h)) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
      !rows.length && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: headers.length, className: "py-6 text-center text-white/30 text-[12px]", children: "No records" }) }),
      rows.map((r, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { className: "border-t border-white/[0.05]", children: r.map((c, j) => /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-2.5 text-white/85", children: c }, j)) }, i))
    ] })
  ] });
}
const PLAN_COLORS = {
  Explorer: {
    bg: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.6)"
  },
  Engineer: {
    bg: "rgba(55,138,221,0.15)",
    color: "#378ADD"
  },
  Squadron: {
    bg: "rgba(239,159,39,0.15)",
    color: "#EF9F27"
  },
  Campus: {
    bg: "rgba(29,158,117,0.15)",
    color: "#1D9E75"
  },
  Waitlist: {
    bg: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.6)"
  }
};
function planPill(plan) {
  const s = PLAN_COLORS[plan] ?? PLAN_COLORS.Waitlist;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] px-2 py-0.5 rounded-full", style: {
    background: s.bg,
    color: s.color
  }, children: plan });
}
function date(iso) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[12px] text-white/60", children: new Date(iso).toLocaleDateString() });
}
export {
  DashboardPage as component
};
