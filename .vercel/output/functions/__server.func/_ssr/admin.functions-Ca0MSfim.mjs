import { c as createServerRpc } from "./createServerRpc-BrM-oKoP.mjs";
import { a as createServerFn } from "./server-Q5BLu_GA.mjs";
import { r as requireSupabaseAuth } from "./auth-middleware-CRNrigb8.mjs";
import "../_libs/seroval.mjs";
import "../_libs/react.mjs";
import { o as objectType, a as arrayType, s as stringType, e as enumType } from "../_libs/zod.mjs";
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
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
const CreateUserSchema = objectType({
  full_name: stringType().min(1).max(120),
  email: stringType().email().max(255),
  password: stringType().min(8).max(128),
  role: enumType(["user", "admin", "super_admin"]),
  industries: arrayType(stringType()).default([])
});
const createMissionHubUser_createServerFn_handler = createServerRpc({
  id: "06ebb0949d60cbe4346886641841dbf0a16657472de642c1e66ae51421a08a21",
  name: "createMissionHubUser",
  filename: "src/lib/mission-hub/admin.functions.ts"
}, (opts) => createMissionHubUser.__executeServer(opts));
const createMissionHubUser = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).validator((d) => CreateUserSchema.parse(d)).handler(createMissionHubUser_createServerFn_handler, async ({
  data,
  context
}) => {
  const {
    data: caller
  } = await context.supabase.from("mission_hub_users").select("role, status").eq("id", context.userId).maybeSingle();
  if (!caller || caller.status !== "active" || caller.role !== "admin" && caller.role !== "super_admin") {
    throw new Error("Forbidden");
  }
  let role = data.role;
  if (caller.role === "admin" && role !== "user") {
    role = "user";
  }
  const {
    supabaseAdmin
  } = await import("./client.server-Bzi5t_L5.mjs");
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
  if (cErr || !created?.user) throw new Error(cErr?.message ?? "Failed to create user");
  const newId = created.user.id;
  const {
    error: uErr
  } = await supabaseAdmin.from("mission_hub_users").upsert({
    id: newId,
    full_name: data.full_name,
    email: data.email,
    role,
    status: "active",
    industries: data.industries
  }, {
    onConflict: "id"
  });
  if (uErr) {
    await supabaseAdmin.auth.admin.deleteUser(newId);
    throw new Error(uErr.message);
  }
  return {
    ok: true,
    id: newId
  };
});
const UpdateUserSchema = objectType({
  id: stringType().uuid(),
  full_name: stringType().min(1).max(120).optional(),
  role: enumType(["user", "admin", "super_admin"]).optional(),
  status: enumType(["active", "inactive", "pending"]).optional(),
  industries: arrayType(stringType()).optional()
});
const updateMissionHubUser_createServerFn_handler = createServerRpc({
  id: "345b684c762a83a593cab36aea1dc6e1e083883ec262e64cbe6562669338e70a",
  name: "updateMissionHubUser",
  filename: "src/lib/mission-hub/admin.functions.ts"
}, (opts) => updateMissionHubUser.__executeServer(opts));
const updateMissionHubUser = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).validator((d) => UpdateUserSchema.parse(d)).handler(updateMissionHubUser_createServerFn_handler, async ({
  data,
  context
}) => {
  const {
    data: caller
  } = await context.supabase.from("mission_hub_users").select("role, status").eq("id", context.userId).maybeSingle();
  if (!caller || caller.status !== "active") throw new Error("Forbidden");
  const {
    supabaseAdmin
  } = await import("./client.server-Bzi5t_L5.mjs");
  const patch = {};
  if (data.full_name !== void 0) patch.full_name = data.full_name;
  if (data.status !== void 0) patch.status = data.status;
  if (data.industries !== void 0) {
    if (caller.role !== "admin" && caller.role !== "super_admin") throw new Error("Forbidden");
    patch.industries = data.industries;
  }
  if (data.role !== void 0) {
    if (caller.role !== "super_admin") throw new Error("Only super admin can change roles");
    patch.role = data.role;
  }
  if (Object.keys(patch).length) {
    const {
      error
    } = await supabaseAdmin.from("mission_hub_users").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
  }
  return {
    ok: true
  };
});
export {
  createMissionHubUser_createServerFn_handler,
  updateMissionHubUser_createServerFn_handler
};
