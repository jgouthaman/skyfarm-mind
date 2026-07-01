import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { d as useNavigate } from "../_libs/tanstack__react-router.mjs";
import { M as MissionHubShell, a as MhCard, S as STATUS_LABELS } from "./Shell-BRA8Q4Nz.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { u as useServerFn } from "./useServerFn-DL2oePlL.mjs";
import { c as createSsrRpc } from "./createSsrRpc-CwzutQwK.mjs";
import { a as createServerFn } from "./server-BTiM7Kib.mjs";
import { r as requireSupabaseAuth } from "./auth-middleware-C1yTktBn.mjs";
import { S as SlidePanel, F as Field } from "./SlidePanel-DNitnqUb.mjs";
import { u as useMissionHubAuth } from "./context-BevYt8mH.mjs";
import { s as supabase } from "./client-DYtC4Igq.mjs";
import "../_libs/seroval.mjs";
import { V as UserPlus, X, g as CircleCheck, Y as Copy } from "../_libs/lucide-react.mjs";
import { o as objectType, a as arrayType, s as stringType, e as enumType } from "../_libs/zod.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
import "node:async_hooks";
import "../_libs/h3-v2.mjs";
import "../_libs/rou3.mjs";
import "../_libs/srvx.mjs";
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
function RoleBadge({ role }) {
  const s = role === "super_admin" ? { bg: "rgba(163,45,45,0.2)", color: "#F09595", label: "Super Admin" } : role === "admin" ? { bg: "rgba(239,159,39,0.15)", color: "#EF9F27", label: "Admin" } : { bg: "rgba(24,95,165,0.2)", color: "#378ADD", label: "User" };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      className: "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full",
      style: { background: s.bg, color: s.color },
      children: s.label
    }
  );
}
const STATUS_STYLE = {
  active: { dot: "bg-[#1D9E75]", text: "text-[#1D9E75]", label: "Active" },
  inactive: { dot: "bg-white/30", text: "text-white/40", label: "Inactive" },
  pending: { dot: "bg-[#EF9F27]", text: "text-[#EF9F27]", label: "Pending" }
};
function UserTable({
  users,
  industries,
  isSuper,
  onSelect
}) {
  const industryName = (slug) => industries.find((i) => i.slug === slug)?.name ?? slug;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MhCard, { className: "overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "bg-[#0a0f1c] text-[11px] uppercase tracking-wider text-white/40 text-left", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 font-normal", children: "Name" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 font-normal", children: "Email" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 font-normal", children: "Role" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 font-normal", children: "Industries" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 font-normal", children: "Status" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 font-normal", children: "Created" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 font-normal text-right", children: "Actions" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: users.map((u) => {
      const ids = u.industries ?? [];
      const status = STATUS_STYLE[u.status] ?? STATUS_STYLE.inactive;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t border-white/[0.05] hover:bg-white/[0.03]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-white/90", children: u.full_name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-white/70 text-[12px]", children: u.email }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(RoleBadge, { role: u.role }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-1", children: [
          ids.slice(0, 3).map((id) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: "text-[11px] px-1.5 py-0.5 rounded",
              style: { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" },
              children: industryName(id)
            },
            id
          )),
          ids.length > 3 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] text-white/40", children: [
            "+",
            ids.length - 3
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-[12px]", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `inline-flex items-center gap-1.5 ${status.text}`, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `h-1.5 w-1.5 rounded-full ${status.dot}` }),
          status.label
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-[12px] text-white/60", children: new Date(u.created_at).toLocaleDateString() }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => onSelect(u),
            className: "text-[12px] border border-white/[0.1] rounded px-2.5 py-1 text-white/70 hover:text-white",
            children: isSuper ? "Edit" : "View"
          }
        ) })
      ] }, u.id);
    }) })
  ] }) }) });
}
const CreateUserSchema = objectType({
  full_name: stringType().min(1).max(120),
  email: stringType().email().max(255),
  password: stringType().min(8).max(128),
  role: enumType(["user", "admin", "super_admin"]),
  industries: arrayType(stringType()).default([])
});
const createMissionHubUser = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).validator((d) => CreateUserSchema.parse(d)).handler(createSsrRpc("06ebb0949d60cbe4346886641841dbf0a16657472de642c1e66ae51421a08a21"));
const UpdateUserSchema = objectType({
  id: stringType().uuid(),
  full_name: stringType().min(1).max(120).optional(),
  role: enumType(["user", "admin", "super_admin"]).optional(),
  status: enumType(["active", "inactive", "pending"]).optional(),
  industries: arrayType(stringType()).optional()
});
const updateMissionHubUser = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).validator((d) => UpdateUserSchema.parse(d)).handler(createSsrRpc("345b684c762a83a593cab36aea1dc6e1e083883ec262e64cbe6562669338e70a"));
function useCreateUser() {
  const create = useServerFn(createMissionHubUser);
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [success, setSuccess] = reactExports.useState(false);
  const [err, setErr] = reactExports.useState(null);
  async function createUser(input) {
    setErr(null);
    setSubmitting(true);
    try {
      await create({ data: input });
      setSuccess(true);
      return true;
    } catch (e) {
      setErr(e?.message ?? "Failed");
      return false;
    } finally {
      setSubmitting(false);
    }
  }
  return { submitting, success, err, createUser };
}
function CreateUserModal({
  industries,
  canCreateAdmin,
  forceUserRole,
  onClose,
  onCreated
}) {
  const { submitting, success, err, createUser } = useCreateUser();
  const [name, setName] = reactExports.useState("");
  const [email, setEmail] = reactExports.useState("");
  const [pwd, setPwd] = reactExports.useState("");
  const [showPwd, setShowPwd] = reactExports.useState(false);
  const [role, setRole] = reactExports.useState("user");
  const [industrySlugs, setIndustrySlugs] = reactExports.useState([]);
  function toggle(slug) {
    setIndustrySlugs((prev) => prev.includes(slug) ? prev.filter((x) => x !== slug) : [...prev, slug]);
  }
  async function submit(e) {
    e.preventDefault();
    const ok = await createUser({
      full_name: name,
      email,
      password: pwd,
      role: forceUserRole ? "user" : role,
      industries: industrySlugs
    });
    if (ok) onCreated();
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4", onClick: onClose, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "w-full max-w-[480px] rounded-2xl bg-[#141928] p-9 relative",
      onClick: (e) => e.stopPropagation(),
      style: { border: "0.5px solid rgba(255,255,255,0.08)" },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "absolute right-4 top-4 text-white/50 hover:text-white", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-5 w-5" }) }),
        success ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-10 w-10 mx-auto text-[#1D9E75]" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-4 text-white text-lg", style: { fontFamily: "'Space Grotesk', sans-serif" }, children: "User created successfully" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-[13px] text-white/60", children: "They can sign in at torqwings.com/mission-hub/login using the temporary password you set." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "mt-5 w-full rounded-lg border border-white/20 text-white py-2.5 text-sm hover:bg-white/5", children: "Close" })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: submit, className: "space-y-3.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-white text-lg", style: { fontFamily: "'Space Grotesk', sans-serif" }, children: "Create new user" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Inp$1, { label: "Full name", value: name, setValue: setName, required: true }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Inp$1, { label: "Email address", type: "email", value: email, setValue: setEmail, required: true }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[11px] uppercase tracking-wider text-white/50 mb-1.5", children: "Temporary password" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: showPwd ? "text" : "password",
                  value: pwd,
                  required: true,
                  minLength: 8,
                  onChange: (e) => setPwd(e.target.value),
                  className: "w-full bg-[#1a2035] rounded-lg pl-3.5 pr-20 py-2.5 text-sm text-white",
                  style: { border: "0.5px solid rgba(255,255,255,0.1)" }
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => setShowPwd((s) => !s), className: "text-white/40 text-[11px] px-1.5", children: showPwd ? "Hide" : "Show" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => {
                      navigator.clipboard.writeText(pwd);
                      toast.success("Copied");
                    },
                    className: "text-white/40",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "h-3.5 w-3.5" })
                  }
                )
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[11px] uppercase tracking-wider text-white/50 mb-1.5", children: "Role" }),
            forceUserRole ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-[#0a0f1c] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white/60", children: "User" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                value: role,
                onChange: (e) => setRole(e.target.value),
                className: "w-full bg-[#1a2035] rounded-lg px-3.5 py-2.5 text-sm text-white",
                style: { border: "0.5px solid rgba(255,255,255,0.1)" },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "user", children: "User" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "admin", children: "Admin" }),
                  canCreateAdmin && /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "super_admin", children: "Super Admin" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[11px] uppercase tracking-wider text-white/50 mb-1.5", children: "Map to industries" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-2", children: industries.map((ind) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "label",
              {
                className: "flex items-center gap-2 text-[13px] text-white/80 bg-[#1a2035] rounded-lg px-3 py-2 cursor-pointer",
                style: { border: "0.5px solid rgba(255,255,255,0.08)" },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: industrySlugs.includes(ind.slug), onChange: () => toggle(ind.slug) }),
                  ind.name
                ]
              },
              ind.id
            )) })
          ] }),
          err && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "rounded-lg px-3.5 py-2.5 text-[13px] text-[#F09595]",
              style: { background: "rgba(163,45,45,0.15)", border: "0.5px solid rgba(163,45,45,0.4)" },
              children: err
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", disabled: submitting, className: "w-full rounded-lg bg-[#185FA5] hover:bg-[#378ADD] text-white py-3", children: submitting ? "Creating…" : "Create user" })
        ] })
      ]
    }
  ) });
}
function Inp$1({
  label,
  value,
  setValue,
  type = "text",
  required
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[11px] uppercase tracking-wider text-white/50 mb-1.5", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type,
        value,
        required,
        onChange: (e) => setValue(e.target.value),
        className: "w-full bg-[#1a2035] rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#378ADD]/60",
        style: { border: "0.5px solid rgba(255,255,255,0.1)" }
      }
    )
  ] });
}
function useEditUser() {
  const update = useServerFn(updateMissionHubUser);
  const [submitting, setSubmitting] = reactExports.useState(false);
  async function save(input) {
    setSubmitting(true);
    try {
      await update({ data: input });
      toast.success("Saved");
      return true;
    } catch (e) {
      toast.error(e?.message ?? "Failed");
      return false;
    } finally {
      setSubmitting(false);
    }
  }
  async function setStatus(id, status) {
    setSubmitting(true);
    try {
      await update({ data: { id, status } });
      toast.success(status === "active" ? "Reactivated" : "Deactivated");
      return true;
    } catch (e) {
      toast.error(e?.message ?? "Failed");
      return false;
    } finally {
      setSubmitting(false);
    }
  }
  return { submitting, save, setStatus };
}
function EditUserPanel({
  editing,
  industries,
  canEdit,
  onClose,
  onSaved
}) {
  const { submitting, save, setStatus } = useEditUser();
  const [name, setName] = reactExports.useState("");
  const [role, setRole] = reactExports.useState("user");
  const [industrySlugs, setIndustrySlugs] = reactExports.useState([]);
  const [status, setStatusState] = reactExports.useState("active");
  reactExports.useEffect(() => {
    if (editing) {
      setName(editing.full_name ?? "");
      setRole(editing.role);
      setIndustrySlugs(editing.industries ?? []);
      setStatusState(editing.status);
    }
  }, [editing]);
  if (!editing) return /* @__PURE__ */ jsxRuntimeExports.jsx(SlidePanel, { open: false, onClose, children: null });
  const industryName = (slug) => industries.find((i) => i.slug === slug)?.name ?? slug;
  const isActive = status === "active";
  async function handleSave() {
    if (!editing) return;
    const ok = await save({
      id: editing.id,
      full_name: name,
      role: canEdit ? role : void 0,
      industries: industrySlugs
    });
    if (ok) onSaved();
  }
  async function handleToggleStatus() {
    if (!editing) return;
    const ok = await setStatus(editing.id, isActive ? "inactive" : "active");
    if (ok) onSaved();
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    SlidePanel,
    {
      open: !!editing,
      onClose,
      title: /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-white text-lg", style: { fontFamily: "'Space Grotesk', sans-serif" }, children: canEdit ? "Edit user" : "User details" }),
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-4", children: canEdit ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Inp, { label: "Full name", value: name, setValue: setName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Email", value: editing.email }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[11px] uppercase tracking-wider text-white/50 mb-1.5", children: "Role" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              value: role,
              onChange: (e) => setRole(e.target.value),
              className: "w-full bg-[#1a2035] rounded-lg px-3.5 py-2.5 text-sm text-white",
              style: { border: "0.5px solid rgba(255,255,255,0.1)" },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "user", children: "User" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "admin", children: "Admin" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "super_admin", children: "Super Admin" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[11px] uppercase tracking-wider text-white/50 mb-1.5", children: "Industries" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-2", children: industries.map((ind) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "label",
            {
              className: "flex items-center gap-2 text-[13px] text-white/80 bg-[#1a2035] rounded-lg px-3 py-2 cursor-pointer",
              style: { border: "0.5px solid rgba(255,255,255,0.08)" },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "checkbox",
                    checked: industrySlugs.includes(ind.slug),
                    onChange: () => setIndustrySlugs(
                      industrySlugs.includes(ind.slug) ? industrySlugs.filter((x) => x !== ind.slug) : [...industrySlugs, ind.slug]
                    )
                  }
                ),
                ind.name
              ]
            },
            ind.id
          )) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: handleSave,
            disabled: submitting,
            className: "w-full rounded-lg bg-[#185FA5] hover:bg-[#378ADD] text-white py-2.5 text-sm",
            children: "Save changes"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: handleToggleStatus,
            disabled: submitting,
            className: `w-full rounded-lg py-2.5 text-sm ${isActive ? "bg-[rgba(163,45,45,0.2)] text-[#F09595] border border-[rgba(163,45,45,0.4)]" : "bg-[rgba(29,158,117,0.15)] text-[#1D9E75] border border-[rgba(29,158,117,0.4)]"}`,
            children: isActive ? "Deactivate account" : "Reactivate"
          }
        )
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Full name", value: editing.full_name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Email", value: editing.email }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Role", value: /* @__PURE__ */ jsxRuntimeExports.jsx(RoleBadge, { role: editing.role }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Status", value: STATUS_LABELS[editing.status] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Field,
          {
            label: "Industries",
            value: (editing.industries ?? []).map(industryName).join(", ") || "—"
          }
        )
      ] }) })
    }
  );
}
function Inp({
  label,
  value,
  setValue,
  type = "text",
  required
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[11px] uppercase tracking-wider text-white/50 mb-1.5", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type,
        value,
        required,
        onChange: (e) => setValue(e.target.value),
        className: "w-full bg-[#1a2035] rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#378ADD]/60",
        style: { border: "0.5px solid rgba(255,255,255,0.1)" }
      }
    )
  ] });
}
function useMissionHubUsers() {
  const [users, setUsers] = reactExports.useState([]);
  const [industries, setIndustries] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [reloadKey, setReloadKey] = reactExports.useState(0);
  const reload = reactExports.useCallback(() => setReloadKey((k) => k + 1), []);
  reactExports.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: u }, { data: ind }] = await Promise.all([
        supabase.from("mission_hub_users").select("id, full_name, email, role, status, industries, created_at").order("created_at", { ascending: false }),
        supabase.from("industries").select("id, name, slug").order("name", { ascending: true })
      ]);
      if (cancelled) return;
      setUsers(u ?? []);
      setIndustries(ind ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);
  return { users, industries, loading, reload };
}
function UsersPage() {
  const {
    profile,
    loading
  } = useMissionHubAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === "admin";
  const isSuper = profile?.role === "super_admin";
  reactExports.useEffect(() => {
    if (!loading && profile && profile.role === "user") {
      toast.error("Access restricted.");
      navigate({
        to: "/mission-hub/dashboard"
      });
    }
  }, [loading, profile, navigate]);
  const {
    users,
    industries,
    reload
  } = useMissionHubUsers();
  const [showCreate, setShowCreate] = reactExports.useState(false);
  const [editing, setEditing] = reactExports.useState(null);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(MissionHubShell, { title: "Users", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[12px] px-2.5 py-0.5 rounded-full", style: {
        background: "rgba(55,138,221,0.12)",
        color: "#378ADD"
      }, children: [
        users.length,
        " users"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setShowCreate(true), className: "flex items-center gap-1.5 bg-[#185FA5] hover:bg-[#378ADD] text-white text-[13px] rounded-lg px-3.5 py-2 transition-colors", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(UserPlus, { className: "h-3.5 w-3.5" }),
        " Create user"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(UserTable, { users, industries, isSuper: !!isSuper, onSelect: setEditing }),
    showCreate && /* @__PURE__ */ jsxRuntimeExports.jsx(CreateUserModal, { industries, canCreateAdmin: !!isSuper, forceUserRole: !!isAdmin, onClose: () => setShowCreate(false), onCreated: reload }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(EditUserPanel, { editing, industries, canEdit: !!isSuper, onClose: () => setEditing(null), onSaved: () => {
      setEditing(null);
      reload();
    } })
  ] });
}
export {
  UsersPage as component
};
