import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { d as useNavigate, e as useRouterState, L as Link } from "../_libs/tanstack__react-router.mjs";
import { u as useMissionHubAuth } from "./context-BevYt8mH.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { h as Menu, s as Bell, X, t as ChevronDown, u as ChevronRight, v as Clock, w as BookUser, x as Cpu, y as GraduationCap, F as FlaskConical, r as Shield, z as Map, D as Building2, E as Sprout, J as BookOpen, K as Users, N as Settings, p as LogOut } from "../_libs/lucide-react.mjs";
const VERTICAL_LABELS = {
  agrisky: "AgriSky",
  infrasky: "InfraSky",
  geosky: "GeoSky",
  guardsky: "GuardSky",
  labs: "Labs",
  academy: "Academy",
  "design-studio": "Design Studio"
};
const ALL_VERTICALS = ["agrisky", "infrasky", "geosky", "guardsky", "labs", "academy", "design-studio"];
const STATUS_LABELS = {
  active: "Active",
  inactive: "Inactive",
  pending: "Pending"
};
const verticalIcon = {
  agrisky: Sprout,
  infrasky: Building2,
  geosky: Map,
  guardsky: Shield,
  labs: FlaskConical,
  academy: GraduationCap,
  "design-studio": Cpu
};
function MissionHubShell({ title, children }) {
  const { profile, verticals, loading, signOut } = useMissionHubAuth();
  const navigate = useNavigate();
  const [open, setOpen] = reactExports.useState(false);
  reactExports.useEffect(() => {
    document.title = `Mission Hub — ${title} · TorqWings`;
  }, [title]);
  reactExports.useEffect(() => {
    if (!loading && !profile) navigate({ to: "/mission-hub/login" });
  }, [loading, profile, navigate]);
  if (!profile) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen flex items-center justify-center bg-[#0a0f1c] text-white/60 text-sm", children: "Loading…" });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-[#0a0f1c] text-white", style: { fontFamily: "Inter, system-ui, sans-serif" }, children: [
    open && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "lg:hidden fixed inset-0 z-40 bg-black/60", onClick: () => setOpen(false) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Sidebar, { profile, verticals, open, onClose: () => setOpen(false), onSignOut: signOut }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lg:ml-[224px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "h-14 flex items-center justify-between px-5 lg:px-7 border-b border-white/[0.08] bg-[#0a0f1c]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "lg:hidden text-white/70", onClick: () => setOpen(true), "aria-label": "Open menu", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Menu, { className: "h-5 w-5" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-white text-base font-medium", style: { fontFamily: "'Space Grotesk', sans-serif" }, children: title })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Bell, { className: "h-4 w-4 text-white/50" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden sm:block text-sm text-white/60", children: profile.full_name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Avatar, { name: profile.full_name })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "p-6 lg:p-9 min-h-[calc(100vh-56px)]", children })
    ] })
  ] });
}
function getSectionFromPath(path, role) {
  if (path === "/mission-hub/twbc-drone-proven-designs") {
    return role === "super_admin" ? "twbc" : "knowledge";
  }
  if (path === "/mission-hub/waitlist" || path === "/mission-hub/contacts") return "business";
  if (path.startsWith("/mission-hub/twbc-") || path === "/mission-hub/knowledge-uav") return "twbc";
  if (path.startsWith("/mission-hub/verticals/") || path === "/mission-hub/design-studio" || path.startsWith("/mission-hub/torqwings-design-studio")) return "industries";
  if (path === "/mission-hub/users" || path.startsWith("/mission-hub/settings")) return "config";
  return null;
}
function getTwbcOpenFromPath(path) {
  const kb = [
    "/mission-hub/twbc-drone-design-rule",
    "/mission-hub/twbc-drone-proven-designs",
    "/mission-hub/twbc-drone-components-library"
  ].includes(path);
  const ie = ["/mission-hub/twbc-drone-rule-engine"].includes(path);
  const er = [
    "/mission-hub/twbc-drone-design-score",
    "/mission-hub/twbc-drone-approval",
    "/mission-hub/twbc-drone-feedback"
  ].includes(path);
  const drone = kb || ie || er;
  return { drone, kb, ie, er };
}
function Sidebar({
  profile,
  verticals,
  open,
  onClose,
  onSignOut
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const role = profile.role;
  const isAdmin = role === "super_admin" || role === "admin";
  const [openSection, setOpenSection] = reactExports.useState(() => getSectionFromPath(path, role));
  const toggle = (s) => setOpenSection((cur) => cur === s ? null : s);
  reactExports.useEffect(() => {
    setOpenSection(getSectionFromPath(path, role));
  }, [path]);
  reactExports.useEffect(() => {
    const derived = getTwbcOpenFromPath(path);
    if (derived.drone) {
      setTwbcOpen((s) => ({
        drone: true,
        kb: s.kb || derived.kb,
        ie: s.ie || derived.ie,
        er: s.er || derived.er
      }));
    }
  }, [path]);
  const [twbcOpen, setTwbcOpen] = reactExports.useState(() => getTwbcOpenFromPath(path));
  const toggleTwbc = (k) => setTwbcOpen((s) => ({ ...s, [k]: !s[k] }));
  const visibleVerticals = isAdmin ? ALL_VERTICALS : verticals;
  const hasDesignStudio = isAdmin || verticals.includes("design-studio");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "aside",
    {
      className: [
        "fixed top-0 left-0 z-50 h-full w-[224px] bg-[#141928] border-r border-white/[0.08]",
        "flex flex-col transition-transform duration-200",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      ].join(" "),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-5 pt-5 pb-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-white text-base", style: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }, children: [
              "Torq",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[#378ADD]", children: "Wings" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "lg:hidden text-white/50", onClick: onClose, "aria-label": "Close menu", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4" }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: "mt-2 inline-block uppercase tracking-[0.08em] text-[10px] rounded-full px-2.5 py-0.5",
              style: { background: "rgba(55,138,221,0.12)", color: "#378ADD" },
              children: "Mission Hub"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-white/[0.06]" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("nav", { className: "flex-1 overflow-y-auto px-3 py-4 space-y-0.5 text-[13px]", children: [
          isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: () => toggle("business"),
                className: "mb-2 flex w-full items-center px-3 text-[10px] uppercase tracking-wider text-white/70 hover:text-white/90 transition-colors",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 text-left", children: "Business" }),
                  openSection === "business" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "h-3 w-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "h-3 w-3" })
                ]
              }
            ),
            openSection === "business" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(NavLink, { to: "/mission-hub/waitlist", icon: Clock, active: path === "/mission-hub/waitlist", onClick: onClose, children: "Subscriptions" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(NavLink, { to: "/mission-hub/contacts", icon: BookUser, active: path === "/mission-hub/contacts", onClick: onClose, children: "Leads" })
            ] })
          ] }),
          visibleVerticals.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => toggle("industries"),
              className: "mt-5 mb-2 flex w-full items-center px-3 text-[10px] uppercase tracking-wider text-white/70 hover:text-white/90 transition-colors",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 text-left", children: "Industries" }),
                openSection === "industries" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "h-3 w-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "h-3 w-3" })
              ]
            }
          ),
          openSection === "industries" && visibleVerticals.map((v) => {
            const Icon = verticalIcon[v];
            const to = v === "design-studio" ? "/mission-hub/design-studio" : `/mission-hub/verticals/${v}`;
            return /* @__PURE__ */ jsxRuntimeExports.jsx(NavLink, { to, icon: Icon, active: path === to, onClick: onClose, children: VERTICAL_LABELS[v] }, v);
          }),
          isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 space-y-0.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: () => toggle("twbc"),
                className: "mb-2 flex w-full items-center px-3 text-[10px] uppercase tracking-wider text-white/70 hover:text-white/90 transition-colors",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 text-left", children: "Design Intelligence" }),
                  openSection === "twbc" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "h-3 w-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "h-3 w-3" })
                ]
              }
            ),
            openSection === "twbc" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => toggleTwbc("drone"),
                  className: "flex w-full items-center gap-2.5 px-4 py-2.5 rounded-lg text-[13px] text-white/65 hover:bg-white/[0.04] hover:text-white transition-colors",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Cpu, { className: "h-4 w-4 shrink-0" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 truncate text-left", children: "Drone" }),
                    twbcOpen.drone ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "h-3.5 w-3.5 opacity-50" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "h-3.5 w-3.5 opacity-50" })
                  ]
                }
              ),
              twbcOpen.drone && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-3 border-l border-white/[0.06] pl-1.5 space-y-0.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: () => toggleTwbc("kb"),
                    className: "flex w-full items-center gap-2 px-3 py-1.5 rounded-md text-[12px] text-white/55 hover:bg-white/[0.04] hover:text-white transition-colors",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 truncate text-left", children: "Knowledge Base" }),
                      twbcOpen.kb ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "h-3 w-3 opacity-40" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "h-3 w-3 opacity-40" })
                    ]
                  }
                ),
                twbcOpen.kb && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-3 border-l border-white/[0.06] pl-1.5 space-y-0.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TwbcLeaf, { to: "/mission-hub/twbc-drone-design-rule", active: path === "/mission-hub/twbc-drone-design-rule", onClick: onClose, children: "Design Rules" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TwbcLeaf, { to: "/mission-hub/twbc-drone-proven-designs", active: path === "/mission-hub/twbc-drone-proven-designs", onClick: onClose, children: "Proven Designs" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TwbcLeaf, { to: "/mission-hub/twbc-drone-components-library", active: path === "/mission-hub/twbc-drone-components-library", onClick: onClose, children: "Components" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: () => toggleTwbc("ie"),
                    className: "flex w-full items-center gap-2 px-3 py-1.5 rounded-md text-[12px] text-white/55 hover:bg-white/[0.04] hover:text-white transition-colors",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 truncate text-left", children: "Intelligence Engine" }),
                      twbcOpen.ie ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "h-3 w-3 opacity-40" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "h-3 w-3 opacity-40" })
                    ]
                  }
                ),
                twbcOpen.ie && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ml-3 border-l border-white/[0.06] pl-1.5 space-y-0.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TwbcLeaf, { to: "/mission-hub/twbc-drone-rule-engine", active: path === "/mission-hub/twbc-drone-rule-engine", onClick: onClose, children: "Rule Engine" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: () => toggleTwbc("er"),
                    className: "flex w-full items-center gap-2 px-3 py-1.5 rounded-md text-[12px] text-white/55 hover:bg-white/[0.04] hover:text-white transition-colors",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 truncate text-left", children: "Engineer Review" }),
                      twbcOpen.er ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "h-3 w-3 opacity-40" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "h-3 w-3 opacity-40" })
                    ]
                  }
                ),
                twbcOpen.er && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-3 border-l border-white/[0.06] pl-1.5 space-y-0.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TwbcLeaf, { to: "/mission-hub/twbc-drone-design-score", active: path === "/mission-hub/twbc-drone-design-score", onClick: onClose, children: "Design Score" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TwbcLeaf, { to: "/mission-hub/twbc-drone-approval", active: path === "/mission-hub/twbc-drone-approval", onClick: onClose, children: "Approval" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TwbcLeaf, { to: "/mission-hub/twbc-drone-feedback", active: path === "/mission-hub/twbc-drone-feedback", onClick: onClose, children: "Feedback" })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(NavLink, { to: "/mission-hub/knowledge-uav", icon: BookOpen, active: path === "/mission-hub/knowledge-uav", onClick: onClose, children: "UAV" })
            ] })
          ] }),
          hasDesignStudio && role !== "super_admin" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 space-y-0.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: () => toggle("knowledge"),
                className: "mb-2 flex w-full items-center px-3 text-[10px] uppercase tracking-wider text-white/70 hover:text-white/90 transition-colors",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 text-left", children: "Knowledge Base" }),
                  openSection === "knowledge" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "h-3 w-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "h-3 w-3" })
                ]
              }
            ),
            openSection === "knowledge" && /* @__PURE__ */ jsxRuntimeExports.jsx(NavLink, { to: "/mission-hub/twbc-drone-proven-designs", icon: BookOpen, active: path === "/mission-hub/twbc-drone-proven-designs", onClick: onClose, children: "Proven Designs" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 space-y-0.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: () => toggle("config"),
                className: "mb-2 flex w-full items-center px-3 text-[10px] uppercase tracking-wider text-white/70 hover:text-white/90 transition-colors",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 text-left", children: "Configurations" }),
                  openSection === "config" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "h-3 w-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "h-3 w-3" })
                ]
              }
            ),
            openSection === "config" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsx(NavLink, { to: "/mission-hub/users", icon: Users, active: path === "/mission-hub/users", onClick: onClose, children: "Users" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(NavLink, { to: "/mission-hub/settings", icon: Settings, active: path === "/mission-hub/settings", onClick: onClose, children: "Settings" })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-white/[0.06] p-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Avatar, { name: profile.full_name }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[13px] font-medium text-white truncate", children: profile.full_name }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(RolePill, { role })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => {
                onSignOut();
                toast.success("Signed out");
              },
              className: "mt-3 flex items-center gap-1.5 text-[12px] text-white/50 hover:text-white",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(LogOut, { className: "h-3.5 w-3.5" }),
                " Sign out"
              ]
            }
          )
        ] })
      ]
    }
  );
}
function NavLink({
  to,
  icon: Icon,
  active,
  onClick,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Link,
    {
      to,
      onClick,
      className: [
        "flex items-center gap-2.5 px-4 py-2.5 rounded-lg border-l-[3px] transition-colors",
        active ? "bg-[rgba(55,138,221,0.12)] border-[#378ADD] text-white" : "border-transparent text-white/65 hover:bg-white/[0.04] hover:text-white"
      ].join(" "),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "h-4 w-4 flex-shrink-0" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children })
      ]
    }
  );
}
function TwbcLeaf({ to, active, onClick, children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Link,
    {
      to,
      onClick,
      className: [
        "flex items-center px-3 py-1.5 rounded-md text-[12px] border-l-2 transition-colors",
        active ? "bg-[rgba(55,138,221,0.10)] border-[#378ADD] text-white" : "border-transparent text-white/50 hover:bg-white/[0.04] hover:text-white"
      ].join(" "),
      children
    }
  );
}
function Avatar({ name }) {
  const initials = (name || "?").split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "grid place-items-center rounded-full text-[12px] font-semibold flex-shrink-0",
      style: { background: "rgba(55,138,221,0.2)", color: "#378ADD", width: 34, height: 34 },
      children: initials || "?"
    }
  );
}
function RolePill({ role }) {
  const styles = role === "super_admin" ? { bg: "rgba(163,45,45,0.2)", color: "#F09595", label: "Super Admin" } : role === "admin" ? { bg: "rgba(239,159,39,0.15)", color: "#EF9F27", label: "Admin" } : { bg: "rgba(24,95,165,0.2)", color: "#378ADD", label: "User" };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      className: "inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full",
      style: { background: styles.bg, color: styles.color },
      children: styles.label
    }
  );
}
function MhCard({ children, className = "" }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `rounded-[14px] bg-[#1a2035] border border-white/[0.08] ${className}`, children });
}
export {
  ALL_VERTICALS as A,
  MissionHubShell as M,
  STATUS_LABELS as S,
  VERTICAL_LABELS as V,
  MhCard as a
};
