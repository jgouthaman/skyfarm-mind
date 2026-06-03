import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plane, ArrowLeft, UserPlus, KeyRound, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useControlAuth } from "@/hooks/useControlAuth";
import { createControlUser, listControlUsers, setUserPassword } from "@/lib/admin.functions";

export const Route = createFileRoute("/control-center/users")({
  head: () => ({ meta: [{ title: "AeroSpawn Control Center — Users" }] }),
  component: UsersPage,
});

type ControlUser = { user_id: string; phone: string; full_name: string | null; roles: string[]; created_at: string };

function UsersPage() {
  const auth = useControlAuth();
  const navigate = useNavigate();
  const list = useServerFn(listControlUsers);
  const create = useServerFn(createControlUser);
  const resetPwd = useServerFn(setUserPassword);

  const [users, setUsers] = useState<ControlUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"sme" | "admin">("sme");
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [newPwd, setNewPwd] = useState("");

  useEffect(() => {
    if (!auth.loading && !auth.userId) navigate({ to: "/control-center/login" });
  }, [auth.loading, auth.userId, navigate]);

  const refresh = async () => {
    try {
      const r = (await list()) as ControlUser[];
      setUsers(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load users.");
    }
  };

  useEffect(() => {
    if (auth.isAdmin) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAdmin]);

  if (auth.loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  if (!auth.userId) return null;
  if (!auth.isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div>
          <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground" />
          <h1 className="mt-4 text-xl font-semibold">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">You don't have permission to manage control center users.</p>
          <Button asChild className="mt-4"><Link to="/control-center">Back to Control Center</Link></Button>
        </div>
      </div>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(phone)) return toast.error("Mobile must be 10 digits.");
    if (password.length < 8) return toast.error("Password must be ≥ 8 chars.");
    if (!fullName.trim()) return toast.error("Enter the user's name.");
    setLoading(true);
    try {
      await create({ data: { phone, password, fullName: fullName.trim(), role } });
      toast.success("User created");
      setPhone(""); setPassword(""); setFullName(""); setRole("sme");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create user.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPwd = async (userId: string) => {
    if (newPwd.length < 8) return toast.error("Password must be ≥ 8 chars.");
    setLoading(true);
    try {
      await resetPwd({ data: { userId, password: newPwd } });
      toast.success("Password updated");
      setResetFor(null); setNewPwd("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster richColors position="top-center" theme="dark" />
      <header className="border-b border-border/60 bg-card/40 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-5 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/control-center" className="flex items-center gap-2 font-display font-semibold text-lg">
            <span className="grid place-items-center h-8 w-8 rounded-lg bg-gradient-primary shadow-glow">
              <Plane className="h-4 w-4 text-primary-foreground" />
            </span>
            <span>AeroSpawn <span className="text-muted-foreground font-normal">/ Users</span></span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/control-center"><ArrowLeft className="h-4 w-4 mr-1" /> Control Center</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 lg:px-8 py-10 space-y-10">
        <section>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" /> Add a control center user</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create a new SME or admin account. The user signs in with their mobile number and the password you set.</p>
          <form onSubmit={handleCreate} className="mt-5 rounded-2xl border border-border/60 bg-card/60 p-6 grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="u-name">Full name</Label>
              <Input id="u-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-phone">Mobile (10 digits)</Label>
              <Input id="u-phone" inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-pwd">Password</Label>
              <Input id="u-pwd" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-role">Role</Label>
              <select
                id="u-role"
                value={role}
                onChange={(e) => setRole(e.target.value as "sme" | "admin")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="sme">SME</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={loading} className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
                {loading ? "Saving…" : "Create user"}
              </Button>
            </div>
          </form>
        </section>

        <section>
          <h2 className="text-xl font-semibold flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Existing users</h2>
          <div className="mt-4 rounded-2xl border border-border/60 bg-card/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Mobile</th>
                  <th className="text-left px-4 py-3 font-medium">Roles</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No users yet.</td></tr>
                )}
                {users.map((u) => (
                  <tr key={u.user_id} className="border-t border-border/40">
                    <td className="px-4 py-3">{u.full_name ?? "—"}</td>
                    <td className="px-4 py-3 font-mono">{u.phone}</td>
                    <td className="px-4 py-3">
                      {u.roles.map((r) => (
                        <span key={r} className={`inline-block mr-1 text-xs px-2 py-0.5 rounded-full border ${r === "admin" ? "bg-primary/15 text-primary border-primary/30" : "bg-accent/15 text-accent border-accent/30"}`}>
                          {r}
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {resetFor === u.user_id ? (
                        <div className="inline-flex items-center gap-2">
                          <Input
                            type="password"
                            placeholder="New password"
                            value={newPwd}
                            onChange={(e) => setNewPwd(e.target.value)}
                            className="h-8 w-40"
                          />
                          <Button size="sm" onClick={() => handleResetPwd(u.user_id)} disabled={loading}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => { setResetFor(null); setNewPwd(""); }}>Cancel</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setResetFor(u.user_id)}>
                          <KeyRound className="h-3.5 w-3.5 mr-1" /> Reset password
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
