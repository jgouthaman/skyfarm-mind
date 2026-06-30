import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { S as StudioStepNav } from "./step-nav-4ASvtYHx.mjs";
import { S as StudioTabNav } from "./StudioTabNav-A7uSJqj-.mjs";
import { b as useMutation } from "../_libs/tanstack__react-query.mjs";
import { u as useServerFn } from "./useServerFn-DL2oePlL.mjs";
import { u as useCurrentProject, s as studioActions } from "./store-D8Xv1K_U.mjs";
import { c as createSsrRpc } from "./createSsrRpc-Cd-Ab4aD.mjs";
import { a as createServerFn } from "./server-Q5BLu_GA.mjs";
import { B as Button } from "./button-DjOZMqFS.mjs";
import { I as Input } from "./input-D_U8fI25.mjs";
import { D as Disclaimer } from "./sidebar-CQ8yt5pY.mjs";
import "../_libs/seroval.mjs";
import { an as Sparkles, p as Send } from "../_libs/lucide-react.mjs";
import "../_libs/tanstack__react-router.mjs";
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
import "../_libs/tanstack__query-core.mjs";
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
import "node:async_hooks";
import "../_libs/h3-v2.mjs";
import "../_libs/rou3.mjs";
import "../_libs/srvx.mjs";
import "../_libs/radix-ui__react-slot.mjs";
import "../_libs/radix-ui__react-compose-refs.mjs";
import "../_libs/class-variance-authority.mjs";
import "../_libs/clsx.mjs";
import "../_libs/tailwind-merge.mjs";
const askAdvisor = createServerFn({
  method: "POST"
}).validator((d) => d).handler(createSsrRpc("0feebc4179378179b102bef8c9012b24832fd65750fc9eda3d16eb0299f36406"));
const SUGGESTED = ["Why was this drone type selected?", "How can I improve flight time?", "Is this payload safe?", "Which component is the bottleneck?", "How can I reduce cost?", "What happens if wind speed increases?", "Should I use hexacopter or octocopter?", "Which battery is better?", "What safety components are mandatory?", "Can this drone cover my farm area?"];
function Advisor() {
  const project = useCurrentProject();
  const [input, setInput] = reactExports.useState("");
  const fn = useServerFn(askAdvisor);
  const msgs = project?.advisorMessages ?? [];
  const m = useMutation({
    mutationFn: async (question) => {
      if (!project) throw new Error("No active project");
      const res = await fn({
        data: {
          projectName: project.projectName,
          vertical: project.vertical,
          requirements: project.requirements,
          recommendedDesign: project.recommendedDesign,
          componentList: project.componentList,
          simulationResults: project.simulationResults,
          question
        }
      });
      const next = [...project.advisorMessages ?? [], {
        role: "user",
        content: question,
        at: (/* @__PURE__ */ new Date()).toISOString()
      }, {
        role: "assistant",
        content: res.content,
        at: (/* @__PURE__ */ new Date()).toISOString()
      }];
      studioActions.update(project.id, {
        advisorMessages: next,
        status: "Reviewed"
      });
    }
  });
  function send(q) {
    const text = (q ?? input).trim();
    if (!text) return;
    setInput("");
    m.mutate(text);
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5 max-w-4xl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(StudioTabNav, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx("header", { className: "flex items-center justify-between", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "text-2xl font-semibold flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-5 w-5 text-violet-700" }),
        " AI Design Advisor"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mt-1", children: project ? `${project.projectName} · ${project.vertical}` : "No active project" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Disclaimer, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card/60 p-4 min-h-[400px] flex flex-col", children: [
      msgs.length === 0 && !m.isPending && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 grid place-items-center text-sm text-muted-foreground", children: "Ask any question about your drone design." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 space-y-3", children: [
        msgs.map((msg, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: msg.role === "user" ? "ml-auto max-w-[80%] bg-primary/15 border border-primary/30 rounded-lg px-4 py-2.5 text-sm" : "max-w-[85%] bg-muted/40 border border-border/60 rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap", children: msg.content }, i)),
        m.isPending && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-w-[85%] bg-muted/40 border border-border/60 rounded-lg px-4 py-2.5 text-sm text-muted-foreground", children: "Thinking…" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 flex gap-2 border-t border-border/60 pt-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: input, onChange: (e) => setInput(e.target.value), placeholder: "Ask the advisor…", onKeyDown: (e) => e.key === "Enter" && send() }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => send(), disabled: m.isPending, className: "bg-sky-500 hover:bg-sky-600 text-white", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "h-4 w-4" }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs uppercase tracking-wide text-muted-foreground mb-2", children: "Suggested questions" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-2", children: SUGGESTED.map((q) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => send(q), className: "text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted/50", children: q }, q)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(StudioStepNav, {})
  ] });
}
export {
  Advisor as component
};
