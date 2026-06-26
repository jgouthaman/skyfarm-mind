import { MhCard } from "@/components/mission-hub/Shell";
import { RoleBadge } from "@/components/mission-hub/RoleBadge";
import type { Industry, MhUser, UserStatus } from "@/lib/mission-hub/types";

const STATUS_STYLE: Record<UserStatus, { dot: string; text: string; label: string }> = {
  active: { dot: "bg-[#1D9E75]", text: "text-[#1D9E75]", label: "Active" },
  inactive: { dot: "bg-white/30", text: "text-white/40", label: "Inactive" },
  pending: { dot: "bg-[#EF9F27]", text: "text-[#EF9F27]", label: "Pending" },
};

export function UserTable({
  users,
  industries,
  isSuper,
  onSelect,
}: {
  users: MhUser[];
  industries: Industry[];
  isSuper: boolean;
  onSelect: (user: MhUser) => void;
}) {
  const industryName = (slug: string) => industries.find((i) => i.slug === slug)?.name ?? slug;

  return (
    <MhCard className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#0a0f1c] text-[11px] uppercase tracking-wider text-white/40 text-left">
              <th className="px-4 py-3 font-normal">Name</th>
              <th className="px-4 py-3 font-normal">Email</th>
              <th className="px-4 py-3 font-normal">Role</th>
              <th className="px-4 py-3 font-normal">Industries</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal">Created</th>
              <th className="px-4 py-3 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const ids = u.industries ?? [];
              const status = STATUS_STYLE[u.status] ?? STATUS_STYLE.inactive;
              return (
                <tr key={u.id} className="border-t border-white/[0.05] hover:bg-white/[0.03]">
                  <td className="px-4 py-3 text-white/90">{u.full_name}</td>
                  <td className="px-4 py-3 text-white/70 text-[12px]">{u.email}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {ids.slice(0, 3).map((id) => (
                        <span
                          key={id}
                          className="text-[11px] px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}
                        >
                          {industryName(id)}
                        </span>
                      ))}
                      {ids.length > 3 && <span className="text-[11px] text-white/40">+{ids.length - 3}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12px]">
                    <span className={`inline-flex items-center gap-1.5 ${status.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-white/60">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onSelect(u)}
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
  );
}
