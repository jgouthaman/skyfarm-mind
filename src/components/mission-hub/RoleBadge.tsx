export function RoleBadge({ role }: { role: string }) {
  const s =
    role === "super_admin"
      ? { bg: "rgba(188,54,54,0.12)", color: "#B23A3A", label: "Super Admin" }
      : role === "admin"
        ? { bg: "rgba(232,163,61,0.15)", color: "#B8791F", label: "Admin" }
        : { bg: "rgba(28,116,184,0.12)", color: "#1C74B8", label: "User" };
  return (
    <span
      className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}
