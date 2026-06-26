import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateUserSchema = z.object({
  full_name: z.string().min(1).max(120),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  role: z.enum(["user", "admin", "super_admin"]),
  industries: z.array(z.string()).default([]),
});

export const createMissionHubUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => CreateUserSchema.parse(d))
  .handler(async ({ data, context }) => {
    // Verify caller is an active admin or super_admin.
    const { data: caller } = await context.supabase
      .from("mission_hub_users")
      .select("role, status")
      .eq("id", context.userId)
      .maybeSingle();
    if (!caller || caller.status !== "active" || (caller.role !== "admin" && caller.role !== "super_admin")) {
      throw new Error("Forbidden");
    }
    // Admins cannot create admin or super_admin accounts.
    let role = data.role;
    if (caller.role === "admin" && role !== "user") {
      role = "user";
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (cErr || !created?.user) throw new Error(cErr?.message ?? "Failed to create user");
    const newId = created.user.id;

    const { error: uErr } = await supabaseAdmin
      .from("mission_hub_users")
      .upsert(
        {
          id: newId,
          full_name: data.full_name,
          email: data.email,
          role,
          status: "active",
          industries: data.industries,
        },
        { onConflict: "id" },
      );
    if (uErr) {
      // Roll back the auth user so a retry isn't blocked by "email already exists".
      await supabaseAdmin.auth.admin.deleteUser(newId);
      throw new Error(uErr.message);
    }

    return { ok: true, id: newId };
  });

const UpdateUserSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().min(1).max(120).optional(),
  role: z.enum(["user", "admin", "super_admin"]).optional(),
  status: z.enum(["active", "inactive", "pending"]).optional(),
  industries: z.array(z.string()).optional(),
});

export const updateMissionHubUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => UpdateUserSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: caller } = await context.supabase
      .from("mission_hub_users")
      .select("role, status")
      .eq("id", context.userId)
      .maybeSingle();
    if (!caller || caller.status !== "active") throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const patch: Record<string, any> = {};
    if (data.full_name !== undefined) patch.full_name = data.full_name;
    if (data.status !== undefined) patch.status = data.status;
    if (data.industries !== undefined) {
      if (caller.role !== "admin" && caller.role !== "super_admin") throw new Error("Forbidden");
      patch.industries = data.industries;
    }
    if (data.role !== undefined) {
      if (caller.role !== "super_admin") throw new Error("Only super admin can change roles");
      patch.role = data.role;
    }
    if (Object.keys(patch).length) {
      const { error } = await supabaseAdmin.from("mission_hub_users").update(patch as any).eq("id", data.id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
