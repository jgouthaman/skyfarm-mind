import { type ReactNode, useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Clock, BookUser, Cpu, Sprout, Building2, Map as MapIcon,
  Shield, FlaskConical, GraduationCap, Users, Settings, Bell, Menu, X, LogOut,
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

  if (loading || !profile) {
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

function Sidebar({
  profile, verticals, open, onClose, onSignOut,
}: {
  profile: any; verticals: Vertical[]; open: boolean; onClose: () => void; onSignOut: () => void;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const role = profile.role as "super_admin" | "admin" | "user";
  const isAdmin = role === "super_admin" || role === "admin";

  const items: { to: string; label: string; icon: any; show: boolean }[] = [
    { to: "/mission-hub/dashboard", label: "Dashboard", icon: LayoutDashboard, show: true },
    { to: "/mission-hub/waitlist", label: "Waitlist", icon: Clock, show: isAdmin },
    { to: "/mission-hub/contacts", label: "Contacts", icon: BookUser, show: isAdmin },
    { to: "/mission-hub/design-studio", label: "Design Studio", icon: Cpu, show: isAdmin },
  ];

  const visibleVerticals: Vertical[] = isAdmin ? ALL_VERTICALS : verticals;

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
        {items.filter((i) => i.show).map((i) => (
          <NavLink key={i.to} to={i.to} icon={i.icon} active={path === i.to} onClick={onClose}>
            {i.label}
          </NavLink>
        ))}

        {visibleVerticals.length > 0 && (
          <div className="mt-5 mb-2 px-3 text-[10px] uppercase tracking-wider text-white/30">Verticals</div>
        )}
        {visibleVerticals.map((v) => {
          const Icon = verticalIcon[v];
          const to = `/mission-hub/verticals/${v}`;
          return (
            <NavLink key={v} to={to} icon={Icon} active={path === to} onClick={onClose}>
              {VERTICAL_LABELS[v]}
            </NavLink>
          );
        })}

        <div className="mt-5 space-y-0.5">
          {isAdmin && (
            <NavLink to="/mission-hub/users" icon={Users} active={path === "/mission-hub/users"} onClick={onClose}>
              Users
            </NavLink>
          )}
          <NavLink to="/mission-hub/settings" icon={Settings} active={path === "/mission-hub/settings"} onClick={onClose}>
            Settings
          </NavLink>
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
