import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createMissionHubUser } from "./admin.functions";
import type { Role } from "./types";

export type CreateUserInput = {
  full_name: string;
  email: string;
  password: string;
  role: Role;
  industries: string[];
};

// Wraps the createMissionHubUser server function and tracks submission state.
export function useCreateUser() {
  const create = useServerFn(createMissionHubUser);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function createUser(input: CreateUserInput): Promise<boolean> {
    setErr(null);
    setSubmitting(true);
    try {
      await create({ data: input });
      setSuccess(true);
      return true;
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  return { submitting, success, err, createUser };
}
