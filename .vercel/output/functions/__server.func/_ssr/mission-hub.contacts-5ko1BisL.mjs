import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { d as useNavigate, f as useSearch } from "../_libs/tanstack__react-router.mjs";
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
  value: "replied",
  label: "Replied",
  color: "#EF9F27",
  bg: "rgba(239,159,39,0.15)"
}, {
  value: "in_progress",
  label: "In progress",
  color: "#EF9F27",
  bg: "rgba(239,159,39,0.1)"
}, {
  value: "closed",
  label: "Closed",
  color: "rgba(255,255,255,0.6)",
  bg: "rgba(255,255,255,0.06)"
}];
function ContactsPage() {
  const {
    profile,
    loading
  } = useMissionHubAuth();
  const navigate = useNavigate();
  const search = useSearch({
    from: "/mission-hub/contacts"
  });
  reactExports.useEffect(() => {
    if (!loading && profile && profile.role === "user") {
      toast.error("Access restricted.");
      navigate({
        to: "/mission-hub/dashboard"
      });
    }
  }, [loading, profile, navigate]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MissionHubShell, { title: "Leads", children: /* @__PURE__ */ jsxRuntimeExports.jsx(RecordsTable, { table: "contacts", searchFields: ["name", "email"], csvFilename: "contacts.csv", initialFilters: search.vertical ? {
    vertical_interest: search.vertical
  } : {}, columns: [{
    key: "name",
    label: "Name"
  }, {
    key: "phone",
    label: "Phone"
  }, {
    key: "email",
    label: "Email"
  }, {
    key: "organisation",
    label: "Organisation"
  }, {
    key: "location",
    label: "Location"
  }, {
    key: "vertical_interest",
    label: "Vertical interest"
  }], filters: [{
    key: "vertical_interest",
    label: "Vertical interest",
    options: [{
      value: "agrisky",
      label: "AgriSky"
    }, {
      value: "infrasky",
      label: "InfraSky"
    }, {
      value: "geosky",
      label: "GeoSky"
    }, {
      value: "guardsky",
      label: "GuardSky"
    }, {
      value: "labs",
      label: "Labs"
    }, {
      value: "academy",
      label: "Academy"
    }, {
      value: "design-studio",
      label: "Design Studio"
    }]
  }], statusOptions: STATUS, detailFields: [{
    key: "name",
    label: "Name"
  }, {
    key: "phone",
    label: "Phone"
  }, {
    key: "email",
    label: "Email"
  }, {
    key: "organisation",
    label: "Organisation"
  }, {
    key: "location",
    label: "Location"
  }, {
    key: "vertical_interest",
    label: "Vertical interest"
  }, {
    key: "message",
    label: "Message"
  }] }) });
}
export {
  ContactsPage as component
};
