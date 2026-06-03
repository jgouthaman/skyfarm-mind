import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { phoneToEmail } from "./phone-email";

const ADMIN_BOOTSTRAP_PHONE = "9940263589";

const phoneSchema = z.string().regex(/^\d{10}$/, "Phone must be 10 digits");
const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(72);

/**
 * Bootstrap the very first admin (9940263589).
 * Works only while no admin exists in user_roles. Public, but locked to
 * the hard-coded admin phone number.
 */
export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      phone: phoneSchema,
      password: passwordSchema,
      fullName: z.string().min(1).max(120).optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    if (data.phone !== ADMIN_BOOTSTRAP_PHONE) {
      throw new Error("This phone is not authorized to bootstrap admin.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Reject if any admin already exists
    const { count, error: countErr } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countErr) throw new Error(countErr.message);
    if ((count ?? 0) > 0) {
      throw new Error("Admin is already set up. Please sign in instead.");
    }

    const email = phoneToEmail(data.phone);

    // Try to create. If the auth user already exists (e.g. partial prior run), update its password.
    let userId: string | undefined;
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { phone: data.phone, full_name: data.fullName ?? "Administrator" },
    });

    if (createErr && !/already/i.test(createErr.message)) {
      throw new Error(createErr.message);
    }
    if (created?.user) {
      userId = created.user.id;
    } else {
      // Look up the existing user and reset password.
      const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (listErr) throw new Error(listErr.message);
      const match = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (!match) throw new Error("Could not locate existing admin user.");
      userId = match.id;
      const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: data.password,
        email_confirm: true,
        user_metadata: { phone: data.phone, full_name: data.fullName ?? "Administrator" },
      });
      if (updErr) throw new Error(updErr.message);
    }

    // Ensure profile + admin role
    await supabaseAdmin.from("profiles").upsert(
      { user_id: userId, phone: data.phone, full_name: data.fullName ?? "Administrator" },
      { onConflict: "user_id" },
    );
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    if (roleErr && !/duplicate/i.test(roleErr.message)) throw new Error(roleErr.message);

    return { ok: true };
  });

/** Whether admin bootstrap is still available (no admin exists). */
export const adminBootstrapAvailable = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count, error } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  if (error) throw new Error(error.message);
  return { available: (count ?? 0) === 0, bootstrapPhone: ADMIN_BOOTSTRAP_PHONE };
});

async function assertCallerIsAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only.");
}

/** Create a new control-center user (admin only). Role defaults to 'sme'. */
export const createControlUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      phone: phoneSchema,
      password: passwordSchema,
      fullName: z.string().min(1).max(120),
      role: z.enum(["admin", "sme"]).default("sme"),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertCallerIsAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = phoneToEmail(data.phone);

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { phone: data.phone, full_name: data.fullName },
    });
    if (createErr) throw new Error(createErr.message);
    const userId = created.user!.id;

    await supabaseAdmin.from("profiles").upsert(
      { user_id: userId, phone: data.phone, full_name: data.fullName },
      { onConflict: "user_id" },
    );
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: data.role });
    if (roleErr) throw new Error(roleErr.message);

    return { ok: true, userId };
  });

/** Reset a user's password (admin only). */
export const setUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      userId: z.string().uuid(),
      password: passwordSchema,
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertCallerIsAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** List all control-center users with their roles (admin only). */
export const listControlUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertCallerIsAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      supabaseAdmin.from("profiles").select("user_id, phone, full_name, created_at").order("created_at", { ascending: false }),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    if (pErr) throw new Error(pErr.message);
    if (rErr) throw new Error(rErr.message);
    const roleMap = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    }
    return (profiles ?? []).map((p) => ({ ...p, roles: roleMap.get(p.user_id) ?? [] }));
  });

/** Returns the current signed-in user's roles. */
export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { roles: (data ?? []).map((r) => r.role), userId: context.userId };
  });
