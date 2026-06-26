import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MissionHubShell } from "@/components/mission-hub/Shell";
import { UserTable } from "@/components/mission-hub/UserTable";
import { CreateUserModal } from "@/components/mission-hub/CreateUserModal";
import { EditUserPanel } from "@/components/mission-hub/EditUserPanel";
import { useMissionHubAuth } from "@/lib/mission-hub/context";
import { useMissionHubUsers } from "@/lib/mission-hub/useMissionHubUsers";
import type { MhUser } from "@/lib/mission-hub/types";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

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

  const { users, industries, reload } = useMissionHubUsers();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<MhUser | null>(null);

  return (
    <MissionHubShell title="Users">
      <div className="flex items-center justify-between mb-5">
        <span className="text-[12px] px-2.5 py-0.5 rounded-full" style={{ background: "rgba(55,138,221,0.12)", color: "#378ADD" }}>{users.length} users</span>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-[#185FA5] hover:bg-[#378ADD] text-white text-[13px] rounded-lg px-3.5 py-2 transition-colors"
        >
          <UserPlus className="h-3.5 w-3.5" /> Create user
        </button>
      </div>

      <UserTable users={users} industries={industries} isSuper={!!isSuper} onSelect={setEditing} />

      {showCreate && (
        <CreateUserModal
          industries={industries}
          canCreateAdmin={!!isSuper}
          forceUserRole={!!isAdmin}
          onClose={() => setShowCreate(false)}
          onCreated={reload}
        />
      )}

      <EditUserPanel
        editing={editing}
        industries={industries}
        canEdit={!!isSuper}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
        }}
      />
    </MissionHubShell>
  );
}
