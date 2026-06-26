// Seeds the first super admin. Refuses if any active super_admin already exists.
// Uses the service-role key, so it bypasses RLS — keep the existence lock intact.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Server is missing Supabase configuration" }, 500);
  }

  let payload: { full_name?: unknown; email?: unknown; password?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const full_name = typeof payload.full_name === "string" ? payload.full_name.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!full_name || full_name.length > 120) {
    return json({ error: "full_name is required (max 120 chars)" }, 400);
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
    return json({ error: "A valid email is required" }, 400);
  }
  if (password.length < 8 || password.length > 128) {
    return json({ error: "Password must be 8–128 characters" }, 400);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Lock: refuse if any active super_admin already exists.
  const { count, error: countErr } = await supabaseAdmin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "super_admin")
    .eq("is_active", true);
  if (countErr) {
    return json({ error: countErr.message }, 500);
  }
  if ((count ?? 0) > 0) {
    return json({ error: "Super admin already configured" }, 409);
  }

  // Create or find the existing auth user.
  const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  let userId = created?.user?.id;
  if (cErr || !userId) {
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const found = list?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (!found) {
      return json({ error: cErr?.message ?? "Failed to create auth user" }, 500);
    }
    userId = found.id;
  }

  // Upsert the profile as super_admin.
  const { error: pErr } = await supabaseAdmin.from("profiles").upsert(
    {
      user_id: userId,
      full_name,
      email,
      role: "super_admin",
      is_active: true,
      phone: "",
    },
    { onConflict: "user_id" },
  );
  if (pErr) {
    return json({ error: pErr.message }, 500);
  }

  return json({ ok: true, email });
});
