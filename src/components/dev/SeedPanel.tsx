import { useEffect, useState } from "react";
import { checkSuperAdminExists, seedSuperAdmin } from "@/lib/mission-hub/seed.functions";

export function SeedPanel() {
  // Dev-only utility — never rendered in production builds.
  if (!import.meta.env.DEV) return null;
  return <SeedPanelInner />;
}

function SeedPanelInner() {
  const [exists, setExists] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    checkSuperAdminExists()
      .then((r) => setExists(r.exists))
      .catch(() => setExists(true));
  }, []);

  if (exists === null) return null;
  if (exists) {
    return <p className="mt-4 text-center text-[11px] text-white/30">Super admin already configured</p>;
  }

  return (
    <div className="mt-6 rounded-xl p-4 bg-[#141928]" style={{ border: "0.5px dashed rgba(239,159,39,0.4)" }}>
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left text-[12px] text-[#EF9F27]">
        🔧 Seed first super admin (dev only)
      </button>
      {open && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitting(true);
            setMsg(null);
            try {
              await seedSuperAdmin({ data: { full_name: name, email, password } });
              setMsg("Super admin created. Sign in above.");
              setExists(true);
            } catch (err: any) {
              setMsg(err?.message ?? "Failed");
            } finally {
              setSubmitting(false);
            }
          }}
          className="mt-3 space-y-2"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            required
            className="w-full bg-[#0a0f1c] border border-white/10 rounded px-3 py-2 text-sm text-white"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Email"
            required
            className="w-full bg-[#0a0f1c] border border-white/10 rounded px-3 py-2 text-sm text-white"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Password (min 8)"
            required
            minLength={8}
            className="w-full bg-[#0a0f1c] border border-white/10 rounded px-3 py-2 text-sm text-white"
          />
          <button disabled={submitting} className="w-full bg-[#EF9F27] text-[#0a0f1c] rounded py-2 text-sm font-medium">
            {submitting ? "Creating…" : "Create super admin"}
          </button>
          {msg && <p className="text-[12px] text-white/70">{msg}</p>}
        </form>
      )}
    </div>
  );
}
