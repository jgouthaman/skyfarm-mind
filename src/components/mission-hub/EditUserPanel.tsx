import { useEffect, useState } from "react";
import { SlidePanel, Field } from "@/components/mission-hub/SlidePanel";
import { RoleBadge } from "@/components/mission-hub/RoleBadge";
import { useEditUser } from "@/lib/mission-hub/useEditUser";
import { STATUS_LABELS, type Industry, type MhUser, type Role } from "@/lib/mission-hub/types";

export function EditUserPanel({
  editing,
  industries,
  canEdit,
  onClose,
  onSaved,
}: {
  editing: MhUser | null;
  industries: Industry[];
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { submitting, save, setStatus } = useEditUser();
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [industrySlugs, setIndustrySlugs] = useState<string[]>([]);
  const [status, setStatusState] = useState<MhUser["status"]>("active");

  useEffect(() => {
    if (editing) {
      setName(editing.full_name ?? "");
      setRole(editing.role);
      setIndustrySlugs(editing.industries ?? []);
      setStatusState(editing.status);
    }
  }, [editing]);

  if (!editing) return <SlidePanel open={false} onClose={onClose}>{null}</SlidePanel>;

  const industryName = (slug: string) => industries.find((i) => i.slug === slug)?.name ?? slug;
  const isActive = status === "active";

  async function handleSave() {
    if (!editing) return;
    const ok = await save({
      id: editing.id,
      full_name: name,
      role: canEdit ? role : undefined,
      industries: industrySlugs,
    });
    if (ok) onSaved();
  }

  async function handleToggleStatus() {
    if (!editing) return;
    const ok = await setStatus(editing.id, isActive ? "inactive" : "active");
    if (ok) onSaved();
  }

  return (
    <SlidePanel
      open={!!editing}
      onClose={onClose}
      title={
        <h3 className="text-white text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {canEdit ? "Edit user" : "User details"}
        </h3>
      }
    >
      <div className="space-y-4">
        {canEdit ? (
          <>
            <Inp label="Full name" value={name} setValue={setName} />
            <Field label="Email" value={editing.email} />
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-white/50 mb-1.5">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full bg-[#1a2035] rounded-lg px-3.5 py-2.5 text-sm text-white"
                style={{ border: "0.5px solid rgba(255,255,255,0.1)" }}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-white/50 mb-1.5">Industries</label>
              <div className="grid grid-cols-2 gap-2">
                {industries.map((ind) => (
                  <label
                    key={ind.id}
                    className="flex items-center gap-2 text-[13px] text-white/80 bg-[#1a2035] rounded-lg px-3 py-2 cursor-pointer"
                    style={{ border: "0.5px solid rgba(255,255,255,0.08)" }}
                  >
                    <input
                      type="checkbox"
                      checked={industrySlugs.includes(ind.slug)}
                      onChange={() =>
                        setIndustrySlugs(
                          industrySlugs.includes(ind.slug)
                            ? industrySlugs.filter((x) => x !== ind.slug)
                            : [...industrySlugs, ind.slug],
                        )
                      }
                    />
                    {ind.name}
                  </label>
                ))}
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={submitting}
              className="w-full rounded-lg bg-[#185FA5] hover:bg-[#378ADD] text-white py-2.5 text-sm"
            >
              Save changes
            </button>
            <button
              onClick={handleToggleStatus}
              disabled={submitting}
              className={`w-full rounded-lg py-2.5 text-sm ${
                isActive
                  ? "bg-[rgba(163,45,45,0.2)] text-[#F09595] border border-[rgba(163,45,45,0.4)]"
                  : "bg-[rgba(29,158,117,0.15)] text-[#1D9E75] border border-[rgba(29,158,117,0.4)]"
              }`}
            >
              {isActive ? "Deactivate account" : "Reactivate"}
            </button>
          </>
        ) : (
          <>
            <Field label="Full name" value={editing.full_name} />
            <Field label="Email" value={editing.email} />
            <Field label="Role" value={<RoleBadge role={editing.role} />} />
            <Field label="Status" value={STATUS_LABELS[editing.status]} />
            <Field
              label="Industries"
              value={(editing.industries ?? []).map(industryName).join(", ") || "—"}
            />
          </>
        )}
      </div>
    </SlidePanel>
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
      <label className="block text-[11px] uppercase tracking-wider text-white/50 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => setValue(e.target.value)}
        className="w-full bg-[#1a2035] rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#378ADD]/60"
        style={{ border: "0.5px solid rgba(255,255,255,0.1)" }}
      />
    </div>
  );
}
