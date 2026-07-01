import { c as createServerRpc } from "./createServerRpc-CMe8CqLp.mjs";
import { a as createServerFn } from "./server-BTiM7Kib.mjs";
import "../_libs/seroval.mjs";
import "../_libs/react.mjs";
import { o as objectType, s as stringType } from "../_libs/zod.mjs";
import "node:async_hooks";
import "../_libs/h3-v2.mjs";
import "../_libs/rou3.mjs";
import "../_libs/srvx.mjs";
import "node:stream";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "../_libs/tanstack__react-router.mjs";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
const checkSuperAdminExists_createServerFn_handler = createServerRpc({
  id: "cfc200084b8041428ecc271b3a84e9bb67a5bbfc0c10774db3a02fccb40897d5",
  name: "checkSuperAdminExists",
  filename: "src/lib/mission-hub/seed.functions.ts"
}, (opts) => checkSuperAdminExists.__executeServer(opts));
const checkSuperAdminExists = createServerFn({
  method: "GET"
}).handler(checkSuperAdminExists_createServerFn_handler, async () => {
  const {
    supabaseAdmin
  } = await import("./client.server-Bzi5t_L5.mjs");
  const {
    count,
    error
  } = await supabaseAdmin.from("mission_hub_users").select("*", {
    count: "exact",
    head: true
  }).eq("role", "super_admin").eq("status", "active");
  if (error) throw new Error(error.message);
  return {
    exists: (count ?? 0) > 0
  };
});
const SeedSchema = objectType({
  full_name: stringType().min(1).max(120),
  email: stringType().email().max(255),
  password: stringType().min(8).max(128)
});
const seedSuperAdmin_createServerFn_handler = createServerRpc({
  id: "465d753133d03fe4e88ed7addb5729df8340d378a9812b383ba8a1aa8b6bce01",
  name: "seedSuperAdmin",
  filename: "src/lib/mission-hub/seed.functions.ts"
}, (opts) => seedSuperAdmin.__executeServer(opts));
const seedSuperAdmin = createServerFn({
  method: "POST"
}).validator((d) => SeedSchema.parse(d)).handler(seedSuperAdmin_createServerFn_handler, async ({
  data
}) => {
  const {
    supabaseAdmin
  } = await import("./client.server-Bzi5t_L5.mjs");
  const {
    count
  } = await supabaseAdmin.from("mission_hub_users").select("*", {
    count: "exact",
    head: true
  }).eq("role", "super_admin").eq("status", "active");
  if ((count ?? 0) > 0) {
    throw new Error("Super admin already configured");
  }
  const {
    data: created,
    error: cErr
  } = await supabaseAdmin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: {
      full_name: data.full_name
    }
  });
  let userId = created?.user?.id;
  if (cErr || !userId) {
    const {
      data: list
    } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200
    });
    const found = list?.users?.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
    if (!found) throw new Error(cErr?.message ?? "Failed to create auth user");
    userId = found.id;
  }
  const {
    error: pErr
  } = await supabaseAdmin.from("mission_hub_users").upsert({
    id: userId,
    full_name: data.full_name,
    email: data.email,
    role: "super_admin",
    status: "active"
  }, {
    onConflict: "id"
  });
  if (pErr) throw new Error(pErr.message);
  return {
    ok: true,
    email: data.email
  };
});
export {
  checkSuperAdminExists_createServerFn_handler,
  seedSuperAdmin_createServerFn_handler
};
