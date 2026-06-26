export function RoleBadge({ role }: { role: string }) {
  const s =
    role === "super_admin"
      ? { bg: "rgba(163,45,45,0.2)", color: "#F09595", label: "Super Admin" }
      : role === "admin"
        ? { bg: "rgba(239,159,39,0.15)", color: "#EF9F27", label: "Admin" }
        : { bg: "rgba(24,95,165,0.2)", color: "#378ADD", label: "User" };
  return (
    <span
      className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}
