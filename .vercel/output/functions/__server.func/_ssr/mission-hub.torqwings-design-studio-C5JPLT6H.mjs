import { j as jsxRuntimeExports, r as reactExports } from "../_libs/react.mjs";
import { O as Outlet, d as useNavigate } from "../_libs/tanstack__react-router.mjs";
import { M as MissionHubShell } from "./Shell-BRA8Q4Nz.mjs";
import { u as useMissionHubAuth } from "./context-BevYt8mH.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
import "../_libs/lucide-react.mjs";
import "./client-DYtC4Igq.mjs";
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
function StudioRoot() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MissionHubShell, { title: "Design Studio", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AccessGate, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Outlet, {}) }) });
}
function AccessGate({
  children
}) {
  const {
    loading,
    profile,
    verticals
  } = useMissionHubAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  const hasAccess = isAdmin || verticals.includes("design-studio");
  reactExports.useEffect(() => {
    if (loading || !profile) return;
    if (!hasAccess) {
      toast.error("You do not have access to the Design Studio.");
      navigate({
        to: "/mission-hub/dashboard"
      });
    }
  }, [loading, profile, hasAccess, navigate]);
  if (loading || !profile || !hasAccess) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children });
}
export {
  StudioRoot as component
};
