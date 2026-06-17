import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateUserSchema = z.object({
  full_name: z.string().min(1).max(120),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  role: z.enum(["user", "admin", "super_admin"]),
  verticals: z.array(z.enum(["agrisky", "infrasky", "geosky", "guardsky", "labs", "academy"])).default([]),
});

export const createMissionHubUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateUserSchema.parse(d))
  .handler(async ({ data, context }) => {
    // Verify caller is admin or super_admin
    const { data: caller } = await context.supabase
      .from("profiles")
      .select("role, is_active")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!caller || !caller.is_active || (caller.role !== "admin" && caller.role !== "super_admin")) {
      throw new Error("Forbidden");
    }
    // Admin cannot create admin or super_admin
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

    const { error: pErr } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          user_id: newId,
          full_name: data.full_name,
          email: data.email,
          role,
          is_active: true,
          phone: "",
          created_by: context.userId,
        },
        { onConflict: "user_id" },
      );
    if (pErr) throw new Error(pErr.message);

    if (data.verticals.length) {
      const rows = data.verticals.map((v) => ({
        user_id: newId,
        vertical: v,
        mapped_by: context.userId,
      }));
      const { error: vErr } = await supabaseAdmin.from("user_verticals").upsert(rows, {
        onConflict: "user_id,vertical",
      });
      if (vErr) throw new Error(vErr.message);
    }

    return { ok: true, user_id: newId };
  });

const UpdateUserSchema = z.object({
  user_id: z.string().uuid(),
  full_name: z.string().min(1).max(120).optional(),
  role: z.enum(["user", "admin", "super_admin"]).optional(),
  is_active: z.boolean().optional(),
  verticals: z.array(z.enum(["agrisky", "infrasky", "geosky", "guardsky", "labs", "academy"])).optional(),
});

export const updateMissionHubUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateUserSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: caller } = await context.supabase
      .from("profiles")
      .select("role, is_active")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!caller || !caller.is_active) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const patch: Record<string, any> = {};
    if (data.full_name !== undefined) patch.full_name = data.full_name;
    if (data.is_active !== undefined) patch.is_active = data.is_active;
    if (data.role !== undefined) {
      if (caller.role !== "super_admin") throw new Error("Only super admin can change roles");
      patch.role = data.role;
    }
    if (Object.keys(patch).length) {
      const { error } = await supabaseAdmin.from("profiles").update(patch).eq("user_id", data.user_id);
      if (error) throw new Error(error.message);
    }

    if (data.verticals) {
      if (caller.role !== "admin" && caller.role !== "super_admin") throw new Error("Forbidden");
      const { error: delErr } = await supabaseAdmin.from("user_verticals").delete().eq("user_id", data.user_id);
      if (delErr) throw new Error(delErr.message);
      if (data.verticals.length) {
        const rows = data.verticals.map((v) => ({
          user_id: data.user_id,
          vertical: v,
          mapped_by: context.userId,
        }));
        const { error } = await supabaseAdmin.from("user_verticals").insert(rows);
        if (error) throw new Error(error.message);
      }
    }
    return { ok: true };
  });
