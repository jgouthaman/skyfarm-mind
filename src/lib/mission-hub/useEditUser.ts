import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { updateMissionHubUser } from "./admin.functions";
import type { Role, UserStatus } from "./types";

export type EditUserInput = {
  id: string;
  full_name?: string;
  role?: Role;
  industries?: string[];
};

// Wraps the updateMissionHubUser server function for editing details and
// flipping account status.
export function useEditUser() {
  const update = useServerFn(updateMissionHubUser);
  const [submitting, setSubmitting] = useState(false);

  async function save(input: EditUserInput): Promise<boolean> {
    setSubmitting(true);
    try {
      await update({ data: input });
      toast.success("Saved");
      return true;
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function setStatus(id: string, status: UserStatus): Promise<boolean> {
    setSubmitting(true);
    try {
      await update({ data: { id, status } });
      toast.success(status === "active" ? "Reactivated" : "Deactivated");
      return true;
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  return { submitting, save, setStatus };
}
