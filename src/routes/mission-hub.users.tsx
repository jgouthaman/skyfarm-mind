import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MissionHubShell, MhCard } from "@/components/mission-hub/Shell";
import { SlidePanel, Field } from "@/components/mission-hub/SlidePanel";
import { useMissionHubAuth } from "@/lib/mission-hub/context";
import { ALL_VERTICALS, VERTICAL_LABELS, type Vertical } from "@/lib/mission-hub/types";
import { createMissionHubUser, updateMissionHubUser } from "@/lib/mission-hub/admin.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { UserPlus, Copy, CircleCheck, X } from "lucide-react";

export const Route = createFileRoute("/mission-hub/users")({
  component: UsersPage,
});

function UsersPage() {
  const { profile, loading } = useMissionHubAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === "admin";
  const isSuper = profile?.role === "super_admin";

  useEffect(() => {
    if (!loading && profile && profile.role === "user") {
      toast.error("Access restricted.");
      navigate({ to: "/mission-hub/dashboard" });
    }
  }, [loading, profile, navigate]);

  const [users, setUsers] = useState<any[]>([]);
  const [vmap, setVmap] = useState<Record<string, Vertical[]>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, role, is_active, created_at, created_by")
        .order("created_at", { ascending: false });
      setUsers(data ?? []);
      const { data: v } = await supabase.from("user_verticals").select("user_id, vertical");
      const m: Record<string, Vertical[]> = {};
      ((v as any) ?? []).forEach((r: any) => {
        m[r.user_id] = [...(m[r.user_id] ?? []), r.vertical];
      });
      setVmap(m);
    })();
  }, [reloadKey]);

  return (
    <MissionHubShell title="Users">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[22px] text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Users</h2>
          <span className="text-[12px] px-2.5 py-0.5 rounded-full" style={{ background: "rgba(55,138,221,0.12)", color: "#378ADD" }}>{users.length}</span>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-[#185FA5] hover:bg-[#378ADD] text-white text-[13px] rounded-lg px-3.5 py-2 transition-colors"
        >
          <UserPlus className="h-3.5 w-3.5" /> Create user
        </button>
      </div>

      <MhCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0a0f1c] text-[11px] uppercase tracking-wider text-white/40 text-left">
                <th className="px-4 py-3 font-normal">Name</th>
                <th className="px-4 py-3 font-normal">Email</th>
                <th className="px-4 py-3 font-normal">Role</th>
                <th className="px-4 py-3 font-normal">Verticals</th>
                <th className="px-4 py-3 font-normal">Status</th>
                <th className="px-4 py-3 font-normal">Created</th>
                <th className="px-4 py-3 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const vs = vmap[u.user_id] ?? [];
                return (
                  <tr key={u.user_id} className="border-t border-white/[0.05] hover:bg-white/[0.03]">
                    <td className="px-4 py-3 text-white/90">{u.full_name}</td>
                    <td className="px-4 py-3 text-white/70 text-[12px]">{u.email}</td>
                    <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {vs.slice(0, 3).map((v) => (
                          <span key={v} className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
                            {VERTICAL_LABELS[v]}
                          </span>
                        ))}
                        {vs.length > 3 && <span className="text-[11px] text-white/40">+{vs.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px]">
                      <span className={`inline-flex items-center gap-1.5 ${u.is_active ? "text-[#1D9E75]" : "text-white/40"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${u.is_active ? "bg-[#1D9E75]" : "bg-white/30"}`} />
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-white/60">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setEditing({ ...u, verticals: vs })}
                        className="text-[12px] border border-white/[0.1] rounded px-2.5 py-1 text-white/70 hover:text-white"
                      >
                        {isSuper ? "Edit" : "View"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </MhCard>

      {showCreate && (
        <CreateUserModal
          canCreateAdmin={!!isSuper}
          forceUserRole={!!isAdmin}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setReloadKey((k) => k + 1); }}
        />
      )}

      <EditUserPanel
        editing={editing}
        canEdit={!!isSuper}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); setReloadKey((k) => k + 1); }}
      />
    </MissionHubShell>
  );
}

function RoleBadge({ role }: { role: string }) {
  const s = role === "super_admin"
    ? { bg: "rgba(163,45,45,0.2)", color: "#F09595", label: "Super Admin" }
    : role === "admin"
      ? { bg: "rgba(239,159,39,0.15)", color: "#EF9F27", label: "Admin" }
      : { bg: "rgba(24,95,165,0.2)", color: "#378ADD", label: "User" };
  return <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>{s.label}</span>;
}

function CreateUserModal({
  canCreateAdmin, forceUserRole, onClose, onCreated,
}: { canCreateAdmin: boolean; forceUserRole: boolean; onClose: () => void; onCreated: () => void }) {
  const create = useServerFn(createMissionHubUser);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState(""); const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState(""); const [showPwd, setShowPwd] = useState(false);
  const [role, setRole] = useState<"user" | "admin" | "super_admin">("user");
  const [verts, setVerts] = useState<Vertical[]>([]);

  function toggle(v: Vertical) {
    setVerts((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setSubmitting(true);
    try {
      await create({ data: { full_name: name, email, password: pwd, role: forceUserRole ? "user" : role, verticals: verts } });
      setSuccess(true); onCreated();
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-[480px] rounded-2xl bg-[#141928] p-9 relative" onClick={(e) => e.stopPropagation()} style={{ border: "0.5px solid rgba(255,255,255,0.08)" }}>
        <button onClick={onClose} className="absolute right-4 top-4 text-white/50 hover:text-white"><X className="h-5 w-5" /></button>
        {success ? (
          <div className="text-center py-4">
            <CircleCheck className="h-10 w-10 mx-auto text-[#1D9E75]" />
            <h3 className="mt-4 text-white text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>User created successfully</h3>
            <p className="mt-2 text-[13px] text-white/60">They can sign in at torqwings.com/mission-hub/login using the temporary password you set.</p>
            <button onClick={onClose} className="mt-5 w-full rounded-lg border border-white/20 text-white py-2.5 text-sm hover:bg-white/5">Close</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3.5">
            <h3 className="text-white text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Create new user</h3>
            <Inp label="Full name" value={name} setValue={setName} required />
            <Inp label="Email address" type="email" value={email} setValue={setEmail} required />
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-white/50 mb-1.5">Temporary password</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"} value={pwd} required minLength={8}
                  onChange={(e) => setPwd(e.target.value)}
                  className="w-full bg-[#1a2035] rounded-lg pl-3.5 pr-20 py-2.5 text-sm text-white" style={{ border: "0.5px solid rgba(255,255,255,0.1)" }}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button type="button" onClick={() => setShowPwd((s) => !s)} className="text-white/40 text-[11px] px-1.5">{showPwd ? "Hide" : "Show"}</button>
                  <button type="button" onClick={() => { navigator.clipboard.writeText(pwd); toast.success("Copied"); }} className="text-white/40"><Copy className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-white/50 mb-1.5">Role</label>
              {forceUserRole ? (
                <div className="bg-[#0a0f1c] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white/60">User</div>
              ) : (
                <select value={role} onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-[#1a2035] rounded-lg px-3.5 py-2.5 text-sm text-white" style={{ border: "0.5px solid rgba(255,255,255,0.1)" }}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  {canCreateAdmin && <option value="super_admin">Super Admin</option>}
                </select>
              )}
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-white/50 mb-1.5">Map to verticals</label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_VERTICALS.map((v) => (
                  <label key={v} className="flex items-center gap-2 text-[13px] text-white/80 bg-[#1a2035] rounded-lg px-3 py-2 cursor-pointer" style={{ border: "0.5px solid rgba(255,255,255,0.08)" }}>
                    <input type="checkbox" checked={verts.includes(v)} onChange={() => toggle(v)} />
                    {VERTICAL_LABELS[v]}
                  </label>
                ))}
              </div>
            </div>
            {err && <div className="rounded-lg px-3.5 py-2.5 text-[13px] text-[#F09595]" style={{ background: "rgba(163,45,45,0.15)", border: "0.5px solid rgba(163,45,45,0.4)" }}>{err}</div>}
            <button type="submit" disabled={submitting} className="w-full rounded-lg bg-[#185FA5] hover:bg-[#378ADD] text-white py-3">
              {submitting ? "Creating…" : "Create user"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function EditUserPanel({
  editing, canEdit, onClose, onSaved,
}: { editing: any | null; canEdit: boolean; onClose: () => void; onSaved: () => void }) {
  const update = useServerFn(updateMissionHubUser);
  const [name, setName] = useState(""); const [role, setRole] = useState("user");
  const [verts, setVerts] = useState<Vertical[]>([]); const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editing) {
      setName(editing.full_name ?? "");
      setRole(editing.role);
      setVerts(editing.verticals ?? []);
      setActive(editing.is_active);
    }
  }, [editing]);

  if (!editing) return <SlidePanel open={false} onClose={onClose}>{null}</SlidePanel>;

  async function save() {
    setSubmitting(true);
    try {
      await update({ data: { user_id: editing.user_id, full_name: name, role: canEdit ? (role as any) : undefined, verticals: verts } });
      toast.success("Saved"); onSaved();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setSubmitting(false); }
  }

  async function toggleActive() {
    setSubmitting(true);
    try {
      await update({ data: { user_id: editing.user_id, is_active: !active } });
      toast.success(active ? "Deactivated" : "Reactivated"); onSaved();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setSubmitting(false); }
  }

  return (
    <SlidePanel
      open={!!editing} onClose={onClose}
      title={<h3 className="text-white text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{canEdit ? "Edit user" : "User details"}</h3>}
    >
      <div className="space-y-4">
        {canEdit ? (
          <>
            <Inp label="Full name" value={name} setValue={setName} />
            <Field label="Email" value={editing.email} />
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-white/50 mb-1.5">Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}
                className="w-full bg-[#1a2035] rounded-lg px-3.5 py-2.5 text-sm text-white" style={{ border: "0.5px solid rgba(255,255,255,0.1)" }}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-white/50 mb-1.5">Verticals</label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_VERTICALS.map((v) => (
                  <label key={v} className="flex items-center gap-2 text-[13px] text-white/80 bg-[#1a2035] rounded-lg px-3 py-2 cursor-pointer" style={{ border: "0.5px solid rgba(255,255,255,0.08)" }}>
                    <input type="checkbox" checked={verts.includes(v)} onChange={() => setVerts(verts.includes(v) ? verts.filter((x) => x !== v) : [...verts, v])} />
                    {VERTICAL_LABELS[v]}
                  </label>
                ))}
              </div>
            </div>
            <button onClick={save} disabled={submitting} className="w-full rounded-lg bg-[#185FA5] hover:bg-[#378ADD] text-white py-2.5 text-sm">Save changes</button>
            <button onClick={toggleActive} disabled={submitting}
              className={`w-full rounded-lg py-2.5 text-sm ${active ? "bg-[rgba(163,45,45,0.2)] text-[#F09595] border border-[rgba(163,45,45,0.4)]" : "bg-[rgba(29,158,117,0.15)] text-[#1D9E75] border border-[rgba(29,158,117,0.4)]"}`}>
              {active ? "Deactivate account" : "Reactivate"}
            </button>
          </>
        ) : (
          <>
            <Field label="Full name" value={editing.full_name} />
            <Field label="Email" value={editing.email} />
            <Field label="Role" value={<RoleBadge role={editing.role} />} />
            <Field label="Status" value={editing.is_active ? "Active" : "Inactive"} />
            <Field label="Verticals" value={(editing.verticals ?? []).map((v: Vertical) => VERTICAL_LABELS[v]).join(", ") || "—"} />
          </>
        )}
      </div>
    </SlidePanel>
  );
}

function Inp({ label, value, setValue, type = "text", required }: { label: string; value: string; setValue: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider text-white/50 mb-1.5">{label}</label>
      <input type={type} value={value} required={required} onChange={(e) => setValue(e.target.value)}
        className="w-full bg-[#1a2035] rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#378ADD]/60" style={{ border: "0.5px solid rgba(255,255,255,0.1)" }} />
    </div>
  );
}
