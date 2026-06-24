import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const checkSuperAdminExists = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count, error } = await supabaseAdmin
    .from("mission_hub_users")
    .select("*", { count: "exact", head: true })
    .eq("role", "super_admin")
    .eq("status", "active");
  if (error) throw new Error(error.message);
  return { exists: (count ?? 0) > 0 };
});

const SeedSchema = z.object({
  full_name: z.string().min(1).max(120),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

export const seedSuperAdmin = createServerFn({ method: "POST" })
  .validator((d: unknown) => SeedSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Lock: refuse if any active super_admin already exists.
    const { count } = await supabaseAdmin
      .from("mission_hub_users")
      .select("*", { count: "exact", head: true })
      .eq("role", "super_admin")
      .eq("status", "active");
    if ((count ?? 0) > 0) {
      throw new Error("Super admin already configured");
    }

    // Create or find existing auth user
    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });

    let userId = created?.user?.id;
    if (cErr || !userId) {
      // Maybe the user already exists — find them
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = list?.users?.find((u: any) => u.email?.toLowerCase() === data.email.toLowerCase());
      if (!found) throw new Error(cErr?.message ?? "Failed to create auth user");
      userId = found.id;
    }

    // Upsert profile as super_admin
    const { error: pErr } = await supabaseAdmin
      .from("mission_hub_users")
      .upsert(
        {
          id: userId,
          full_name: data.full_name,
          email: data.email,
          role: "super_admin",
          status: "active",
        },
        { onConflict: "id" },
      );
    if (pErr) throw new Error(pErr.message);

    return { ok: true, email: data.email };
  });
