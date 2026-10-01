import { useState } from "react";
import { toast } from "sonner";
import { Copy, CircleCheck, X } from "lucide-react";
import { useCreateUser } from "@/lib/mission-hub/useCreateUser";
import type { Industry, Role } from "@/lib/mission-hub/types";

export function CreateUserModal({
  industries,
  canCreateAdmin,
  forceUserRole,
  onClose,
  onCreated,
}: {
  industries: Industry[];
  canCreateAdmin: boolean;
  forceUserRole: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { submitting, success, err, createUser } = useCreateUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [role, setRole] = useState<Role>("user");
  const [industrySlugs, setIndustrySlugs] = useState<string[]>([]);

  function toggle(slug: string) {
    setIndustrySlugs((prev) => (prev.includes(slug) ? prev.filter((x) => x !== slug) : [...prev, slug]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await createUser({
      full_name: name,
      email,
      password: pwd,
      role: forceUserRole ? "user" : role,
      industries: industrySlugs,
    });
    if (ok) onCreated();
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-[480px] rounded-2xl p-9 relative"
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--mh-bg)", border: "1px solid var(--mh-hairline)" }}
      >
        <button onClick={onClose} className="absolute right-4 top-4" style={{ color: "var(--mh-dim)" }}>
          <X className="h-5 w-5" />
        </button>
        {success ? (
          <div className="text-center py-4">
            <CircleCheck className="h-10 w-10 mx-auto text-[#1D9E75]" />
            <h3 className="mt-4 text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--mh-ink)" }}>
              User created successfully
            </h3>
            <p className="mt-2 text-[13px]" style={{ color: "var(--mh-dim)" }}>
              They can sign in at torqwings.com/mission-hub/login using the temporary password you set.
            </p>
            <button
              onClick={onClose}
              className="mt-5 w-full rounded-lg py-2.5 text-sm transition-colors"
              style={{ border: "1px solid var(--mh-hairline)", color: "var(--mh-ink)" }}
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3.5">
            <h3 className="text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--mh-ink)" }}>
              Create new user
            </h3>
            <Inp label="Full name" value={name} setValue={setName} required />
            <Inp label="Email address" type="email" value={email} setValue={setEmail} required />
            <div>
              <label className="block text-[11px] uppercase tracking-wider mb-1.5" style={{ color: "var(--mh-dim)" }}>Temporary password</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={pwd}
                  required
                  minLength={8}
                  onChange={(e) => setPwd(e.target.value)}
                  className="w-full rounded-lg pl-3.5 pr-20 py-2.5 text-sm"
                  style={{ background: "var(--mh-panel)", border: "1px solid var(--mh-hairline)", color: "var(--mh-ink)" }}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button type="button" onClick={() => setShowPwd((s) => !s)} className="text-[11px] px-1.5" style={{ color: "var(--mh-dim)" }}>
                    {showPwd ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(pwd);
                      toast.success("Copied");
                    }}
                    style={{ color: "var(--mh-dim)" }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider mb-1.5" style={{ color: "var(--mh-dim)" }}>Role</label>
              {forceUserRole ? (
                <div className="rounded-lg px-3.5 py-2.5 text-sm" style={{ background: "var(--mh-panel)", border: "1px solid var(--mh-hairline)", color: "var(--mh-dim)" }}>User</div>
              ) : (
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full rounded-lg px-3.5 py-2.5 text-sm"
                  style={{ background: "var(--mh-panel)", border: "1px solid var(--mh-hairline)", color: "var(--mh-ink)" }}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  {canCreateAdmin && <option value="super_admin">Super Admin</option>}
                </select>
              )}
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider mb-1.5" style={{ color: "var(--mh-dim)" }}>Map to industries</label>
              <div className="grid grid-cols-2 gap-2">
                {industries.map((ind) => (
                  <label
                    key={ind.id}
                    className="flex items-center gap-2 text-[13px] rounded-lg px-3 py-2 cursor-pointer"
                    style={{ background: "var(--mh-panel)", border: "1px solid var(--mh-hairline)", color: "var(--mh-paper)" }}
                  >
                    <input type="checkbox" checked={industrySlugs.includes(ind.slug)} onChange={() => toggle(ind.slug)} />
                    {ind.name}
                  </label>
                ))}
              </div>
            </div>
            {err && (
              <div
                className="rounded-lg px-3.5 py-2.5 text-[13px]"
                style={{ background: "rgba(188,54,54,0.1)", border: "1px solid rgba(188,54,54,0.35)", color: "#B23A3A" }}
              >
                {err}
              </div>
            )}
            <button type="submit" disabled={submitting} className="w-full rounded-lg text-white py-3 transition-colors" style={{ background: "var(--mh-blue)" }}>
              {submitting ? "Creating…" : "Create user"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Inp({
  label,
  value,
  setValue,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider mb-1.5" style={{ color: "var(--mh-dim)" }}>{label}</label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none"
        style={{ background: "var(--mh-panel)", border: "1px solid var(--mh-hairline)", color: "var(--mh-ink)" }}
      />
    </div>
  );
}
