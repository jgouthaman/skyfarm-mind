import { type ReactNode, useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Clock, BookUser, ClipboardList, GraduationCap, Users, Settings, Bell, Menu, X, LogOut,
  ChevronDown, ChevronRight, Atom, Sparkles, AudioLines,
} from "lucide-react";
import { useMissionHubAuth } from "@/lib/mission-hub/context";
import { type Vertical } from "@/lib/mission-hub/types";
import { toast } from "sonner";

// Full mission-hub chrome + content restyled to match the main public
// site's look (localhost:8080) — same palette/fonts as HANGAR_PUBLIC_CSS
// (src/styles/hangarPublicTheme.ts): white/light-panel backgrounds, Space
// Grotesk/IBM Plex Sans/Mono, blue (#1C74B8) + amber (#E8A33D) accents.
// --mh-* vars are declared on .mh-shell (this wrapper) and cascade down
// through <main>{children}</main> to every page, so individual page/
// component files reference them directly (e.g. style={{ color:
// "var(--mh-dim)" }}) rather than redeclaring their own tokens.
const MH_SHELL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;700&display=swap');
.mh-shell{
  --mh-bg:#FFFFFF; --mh-panel:#F2F7FB;
  --mh-ink:#08131F; --mh-paper:#12222F; --mh-dim:#4F6B80;
  --mh-blue:#1C74B8; --mh-blue-line:#3E7CA6;
  --mh-amber:#E8A33D; --mh-amber-bright:#F6C374;
  --mh-hairline:rgba(62,124,166,0.28);
  font-family:'IBM Plex Sans', sans-serif;
}
.mh-shell h1, .mh-shell h2 { font-family:'Space Grotesk', sans-serif; }
.mh-mono{ font-family:'IBM Plex Mono', monospace; }
`;

export function MissionHubShell({ title, children }: { title: string; children: ReactNode }) {
  const { profile, verticals, loading, signOut } = useMissionHubAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.title = `Mission Hub — ${title} · TorqWings`;
  }, [title]);

  useEffect(() => {
    if (!loading && !profile) navigate({ to: "/mission-hub/login" });
  }, [loading, profile, navigate]);

  // Gate on `!profile`, not `loading`: a background auth refresh (token refresh,
  // tab focus) flips `loading` true while the existing profile is still valid.
  // Tearing down `{children}` there would unmount open modals/forms mid-entry.
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm" style={{ background: "#F2F7FB", color: "#4F6B80" }}>
        Loading…
      </div>
    );
  }

  return (
    <div className="mh-shell min-h-screen" style={{ background: "var(--mh-panel)", color: "var(--mh-paper)" }}>
      <style>{MH_SHELL_CSS}</style>
      {/* Mobile backdrop */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setOpen(false)} />
      )}

      <Sidebar profile={profile} verticals={verticals} open={open} onClose={() => setOpen(false)} onSignOut={signOut} />

      <div className="lg:ml-[224px]">
        {/* Top bar — white, matching the main site's nav; page content below stays on the dark canvas */}
        <header className="h-14 flex items-center justify-between px-5 lg:px-7 border-b" style={{ background: "var(--mh-bg)", borderColor: "var(--mh-hairline)" }}>
          <div className="flex items-center gap-3">
            <button className="lg:hidden" style={{ color: "var(--mh-dim)" }} onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-base font-medium" style={{ color: "var(--mh-ink)" }}>
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Bell className="h-4 w-4" style={{ color: "var(--mh-dim)" }} />
            <span className="hidden sm:block text-sm" style={{ color: "var(--mh-dim)" }}>{profile.full_name}</span>
            <Avatar name={profile.full_name} />
          </div>
        </header>

        <main className="p-6 lg:p-9 min-h-[calc(100vh-56px)]" style={{ background: "var(--mh-panel)", color: "var(--mh-paper)" }}>{children}</main>
      </div>
    </div>
  );
}

type Section = "business" | "agents" | "upcoming" | "config";

function getSectionFromPath(path: string, role?: string): Section | null {
  if (path.startsWith("/mission-hub/raman")) return "upcoming";
  if (path === "/mission-hub/waitlist" || path === "/mission-hub/contacts" || path === "/mission-hub/academy-users" || path === "/mission-hub/service-requests") return "business";
  if (path === "/mission-hub/users" || path === "/mission-hub/ai-providers" || path.startsWith("/mission-hub/settings")) return "config";
  if (path.startsWith("/mission-hub/agents")) return "agents";
  return null;
}

function Sidebar({
  profile, verticals, open, onClose, onSignOut,
}: {
  profile: any; verticals: Vertical[]; open: boolean; onClose: () => void; onSignOut: () => void;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const role = profile.role as "super_admin" | "admin" | "user";
  const isAdmin = role === "super_admin" || role === "admin";

  const [openSection, setOpenSection] = useState<Section | null>(() => getSectionFromPath(path, role));
  const toggle = (s: Section) => setOpenSection(cur => cur === s ? null : s);

  useEffect(() => {
    setOpenSection(getSectionFromPath(path, role));
  }, [path]);

  const sectionLabelStyle = { color: "var(--mh-dim)" };

  return (
    <aside
      className={[
        "mh-shell fixed top-0 left-0 z-50 h-full w-[224px] border-r",
        "flex flex-col transition-transform duration-200",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      ].join(" ")}
      style={{ background: "var(--mh-bg)", borderColor: "var(--mh-hairline)" }}
    >
      <style>{MH_SHELL_CSS}</style>
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="grid place-items-center h-7 w-7 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "var(--mh-bg)", border: "1px solid var(--mh-hairline)" }}>
              <img src="/torqwings-mark.png" alt="" className="h-full w-full object-contain" aria-hidden="true" />
            </span>
            <span className="text-base" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "var(--mh-ink)" }}>
              Torq<span style={{ color: "var(--mh-blue)" }}>Wings</span>
            </span>
          </span>
          <button className="lg:hidden" style={{ color: "var(--mh-dim)" }} onClick={onClose} aria-label="Close menu">
            <X className="h-4 w-4" />
          </button>
        </div>
        <span
          className="mh-mono mt-2 inline-block uppercase tracking-[0.08em] text-[10px] rounded-full px-2.5 py-0.5"
          style={{ background: "rgba(28,116,184,0.12)", color: "var(--mh-blue)" }}
        >
          Mission Hub
        </span>
      </div>
      <div className="border-t" style={{ borderColor: "var(--mh-hairline)" }} />

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 text-[13px]">
        {isAdmin && (
          <>
            <button type="button" onClick={() => toggle("business")}
              className="mh-mono mb-2 flex w-full items-center px-3 text-[10px] uppercase tracking-wider transition-colors" style={sectionLabelStyle}>
              <span className="flex-1 text-left">Business</span>
              {openSection === "business" ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
            {openSection === "business" && (
              <>
                <NavLink to="/mission-hub/waitlist" icon={Clock}    active={path === "/mission-hub/waitlist"} onClick={onClose}>The Hangar</NavLink>
                <NavLink to="/mission-hub/academy-users" icon={GraduationCap} active={path === "/mission-hub/academy-users"} onClick={onClose}>Academy Users</NavLink>
                <NavLink to="/mission-hub/contacts" icon={BookUser} active={path === "/mission-hub/contacts"} onClick={onClose}>Contacts</NavLink>
                <NavLink to="/mission-hub/service-requests" icon={ClipboardList} active={path === "/mission-hub/service-requests"} onClick={onClose}>Service Requests</NavLink>
              </>
            )}

            {/* ── Agents -- per-agent configuration for The Hangar's agents.
                Bernoulli is the first: its check registry. ── */}
            <div className="mt-5">
              <button type="button" onClick={() => toggle("agents")}
                className="mh-mono mb-2 flex w-full items-center px-3 text-[10px] uppercase tracking-wider transition-colors" style={sectionLabelStyle}>
                <span className="flex-1 text-left">Agents</span>
                {openSection === "agents" ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
              {openSection === "agents" && (
                <NavLink to="/mission-hub/agents/bernoulli" icon={Atom} active={path === "/mission-hub/agents/bernoulli"} onClick={onClose}>
                  Bernoulli
                </NavLink>
              )}
            </div>

            {/* ── Upcoming Agents -- the test lab: new agents run here as a
                standalone beta before they're promoted to The Hangar. ── */}
            <div className="mt-5">
              <button type="button" onClick={() => toggle("upcoming")}
                className="mh-mono mb-2 flex w-full items-center px-3 text-[10px] uppercase tracking-wider transition-colors" style={sectionLabelStyle}>
                <span className="flex-1 text-left">Upcoming Agents</span>
                {openSection === "upcoming" ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
              {openSection === "upcoming" && (
                <NavLink to="/mission-hub/raman" icon={AudioLines} active={path.startsWith("/mission-hub/raman")} onClick={onClose}>
                  Ask Raman
                </NavLink>
              )}
            </div>
          </>
        )}

        <div className="mt-5 space-y-0.5">
          <button type="button" onClick={() => toggle("config")}
            className="mh-mono mb-2 flex w-full items-center px-3 text-[10px] uppercase tracking-wider transition-colors" style={sectionLabelStyle}>
            <span className="flex-1 text-left">Configurations</span>
            {openSection === "config" ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
          {openSection === "config" && (
            <>
              {isAdmin && (
                <NavLink to="/mission-hub/users" icon={Users} active={path === "/mission-hub/users"} onClick={onClose}>
                  Users
                </NavLink>
              )}
              {isAdmin && (
                <NavLink to="/mission-hub/ai-providers" icon={Sparkles} active={path === "/mission-hub/ai-providers"} onClick={onClose}>
                  AI Providers
                </NavLink>
              )}
              <NavLink to="/mission-hub/settings" icon={Settings} active={path === "/mission-hub/settings"} onClick={onClose}>
                Settings
              </NavLink>
            </>
          )}
        </div>
      </nav>

      <div className="border-t p-4" style={{ borderColor: "var(--mh-hairline)" }}>
        <div className="flex items-center gap-3">
          <Avatar name={profile.full_name} />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium truncate" style={{ color: "var(--mh-ink)" }}>{profile.full_name}</div>
            <RolePill role={role} />
          </div>
        </div>
        <button
          onClick={() => { onSignOut(); toast.success("Signed out"); }}
          className="mt-3 flex items-center gap-1.5 text-[12px] transition-colors hover:text-[var(--mh-ink)]"
          style={{ color: "var(--mh-dim)" }}
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    </aside>
  );
}

function NavLink({
  to, icon: Icon, active, onClick, children,
}: { to: string; icon: any; active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border-l-[3px] transition-colors"
      style={
        active
          ? { background: "rgba(28,116,184,0.10)", borderColor: "var(--mh-blue)", color: "var(--mh-ink)" }
          : { borderColor: "transparent", color: "var(--mh-dim)" }
      }
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = "rgba(62,124,166,0.06)"; e.currentTarget.style.color = "var(--mh-ink)"; } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--mh-dim)"; } }}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="truncate">{children}</span>
    </Link>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = (name || "?")
    .split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
  return (
    <div
      className="grid place-items-center rounded-full text-[12px] font-semibold flex-shrink-0"
      style={{ background: "rgba(28,116,184,0.14)", color: "var(--mh-blue)", width: 34, height: 34 }}
    >
      {initials || "?"}
    </div>
  );
}

function RolePill({ role }: { role: "super_admin" | "admin" | "user" }) {
  const styles =
    role === "super_admin"
      ? { bg: "rgba(188,54,54,0.12)", color: "#B23A3A", label: "Super Admin" }
      : role === "admin"
        ? { bg: "rgba(232,163,61,0.15)", color: "#B8791F", label: "Admin" }
        : { bg: "rgba(28,116,184,0.12)", color: "#1C74B8", label: "User" };
  return (
    <span
      className="inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full"
      style={{ background: styles.bg, color: styles.color }}
    >
      {styles.label}
    </span>
  );
}

export function MhCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[14px] ${className}`}
      style={{ background: "var(--mh-bg)", border: "1px solid var(--mh-hairline)" }}
    >
      {children}
    </div>
  );
}

export function requireAdminGuard(role: string | undefined, navigate: any) {
  if (role && role !== "super_admin" && role !== "admin") {
    toast.error("Access restricted.");
    navigate({ to: "/mission-hub/dashboard" });
    return false;
  }
  return true;
}
