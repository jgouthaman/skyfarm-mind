import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { d as useNavigate } from "../_libs/tanstack__react-router.mjs";
import { M as MissionHubShell } from "./Shell-BRA8Q4Nz.mjs";
import { R as RecordsTable } from "./RecordsTable-jehZ393v.mjs";
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
import "./SlidePanel-DNitnqUb.mjs";
const STATUS = [{
  value: "new",
  label: "New",
  color: "#378ADD",
  bg: "rgba(55,138,221,0.15)"
}, {
  value: "contacted",
  label: "Contacted",
  color: "#EF9F27",
  bg: "rgba(239,159,39,0.15)"
}, {
  value: "converted",
  label: "Converted",
  color: "#1D9E75",
  bg: "rgba(29,158,117,0.15)"
}, {
  value: "not_interested",
  label: "Not interested",
  color: "rgba(255,255,255,0.6)",
  bg: "rgba(255,255,255,0.06)"
}];
function WaitlistPage() {
  const {
    profile,
    loading
  } = useMissionHubAuth();
  const navigate = useNavigate();
  reactExports.useEffect(() => {
    if (!loading && profile && profile.role === "user") {
      toast.error("Access restricted.");
      navigate({
        to: "/mission-hub/dashboard"
      });
    }
  }, [loading, profile, navigate]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MissionHubShell, { title: "Subscriptions", children: /* @__PURE__ */ jsxRuntimeExports.jsx(RecordsTable, { table: "design_studio_leads", searchFields: ["full_name", "email"], csvFilename: "waitlist.csv", columns: [{
    key: "full_name",
    label: "Name"
  }, {
    key: "email",
    label: "Email"
  }, {
    key: "phone",
    label: "Phone"
  }, {
    key: "organisation",
    label: "Organisation"
  }, {
    key: "role",
    label: "Role"
  }, {
    key: "plan",
    label: "Plan"
  }, {
    key: "location",
    label: "Location"
  }], filters: [{
    key: "plan",
    label: "Plans",
    options: [{
      value: "Explorer",
      label: "Explorer"
    }, {
      value: "Engineer",
      label: "Engineer"
    }, {
      value: "Squadron",
      label: "Squadron"
    }, {
      value: "Campus",
      label: "Campus"
    }, {
      value: "Waitlist",
      label: "Waitlist"
    }]
  }], statusOptions: STATUS, detailFields: [{
    key: "full_name",
    label: "Full name"
  }, {
    key: "email",
    label: "Email"
  }, {
    key: "phone",
    label: "Phone"
  }, {
    key: "organisation",
    label: "Organisation"
  }, {
    key: "role",
    label: "Role"
  }, {
    key: "location",
    label: "Location"
  }, {
    key: "plan",
    label: "Plan"
  }, {
    key: "message",
    label: "Message"
  }] }) });
}
export {
  WaitlistPage as component
};
