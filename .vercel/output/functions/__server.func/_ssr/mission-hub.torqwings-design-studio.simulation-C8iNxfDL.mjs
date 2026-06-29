import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { d as useNavigate } from "../_libs/tanstack__react-router.mjs";
import { S as StudioStepNav } from "./step-nav-4ASvtYHx.mjs";
import { S as StudioTabNav } from "./StudioTabNav-A7uSJqj-.mjs";
import { u as useCurrentProject, s as studioActions } from "./store-D8Xv1K_U.mjs";
import { r as runSimulation, a as riskColor } from "./engine-DuoJgisk.mjs";
import { B as Button, c as cn } from "./button-DjOZMqFS.mjs";
import { I as Input } from "./input-D_U8fI25.mjs";
import { L as Label } from "./label-C8WJLhmR.mjs";
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from "./select-CUSP6kj8.mjs";
import { D as Disclaimer } from "./sidebar-CQ8yt5pY.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { R as Root2, T as Trigger, P as Portal, C as Content2 } from "../_libs/radix-ui__react-popover.mjs";
import { R as Root, V as Viewport, C as Corner, S as ScrollAreaScrollbar, a as ScrollAreaThumb } from "../_libs/radix-ui__react-scroll-area.mjs";
import { L as LineChart, C as CartesianGrid, X as XAxis, Y as YAxis, T as Tooltip, a as Line, R as ResponsiveContainer, b as RadialBarChart, c as RadialBar } from "../_libs/recharts.mjs";
import { aq as Info } from "../_libs/lucide-react.mjs";
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
import "../_libs/radix-ui__react-slot.mjs";
import "../_libs/radix-ui__react-compose-refs.mjs";
import "../_libs/class-variance-authority.mjs";
import "../_libs/clsx.mjs";
import "../_libs/tailwind-merge.mjs";
import "../_libs/radix-ui__react-label.mjs";
import "../_libs/radix-ui__react-primitive.mjs";
import "../_libs/radix-ui__react-select.mjs";
import "../_libs/radix-ui__number.mjs";
import "../_libs/radix-ui__primitive.mjs";
import "../_libs/radix-ui__react-collection.mjs";
import "../_libs/radix-ui__react-context.mjs";
import "../_libs/radix-ui__react-direction.mjs";
import "../_libs/@radix-ui/react-dismissable-layer+[...].mjs";
import "../_libs/@radix-ui/react-use-callback-ref+[...].mjs";
import "../_libs/@radix-ui/react-use-escape-keydown+[...].mjs";
import "../_libs/radix-ui__react-focus-guards.mjs";
import "../_libs/radix-ui__react-focus-scope.mjs";
import "../_libs/radix-ui__react-id.mjs";
import "../_libs/@radix-ui/react-use-layout-effect+[...].mjs";
import "../_libs/radix-ui__react-popper.mjs";
import "../_libs/floating-ui__react-dom.mjs";
import "../_libs/floating-ui__dom.mjs";
import "../_libs/floating-ui__core.mjs";
import "../_libs/floating-ui__utils.mjs";
import "../_libs/radix-ui__react-arrow.mjs";
import "../_libs/radix-ui__react-use-size.mjs";
import "../_libs/radix-ui__react-portal.mjs";
import "../_libs/radix-ui__react-presence.mjs";
import "../_libs/@radix-ui/react-use-controllable-state+[...].mjs";
import "../_libs/radix-ui__react-use-previous.mjs";
import "../_libs/@radix-ui/react-visually-hidden+[...].mjs";
import "../_libs/aria-hidden.mjs";
import "../_libs/react-remove-scroll.mjs";
import "../_libs/react-remove-scroll-bar.mjs";
import "../_libs/react-style-singleton.mjs";
import "../_libs/get-nonce.mjs";
import "../_libs/use-sidecar.mjs";
import "../_libs/use-callback-ref.mjs";
import "../_libs/lodash.mjs";
import "../_libs/react-smooth.mjs";
import "../_libs/prop-types.mjs";
import "../_libs/fast-equals.mjs";
import "../_libs/tiny-invariant.mjs";
import "../_libs/react-is.mjs";
import "../_libs/d3-shape.mjs";
import "../_libs/d3-path.mjs";
import "../_libs/victory-vendor.mjs";
import "../_libs/d3-scale.mjs";
import "../_libs/internmap.mjs";
import "../_libs/d3-array.mjs";
import "../_libs/d3-time-format.mjs";
import "../_libs/d3-time.mjs";
import "../_libs/d3-interpolate.mjs";
import "../_libs/d3-color.mjs";
import "../_libs/d3-format.mjs";
import "../_libs/recharts-scale.mjs";
import "../_libs/decimal.js-light.mjs";
import "../_libs/eventemitter3.mjs";
const Popover = Root2;
const PopoverTrigger = Trigger;
const PopoverContent = reactExports.forwardRef(({ className, align = "center", sideOffset = 4, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(Portal, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
  Content2,
  {
    ref,
    align,
    sideOffset,
    className: cn(
      "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-popover-content-transform-origin)",
      className
    ),
    ...props
  }
) }));
PopoverContent.displayName = Content2.displayName;
const ScrollArea = reactExports.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
  Root,
  {
    ref,
    className: cn("relative overflow-hidden", className),
    ...props,
    children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Viewport, { className: "h-full w-full rounded-[inherit]", children }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ScrollBar, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Corner, {})
    ]
  }
));
ScrollArea.displayName = Root.displayName;
const ScrollBar = reactExports.forwardRef(({ className, orientation = "vertical", ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  ScrollAreaScrollbar,
  {
    ref,
    orientation,
    className: cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    ),
    ...props,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(ScrollAreaThumb, { className: "relative flex-1 rounded-full bg-border" })
  }
));
ScrollBar.displayName = ScrollAreaScrollbar.displayName;
function SimulationLab() {
  const project = useCurrentProject();
  const nav = useNavigate();
  const initial = {
    payloadWeight: project?.requirements?.payloadWeight ?? 10,
    batteryCapacity: 22e3,
    batteryVoltage: "12S",
    numMotors: 6,
    motorThrust: 6,
    propellerSize: 22,
    frameWeight: 6,
    windSpeed: 10,
    altitude: project?.requirements?.altitude ?? 30,
    missionDistance: 3,
    tankVolume: 10,
    sprayFlowRate: 2,
    safetyReservePct: 20
  };
  const [params, setParams] = reactExports.useState(initial);
  const result = reactExports.useMemo(() => runSimulation(params), [params]);
  const payloadCurve = reactExports.useMemo(() => Array.from({
    length: 11
  }, (_, i) => {
    const p = i;
    const r = runSimulation({
      ...params,
      payloadWeight: p
    });
    return {
      payload: p,
      flight: r.estimatedFlightTime,
      motorLoad: r.motorLoad
    };
  }), [params]);
  const batteryCurve = reactExports.useMemo(() => [5e3, 1e4, 16e3, 22e3, 3e4].map((c) => {
    const r = runSimulation({
      ...params,
      batteryCapacity: c
    });
    return {
      capacity: c,
      endurance: r.estimatedFlightTime
    };
  }), [params]);
  const windCurve = reactExports.useMemo(() => Array.from({
    length: 11
  }, (_, i) => {
    const w = i * 5;
    const r = runSimulation({
      ...params,
      windSpeed: w
    });
    return {
      wind: w,
      stability: r.windStabilityScore
    };
  }), [params]);
  const set = (k, v) => setParams({
    ...params,
    [k]: v
  });
  function save() {
    if (!project) return toast.error("No active project");
    studioActions.update(project.id, {
      simulationParameters: params,
      simulationResults: result,
      status: "Simulated",
      riskLevel: result.riskLevel
    });
    toast.success("Simulation saved to project");
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(StudioTabNav, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex justify-between items-end flex-wrap gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold", children: "Simulation Lab" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mt-1", children: "Sweep parameters and read flight envelope outcomes in real-time." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => setParams(initial), children: "Reset" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => nav({
          to: "/mission-hub/torqwings-design-studio/advisor"
        }), children: "Ask AI Advisor" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: save, className: "bg-sky-500 hover:bg-sky-600 text-white", children: "Save Simulation" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid lg:grid-cols-[320px_1fr] gap-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card/60 p-5 space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-semibold text-sm", children: "Parameters" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(N, { label: "Payload weight (kg)", value: params.payloadWeight, on: (v) => set("payloadWeight", v) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(N, { label: "Battery capacity (mAh)", value: params.batteryCapacity, on: (v) => set("batteryCapacity", v), step: 500 }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs", children: "Battery voltage" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: params.batteryVoltage, onValueChange: (v) => set("batteryVoltage", v), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: ["4S", "6S", "12S", "14S"].map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: v, children: v }, v)) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs", children: "Number of motors" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: String(params.numMotors), onValueChange: (v) => set("numMotors", Number(v)), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: ["4", "6", "8"].map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: v, children: v }, v)) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(N, { label: "Motor thrust per motor (kg)", value: params.motorThrust, on: (v) => set("motorThrust", v), step: 0.5 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(N, { label: "Propeller size (in)", value: params.propellerSize, on: (v) => set("propellerSize", v) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(N, { label: "Frame weight (kg)", value: params.frameWeight, on: (v) => set("frameWeight", v), step: 0.5 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(N, { label: "Wind speed (km/h)", value: params.windSpeed, on: (v) => set("windSpeed", v) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(N, { label: "Altitude (m)", value: params.altitude, on: (v) => set("altitude", v) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(N, { label: "Mission distance (km)", value: params.missionDistance, on: (v) => set("missionDistance", v) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(N, { label: "Tank volume (L)", value: params.tankVolume, on: (v) => set("tankVolume", v) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(N, { label: "Spray flow rate (L/min)", value: params.sprayFlowRate, on: (v) => set("sprayFlowRate", v), step: 0.5 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(N, { label: "Safety reserve (%)", value: params.safetyReservePct, on: (v) => set("safetyReservePct", v) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid sm:grid-cols-2 lg:grid-cols-3 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(K, { label: "Total weight", v: `${result.totalWeight} kg` }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(K, { label: "Total thrust", v: `${result.totalThrust} kg` }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(K, { label: "Thrust-to-weight", v: result.thrustToWeightRatio.toFixed(2), tone: riskColor(result.riskLevel) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(K, { label: "Flight time", v: `${result.estimatedFlightTime} min` }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(K, { label: "Battery consumption", v: `${result.batteryConsumption}%` }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(K, { label: "Motor load", v: `${result.motorLoad}%` }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(K, { label: "Payload safety margin", v: `${result.payloadSafetyMargin}%` }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(K, { label: "Wind stability", v: `${result.windStabilityScore}/100` }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(K, { label: "Coverage area", v: `${result.coverageArea} km²` }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(K, { label: "Spray duration", v: `${result.sprayDuration} min` }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(K, { label: "Mission feasibility", v: result.missionFeasibility, tone: riskColor(result.riskLevel) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(K, { label: "Risk level", v: result.riskLevel, tone: riskColor(result.riskLevel) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `rounded-xl border p-4 text-sm ${riskColor(result.riskLevel)}`, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: "Recommendation:" }),
          " ",
          result.recommendation
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid lg:grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Chart, { title: "Payload vs Flight Time", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(LineChart, { data: payloadCurve, margin: {
            top: 8,
            right: 16,
            bottom: 28,
            left: 16
          }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CartesianGrid, { strokeDasharray: "3 3", opacity: 0.25 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(XAxis, { dataKey: "payload", stroke: "#1e293b", tick: {
              fill: "#1e293b",
              fontSize: 11
            }, label: {
              value: "Payload (kg)",
              position: "insideBottom",
              offset: -14,
              fill: "#1e293b",
              fontSize: 12
            } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(YAxis, { stroke: "#1e293b", tick: {
              fill: "#1e293b",
              fontSize: 11
            }, label: {
              value: "Flight Time (min)",
              angle: -90,
              position: "insideLeft",
              fill: "#1e293b",
              fontSize: 12
            } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { contentStyle: {
              background: "hsl(220 20% 12%)",
              border: "1px solid hsl(220 10% 25%)",
              color: "#fff"
            }, formatter: (v) => [`${v} min`, "Flight time"], labelFormatter: (l) => `Payload: ${l} kg` }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Line, { type: "monotone", dataKey: "flight", stroke: "#0369a1", strokeWidth: 2.5, name: "Flight time (min)" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Chart, { title: "Battery Capacity vs Endurance", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(LineChart, { data: batteryCurve, margin: {
            top: 8,
            right: 16,
            bottom: 28,
            left: 16
          }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CartesianGrid, { strokeDasharray: "3 3", opacity: 0.25 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(XAxis, { dataKey: "capacity", stroke: "#1e293b", tick: {
              fill: "#1e293b",
              fontSize: 11
            }, label: {
              value: "Battery Capacity (mAh)",
              position: "insideBottom",
              offset: -14,
              fill: "#1e293b",
              fontSize: 12
            } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(YAxis, { stroke: "#1e293b", tick: {
              fill: "#1e293b",
              fontSize: 11
            }, label: {
              value: "Endurance (min)",
              angle: -90,
              position: "insideLeft",
              fill: "#1e293b",
              fontSize: 12
            } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { contentStyle: {
              background: "hsl(220 20% 12%)",
              border: "1px solid hsl(220 10% 25%)",
              color: "#fff"
            }, formatter: (v) => [`${v} min`, "Endurance"], labelFormatter: (l) => `Capacity: ${l} mAh` }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Line, { type: "monotone", dataKey: "endurance", stroke: "#6d28d9", strokeWidth: 2.5, name: "Endurance (min)" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Chart, { title: "Motor Load vs Payload", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(LineChart, { data: payloadCurve, margin: {
            top: 8,
            right: 16,
            bottom: 28,
            left: 16
          }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CartesianGrid, { strokeDasharray: "3 3", opacity: 0.25 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(XAxis, { dataKey: "payload", stroke: "#1e293b", tick: {
              fill: "#1e293b",
              fontSize: 11
            }, label: {
              value: "Payload (kg)",
              position: "insideBottom",
              offset: -14,
              fill: "#1e293b",
              fontSize: 12
            } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(YAxis, { stroke: "#1e293b", tick: {
              fill: "#1e293b",
              fontSize: 11
            }, label: {
              value: "Motor Load (%)",
              angle: -90,
              position: "insideLeft",
              fill: "#1e293b",
              fontSize: 12
            } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { contentStyle: {
              background: "hsl(220 20% 12%)",
              border: "1px solid hsl(220 10% 25%)",
              color: "#fff"
            }, formatter: (v) => [`${v}%`, "Motor load"], labelFormatter: (l) => `Payload: ${l} kg` }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Line, { type: "monotone", dataKey: "motorLoad", stroke: "#b45309", strokeWidth: 2.5, name: "Motor load (%)" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Chart, { title: "Wind Speed vs Stability", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(LineChart, { data: windCurve, margin: {
            top: 8,
            right: 16,
            bottom: 28,
            left: 16
          }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CartesianGrid, { strokeDasharray: "3 3", opacity: 0.25 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(XAxis, { dataKey: "wind", stroke: "#1e293b", tick: {
              fill: "#1e293b",
              fontSize: 11
            }, label: {
              value: "Wind Speed (km/h)",
              position: "insideBottom",
              offset: -14,
              fill: "#1e293b",
              fontSize: 12
            } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(YAxis, { stroke: "#1e293b", tick: {
              fill: "#1e293b",
              fontSize: 11
            }, label: {
              value: "Stability Score (/100)",
              angle: -90,
              position: "insideLeft",
              fill: "#1e293b",
              fontSize: 12
            } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { contentStyle: {
              background: "hsl(220 20% 12%)",
              border: "1px solid hsl(220 10% 25%)",
              color: "#fff"
            }, formatter: (v) => [`${v}/100`, "Stability"], labelFormatter: (l) => `Wind: ${l} km/h` }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Line, { type: "monotone", dataKey: "stability", stroke: "#047857", strokeWidth: 2.5, name: "Stability (/100)" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card/60 p-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-semibold mb-2 text-muted-foreground", children: "Thrust-to-Weight Gauge" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-36", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ jsxRuntimeExports.jsx(RadialBarChart, { innerRadius: "65%", outerRadius: "100%", data: [{
              name: "TWR",
              value: Math.min(result.thrustToWeightRatio, 3),
              fill: result.riskLevel === "Safe" ? "#047857" : result.riskLevel === "Warning" ? "#b45309" : "#b91c1c"
            }], startAngle: 180, endAngle: 0, children: /* @__PURE__ */ jsxRuntimeExports.jsx(RadialBar, { background: true, dataKey: "value" }) }) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center text-xs font-semibold text-foreground", children: [
              "TWR: ",
              result.thrustToWeightRatio.toFixed(2),
              " (target ≥ 2.0)"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `rounded-xl border p-4 flex flex-col items-center justify-center ${riskColor(result.riskLevel)}`, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs uppercase tracking-wide opacity-90", children: "Risk Level" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 text-3xl font-bold", children: result.riskLevel }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs opacity-90 mt-1", children: [
              "Mission: ",
              result.missionFeasibility
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Disclaimer, {})
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(StudioStepNav, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(FormulaPopover, {})
  ] });
}
function FormulaPopover() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed bottom-6 right-6 z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Popover, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", className: "rounded-full shadow-lg bg-sky-500 hover:bg-sky-600 text-white gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { className: "h-4 w-4" }),
      " How it's calculated"
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverContent, { side: "top", align: "end", className: "w-[380px] p-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(ScrollArea, { className: "max-h-[70vh] p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold text-sm mb-1", children: "Simulation formulas" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground mb-3", children: "Empirical model used by the Simulation Lab." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { t: "Battery weight (kg)", f: "(capacity/1000) × k", d: "k = 0.55 (4S), 0.8 (6S), 1.4 (12S), 1.7 (14S)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { t: "Payload system weight", f: "tank>0 ? tank × 1.05 : 0.3", d: "Liquid density + plumbing allowance." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { t: "Total weight", f: "frame + payload + battery + payloadSystem" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { t: "Total thrust", f: "numMotors × motorThrust" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { t: "Thrust-to-weight (TWR)", f: "totalThrust / totalWeight", d: "Safe ≥ 2.0 · Warning 1.5–2.0 · Unsafe < 1.5" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { t: "Pack energy (Wh)", f: "(capacity/1000) × voltage", d: "V = 14.8 / 22.2 / 44.4 / 51.8" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { t: "Power draw (W)", f: "totalWeight × 180 / max(TWR, 0.5)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { t: "Flight time (min)", f: "(Wh × (1 − reserve%/100)) / power × 60", d: "Floored at 2 min." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { t: "Battery consumption (%)", f: "(power × time/60) / Wh × 100", d: "Capped at 100%." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { t: "Motor load (%)", f: "(totalWeight / totalThrust) × 100", d: "100% = motors saturated." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { t: "Payload safety margin (%)", f: "(thrust − weight) / payload × 100", d: "Negative = cannot lift." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { t: "Wind stability (/100)", f: "100 − wind×2 − (15 if weight > 0.7×thrust)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { t: "Coverage area (km²)", f: "(time/60) × 25 × 0.5", d: "25 km/h cruise · 0.5 km swath." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { t: "Spray duration (min)", f: "tankVolume / sprayFlowRate" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { t: "Risk / feasibility", f: "based on TWR", d: "< 1.5 Unsafe · 1.5–2.0 Warning · ≥ 2.0 Safe" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-muted-foreground mt-4 italic", children: "Indicative model for design exploration — validate with bench tests before flight." })
    ] }) })
  ] }) });
}
function F({
  t,
  f,
  d
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-l-2 border-sky-500/40 pl-2.5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium text-foreground", children: t }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-mono text-[11px] text-sky-700 mt-0.5 break-words", children: f }),
    d && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-muted-foreground mt-0.5", children: d })
  ] });
}
function N({
  label,
  value,
  on,
  step = 1
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", step, value, onChange: (e) => on(+e.target.value) })
  ] });
}
function K({
  label,
  v,
  tone
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `rounded-lg border px-3 py-2.5 ${tone ?? "border-border/60 bg-card/60"}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] uppercase tracking-wide text-muted-foreground", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-base font-semibold mt-0.5", children: v })
  ] });
}
function Chart({
  title,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card/60 p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-semibold mb-2 text-muted-foreground", children: title }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-44", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, { width: "100%", height: "100%", children }) })
  ] });
}
export {
  SimulationLab as component
};
