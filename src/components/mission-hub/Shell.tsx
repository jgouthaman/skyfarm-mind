import { type ReactNode, useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Clock, BookUser, Cpu, Sprout, Building2, Map as MapIcon,
  Shield, FlaskConical, GraduationCap, Users, Settings, Bell, Menu, X, LogOut, BookOpen,
  ChevronDown, ChevronRight,
} from "lucide-react";
import { useMissionHubAuth } from "@/lib/mission-hub/context";
import { ALL_VERTICALS, VERTICAL_LABELS, type Vertical } from "@/lib/mission-hub/types";
import { toast } from "sonner";

const verticalIcon: Record<Vertical, any> = {
  agrisky: Sprout, infrasky: Building2, geosky: MapIcon,
  guardsky: Shield, labs: FlaskConical, academy: GraduationCap,
  "design-studio": Cpu,
};

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
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f1c] text-white/60 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-white" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Mobile backdrop */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setOpen(false)} />
      )}

      <Sidebar profile={profile} verticals={verticals} open={open} onClose={() => setOpen(false)} onSignOut={signOut} />

      <div className="lg:ml-[224px]">
        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-5 lg:px-7 border-b border-white/[0.08] bg-[#0a0f1c]">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-white/70" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-white text-base font-medium" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Bell className="h-4 w-4 text-white/50" />
            <span className="hidden sm:block text-sm text-white/60">{profile.full_name}</span>
            <Avatar name={profile.full_name} />
          </div>
        </header>

        <main className="p-6 lg:p-9 min-h-[calc(100vh-56px)]">{children}</main>
      </div>
    </div>
  );
}

type Section = "business" | "industries" | "twbc" | "knowledge" | "config";

function getSectionFromPath(path: string, role?: string): Section | null {
  if (path === "/mission-hub/twbc-drone-proven-designs") {
    return role === "super_admin" ? "twbc" : "knowledge";
  }
  if (path === "/mission-hub/waitlist" || path === "/mission-hub/contacts") return "business";
  if (path.startsWith("/mission-hub/twbc-") || path === "/mission-hub/knowledge-uav") return "twbc";
  if (
    path.startsWith("/mission-hub/verticals/") ||
    path === "/mission-hub/design-studio" ||
    path.startsWith("/mission-hub/torqwings-design-studio")
  ) return "industries";
  if (path === "/mission-hub/users" || path.startsWith("/mission-hub/settings")) return "config";
  return null;
}

function getTwbcOpenFromPath(path: string) {
  const kb = [
    "/mission-hub/twbc-drone-design-rule",
    "/mission-hub/twbc-drone-proven-designs",
    "/mission-hub/twbc-drone-components-library",
  ].includes(path);
  const ie = ["/mission-hub/twbc-drone-rule-engine"].includes(path);
  const er = [
    "/mission-hub/twbc-drone-design-score",
    "/mission-hub/twbc-drone-approval",
    "/mission-hub/twbc-drone-feedback",
  ].includes(path);
  const drone = kb || ie || er;
  return { drone, kb, ie, er };
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

  useEffect(() => {
    const derived = getTwbcOpenFromPath(path);
    if (derived.drone) {
      setTwbcOpen(s => ({
        drone: true,
        kb: s.kb || derived.kb,
        ie: s.ie || derived.ie,
        er: s.er || derived.er,
      }));
    }
  }, [path]);

  const [twbcOpen, setTwbcOpen] = useState(() => getTwbcOpenFromPath(path));
  const toggleTwbc = (k: keyof typeof twbcOpen) => setTwbcOpen(s => ({ ...s, [k]: !s[k] }));

  const visibleVerticals: Vertical[] = isAdmin ? ALL_VERTICALS : verticals;
  const hasDesignStudio = isAdmin || verticals.includes("design-studio" as Vertical);

  return (
    <aside
      className={[
        "fixed top-0 left-0 z-50 h-full w-[224px] bg-[#141928] border-r border-white/[0.08]",
        "flex flex-col transition-transform duration-200",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      ].join(" ")}
    >
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <span className="text-white text-base" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
            Torq<span className="text-[#378ADD]">Wings</span>
          </span>
          <button className="lg:hidden text-white/50" onClick={onClose} aria-label="Close menu">
            <X className="h-4 w-4" />
          </button>
        </div>
        <span
          className="mt-2 inline-block uppercase tracking-[0.08em] text-[10px] rounded-full px-2.5 py-0.5"
          style={{ background: "rgba(55,138,221,0.12)", color: "#378ADD" }}
        >
          Mission Hub
        </span>
      </div>
      <div className="border-t border-white/[0.06]" />

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 text-[13px]">
        {isAdmin && (
          <>
            <button type="button" onClick={() => toggle("business")}
              className="mb-2 flex w-full items-center px-3 text-[10px] uppercase tracking-wider text-white/70 hover:text-white/90 transition-colors">
              <span className="flex-1 text-left">Business</span>
              {openSection === "business" ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
            {openSection === "business" && (
              <>
                <NavLink to="/mission-hub/waitlist" icon={Clock}    active={path === "/mission-hub/waitlist"} onClick={onClose}>Subscriptions</NavLink>
                <NavLink to="/mission-hub/contacts" icon={BookUser} active={path === "/mission-hub/contacts"} onClick={onClose}>Leads</NavLink>
              </>
            )}
          </>
        )}

        {visibleVerticals.length > 0 && (
          <button
            type="button"
            onClick={() => toggle("industries")}
            className="mt-5 mb-2 flex w-full items-center px-3 text-[10px] uppercase tracking-wider text-white/70 hover:text-white/90 transition-colors"
          >
            <span className="flex-1 text-left">Industries</span>
            {openSection === "industries"
              ? <ChevronDown className="h-3 w-3" />
              : <ChevronRight className="h-3 w-3" />}
          </button>
        )}
        {openSection === "industries" && visibleVerticals.map((v) => {
          const Icon = verticalIcon[v];
          const to = v === ("design-studio" as Vertical)
            ? "/mission-hub/design-studio"
            : `/mission-hub/verticals/${v}`;
          return (
            <NavLink key={v} to={to} icon={Icon} active={path === to} onClick={onClose}>
              {VERTICAL_LABELS[v]}
            </NavLink>
          );
        })}

        {isAdmin && (
          <div className="mt-5 space-y-0.5">
            <button type="button" onClick={() => toggle("twbc")}
              className="mb-2 flex w-full items-center px-3 text-[10px] uppercase tracking-wider text-white/70 hover:text-white/90 transition-colors">
              <span className="flex-1 text-left">Design Intelligence</span>
              {openSection === "twbc" ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>

            {openSection === "twbc" && <>
            {/* ── Drone (collapsible) ── */}
            <button type="button" onClick={() => toggleTwbc("drone")}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 rounded-lg text-[13px] text-white/65 hover:bg-white/[0.04] hover:text-white transition-colors">
              <Cpu className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate text-left">Drone</span>
              {twbcOpen.drone ? <ChevronDown className="h-3.5 w-3.5 opacity-50" /> : <ChevronRight className="h-3.5 w-3.5 opacity-50" />}
            </button>

            {twbcOpen.drone && (
              <div className="ml-3 border-l border-white/[0.06] pl-1.5 space-y-0.5">

                {/* Knowledge Base */}
                <button type="button" onClick={() => toggleTwbc("kb")}
                  className="flex w-full items-center gap-2 px-3 py-1.5 rounded-md text-[12px] text-white/55 hover:bg-white/[0.04] hover:text-white transition-colors">
                  <span className="flex-1 truncate text-left">Knowledge Base</span>
                  {twbcOpen.kb ? <ChevronDown className="h-3 w-3 opacity-40" /> : <ChevronRight className="h-3 w-3 opacity-40" />}
                </button>
                {twbcOpen.kb && (
                  <div className="ml-3 border-l border-white/[0.06] pl-1.5 space-y-0.5">
                    <TwbcLeaf to="/mission-hub/twbc-drone-design-rule" active={path === "/mission-hub/twbc-drone-design-rule"} onClick={onClose}>Design Rules</TwbcLeaf>
                    <TwbcLeaf to="/mission-hub/twbc-drone-proven-designs" active={path === "/mission-hub/twbc-drone-proven-designs"} onClick={onClose}>Proven Designs</TwbcLeaf>
                    <TwbcLeaf to="/mission-hub/twbc-drone-components-library" active={path === "/mission-hub/twbc-drone-components-library"} onClick={onClose}>Components</TwbcLeaf>
                  </div>
                )}

                {/* Intelligence Engine */}
                <button type="button" onClick={() => toggleTwbc("ie")}
                  className="flex w-full items-center gap-2 px-3 py-1.5 rounded-md text-[12px] text-white/55 hover:bg-white/[0.04] hover:text-white transition-colors">
                  <span className="flex-1 truncate text-left">Intelligence Engine</span>
                  {twbcOpen.ie ? <ChevronDown className="h-3 w-3 opacity-40" /> : <ChevronRight className="h-3 w-3 opacity-40" />}
                </button>
                {twbcOpen.ie && (
                  <div className="ml-3 border-l border-white/[0.06] pl-1.5 space-y-0.5">
                    <TwbcLeaf to="/mission-hub/twbc-drone-rule-engine" active={path === "/mission-hub/twbc-drone-rule-engine"} onClick={onClose}>Rule Engine</TwbcLeaf>
                  </div>
                )}

                {/* Engineer Review */}
                <button type="button" onClick={() => toggleTwbc("er")}
                  className="flex w-full items-center gap-2 px-3 py-1.5 rounded-md text-[12px] text-white/55 hover:bg-white/[0.04] hover:text-white transition-colors">
                  <span className="flex-1 truncate text-left">Engineer Review</span>
                  {twbcOpen.er ? <ChevronDown className="h-3 w-3 opacity-40" /> : <ChevronRight className="h-3 w-3 opacity-40" />}
                </button>
                {twbcOpen.er && (
                  <div className="ml-3 border-l border-white/[0.06] pl-1.5 space-y-0.5">
                    <TwbcLeaf to="/mission-hub/twbc-drone-design-score" active={path === "/mission-hub/twbc-drone-design-score"} onClick={onClose}>Design Score</TwbcLeaf>
                    <TwbcLeaf to="/mission-hub/twbc-drone-approval" active={path === "/mission-hub/twbc-drone-approval"} onClick={onClose}>Approval</TwbcLeaf>
                    <TwbcLeaf to="/mission-hub/twbc-drone-feedback" active={path === "/mission-hub/twbc-drone-feedback"} onClick={onClose}>Feedback</TwbcLeaf>
                  </div>
                )}
              </div>
            )}

            {/* ── UAV ── */}
            <NavLink to="/mission-hub/knowledge-uav" icon={BookOpen} active={path === "/mission-hub/knowledge-uav"} onClick={onClose}>
              UAV
            </NavLink>
            </>}
          </div>
        )}

        {hasDesignStudio && role !== "super_admin" && (
          <div className="mt-5 space-y-0.5">
            <button type="button" onClick={() => toggle("knowledge")}
              className="mb-2 flex w-full items-center px-3 text-[10px] uppercase tracking-wider text-white/70 hover:text-white/90 transition-colors">
              <span className="flex-1 text-left">Knowledge Base</span>
              {openSection === "knowledge" ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
            {openSection === "knowledge" && (
              <NavLink to="/mission-hub/twbc-drone-proven-designs" icon={BookOpen} active={path === "/mission-hub/twbc-drone-proven-designs"} onClick={onClose}>
                Proven Designs
              </NavLink>
            )}
          </div>
        )}

        <div className="mt-5 space-y-0.5">
          <button type="button" onClick={() => toggle("config")}
            className="mb-2 flex w-full items-center px-3 text-[10px] uppercase tracking-wider text-white/70 hover:text-white/90 transition-colors">
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
              <NavLink to="/mission-hub/settings" icon={Settings} active={path === "/mission-hub/settings"} onClick={onClose}>
                Settings
              </NavLink>
            </>
          )}
        </div>
      </nav>

      <div className="border-t border-white/[0.06] p-4">
        <div className="flex items-center gap-3">
          <Avatar name={profile.full_name} />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium text-white truncate">{profile.full_name}</div>
            <RolePill role={role} />
          </div>
        </div>
        <button
          onClick={() => { onSignOut(); toast.success("Signed out"); }}
          className="mt-3 flex items-center gap-1.5 text-[12px] text-white/50 hover:text-white"
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
      className={[
        "flex items-center gap-2.5 px-4 py-2.5 rounded-lg border-l-[3px] transition-colors",
        active
          ? "bg-[rgba(55,138,221,0.12)] border-[#378ADD] text-white"
          : "border-transparent text-white/65 hover:bg-white/[0.04] hover:text-white",
      ].join(" ")}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="truncate">{children}</span>
    </Link>
  );
}

function TwbcLeaf({ to, active, onClick, children }: { to: string; active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Link
      to={to as never}
      onClick={onClick}
      className={[
        "flex items-center px-3 py-1.5 rounded-md text-[12px] border-l-2 transition-colors",
        active
          ? "bg-[rgba(55,138,221,0.10)] border-[#378ADD] text-white"
          : "border-transparent text-white/50 hover:bg-white/[0.04] hover:text-white",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = (name || "?")
    .split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
  return (
    <div
      className="grid place-items-center rounded-full text-[12px] font-semibold flex-shrink-0"
      style={{ background: "rgba(55,138,221,0.2)", color: "#378ADD", width: 34, height: 34 }}
    >
      {initials || "?"}
    </div>
  );
}

function RolePill({ role }: { role: "super_admin" | "admin" | "user" }) {
  const styles =
    role === "super_admin"
      ? { bg: "rgba(163,45,45,0.2)", color: "#F09595", label: "Super Admin" }
      : role === "admin"
        ? { bg: "rgba(239,159,39,0.15)", color: "#EF9F27", label: "Admin" }
        : { bg: "rgba(24,95,165,0.2)", color: "#378ADD", label: "User" };
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
    <div className={`rounded-[14px] bg-[#1a2035] border border-white/[0.08] ${className}`}>{children}</div>
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
