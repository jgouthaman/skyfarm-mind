import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { d as useNavigate, L as Link } from "../_libs/tanstack__react-router.mjs";
import { u as useCurrentProject, s as studioActions } from "./store-D8Xv1K_U.mjs";
import { g as generateDroneDesign, b as generateComponentList } from "./engine-DuoJgisk.mjs";
import { B as Button, c as cn } from "./button-DjOZMqFS.mjs";
import { I as Input } from "./input-D_U8fI25.mjs";
import { L as Label } from "./label-C8WJLhmR.mjs";
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from "./select-CUSP6kj8.mjs";
import { S as Switch$1, a as SwitchThumb } from "../_libs/radix-ui__react-switch.mjs";
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
import "../_libs/lucide-react.mjs";
const Switch = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  Switch$1,
  {
    className: cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
      className
    ),
    ...props,
    ref,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      SwitchThumb,
      {
        className: cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
        )
      }
    )
  }
));
Switch.displayName = Switch$1.displayName;
function RequirementsWizard() {
  const project = useCurrentProject();
  const nav = useNavigate();
  const [step, setStep] = reactExports.useState(1);
  const [req, setReq] = reactExports.useState({
    payloadWeight: 10,
    requiredFlightTime: 20,
    missionArea: 25,
    areaUnit: "acres",
    altitude: 30,
    terrain: "Flat farm",
    windCondition: "Medium",
    budgetRange: "Balanced",
    automationLevel: "Semi-autonomous",
    payloadDetails: {},
    safetyRequirements: {
      returnToHome: true,
      gpsHold: true,
      obstacleAvoidance: false,
      geofencing: true,
      lowBatteryFailsafe: true,
      parachute: false,
      flightLogging: true
    }
  });
  if (!project) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "No active project. Create one to capture requirements." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/mission-hub/torqwings-design-studio/new", children: "Create project" }) })
    ] });
  }
  const purpose = project.purpose;
  const isAgri = /spraying/i.test(purpose);
  const isSurvey = /survey|monitor/i.test(purpose);
  const isGuard = /surveillance/i.test(purpose);
  const isFire = /fire/i.test(purpose);
  const isDelivery = /delivery/i.test(purpose);
  const isTrain = /training/i.test(purpose);
  function setPD(k, v) {
    setReq((r) => ({
      ...r,
      payloadDetails: {
        ...r.payloadDetails,
        [k]: v
      }
    }));
  }
  function setSR(k, v) {
    setReq((r) => ({
      ...r,
      safetyRequirements: {
        ...r.safetyRequirements,
        [k]: v
      }
    }));
  }
  function generate() {
    const design = generateDroneDesign(req, purpose);
    const components = generateComponentList(design, req, purpose);
    studioActions.update(project.id, {
      requirements: req,
      recommendedDesign: design,
      componentList: components,
      riskLevel: design.riskLevel,
      status: "Designed"
    });
    toast.success("Drone design generated");
    nav({
      to: "/mission-hub/torqwings-design-studio/design"
    });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-3xl space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold", children: "Requirement Intake" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground mt-1", children: [
        project.projectName,
        " · ",
        project.vertical,
        " · ",
        purpose
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 flex gap-2", children: [1, 2, 3, 4].map((n) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `flex-1 h-1.5 rounded-full ${step >= n ? "bg-sky-500" : "bg-muted"}` }, n)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 text-xs text-muted-foreground", children: [
        "Step ",
        step,
        " of 4"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card/60 p-6 space-y-5", children: [
      step === 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-semibold", children: "Mission Requirement" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Payload weight (kg)", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", value: req.payloadWeight, onChange: (e) => setReq({
            ...req,
            payloadWeight: +e.target.value
          }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Required flight time (min)", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", value: req.requiredFlightTime, onChange: (e) => setReq({
            ...req,
            requiredFlightTime: +e.target.value
          }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Mission area", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", value: req.missionArea, onChange: (e) => setReq({
            ...req,
            missionArea: +e.target.value
          }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Area unit", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: req.areaUnit, onValueChange: (v) => setReq({
            ...req,
            areaUnit: v
          }), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: ["acres", "sq km", "route km"].map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: v, children: v }, v)) })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Altitude (m)", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", value: req.altitude, onChange: (e) => setReq({
            ...req,
            altitude: +e.target.value
          }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Terrain", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: req.terrain, onValueChange: (v) => setReq({
            ...req,
            terrain: v
          }), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: ["Flat farm", "Hilly farm", "Forest", "Urban", "Industrial", "Open field", "Coastal area"].map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: v, children: v }, v)) })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Wind condition", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: req.windCondition, onValueChange: (v) => setReq({
            ...req,
            windCondition: v
          }), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: ["Low", "Medium", "High"].map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: v, children: v }, v)) })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Budget range", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: req.budgetRange, onValueChange: (v) => setReq({
            ...req,
            budgetRange: v
          }), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: ["Low cost", "Balanced", "Premium", "R&D prototype"].map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: v, children: v }, v)) })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Automation level", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: req.automationLevel, onValueChange: (v) => setReq({
            ...req,
            automationLevel: v
          }), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: ["Manual", "Semi-autonomous", "Fully autonomous"].map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: v, children: v }, v)) })
          ] }) })
        ] })
      ] }),
      step === 2 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-semibold", children: "Payload Details" }),
        isAgri && /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Tank capacity (L)", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", defaultValue: 10, onChange: (e) => setPD("tankCapacity", +e.target.value) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Spray width (m)", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", defaultValue: 4, onChange: (e) => setPD("sprayWidth", +e.target.value) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Crop type", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { onChange: (e) => setPD("crop", e.target.value), placeholder: "e.g. Cotton" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Farm size (acres)", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", defaultValue: 25, onChange: (e) => setPD("farmSize", +e.target.value) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Liquid density", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { defaultValue: "normal", onValueChange: (v) => setPD("liquidDensity", v), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "normal", children: "Normal" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "high", children: "High" })
            ] })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Spraying mode", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { defaultValue: "route-based", onValueChange: (v) => setPD("sprayMode", v), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: ["manual", "route-based", "autonomous"].map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: v, children: v }, v)) })
          ] }) })
        ] }),
        isSurvey && /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Camera type", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { defaultValue: "RGB camera", onValueChange: (v) => setPD("cameraType", v), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: ["RGB camera", "Multispectral camera", "Thermal camera", "LiDAR"].map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: v, children: v }, v)) })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Image resolution", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { defaultValue: "20 MP", onChange: (e) => setPD("imageResolution", e.target.value) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Mapping accuracy", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { defaultValue: "±5 cm", onChange: (e) => setPD("mappingAccuracy", e.target.value) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { label: "GPS accuracy required", onChange: (v) => setPD("gpsAccuracy", v) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { label: "RTK required", onChange: (v) => setPD("rtkRequired", v) })
        ] }),
        isGuard && /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Camera type", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { defaultValue: "4K + Thermal", onChange: (e) => setPD("cameraType", e.target.value) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { label: "Thermal camera required", defaultChecked: true, onChange: (v) => setPD("thermal", v) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { label: "Night vision required", onChange: (v) => setPD("nightVision", v) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { label: "Live video streaming", defaultChecked: true, onChange: (v) => setPD("liveStream", v) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Patrol duration (min)", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", defaultValue: 45, onChange: (e) => setPD("patrolDuration", +e.target.value) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { label: "Object detection", onChange: (v) => setPD("objectDetection", v) })
        ] }),
        isFire && /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { label: "Fire detection required", defaultChecked: true, onChange: (v) => setPD("fireDetection", v) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { label: "Thermal camera required", defaultChecked: true, onChange: (v) => setPD("thermal", v) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Number of extinguisher balls", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", defaultValue: 4, onChange: (e) => setPD("ballCount", +e.target.value) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { label: "Drop mechanism required", defaultChecked: true, onChange: (v) => setPD("dropMechanism", v) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Target hover stability", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { defaultValue: "high", onValueChange: (v) => setPD("hoverStability", v), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: ["low", "medium", "high"].map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: v, children: v }, v)) })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { label: "Emergency return", defaultChecked: true, onChange: (v) => setPD("emergencyReturn", v) })
        ] }),
        isDelivery && /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Package weight (kg)", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", defaultValue: 2, onChange: (e) => setPD("packageWeight", +e.target.value) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Delivery distance (km)", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", defaultValue: 5, onChange: (e) => setPD("deliveryDistance", +e.target.value) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Delivery method", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { defaultValue: "landing", onValueChange: (v) => setPD("deliveryMethod", v), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "drop", children: "Drop" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "landing", children: "Landing" })
            ] })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { label: "Return-to-home required", defaultChecked: true, onChange: (v) => setPD("rth", v) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Delivery accuracy", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { defaultValue: "±1 m", onChange: (e) => setPD("deliveryAccuracy", e.target.value) }) })
        ] }),
        isTrain && /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Level", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { defaultValue: "beginner", onValueChange: (v) => setPD("level", v), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: ["beginner", "intermediate", "advanced"].map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: v, children: v }, v)) })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Environment", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { defaultValue: "outdoor", onValueChange: (v) => setPD("environment", v), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "indoor", children: "Indoor" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "outdoor", children: "Outdoor" })
            ] })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { label: "Crash guard required", defaultChecked: true, onChange: (v) => setPD("crashGuard", v) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Max speed limit (km/h)", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", defaultValue: 25, onChange: (e) => setPD("maxSpeed", +e.target.value) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Training mode", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { defaultValue: "guided", onValueChange: (v) => setPD("trainingMode", v), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: ["guided", "free-flight", "simulator-only"].map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: v, children: v }, v)) })
          ] }) })
        ] }),
        !isAgri && !isSurvey && !isGuard && !isFire && !isDelivery && !isTrain && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "No payload-specific fields for this purpose." })
      ] }),
      step === 3 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-semibold", children: "Safety Requirements" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { label: "Return to home", defaultChecked: req.safetyRequirements.returnToHome, onChange: (v) => setSR("returnToHome", v) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { label: "GPS hold", defaultChecked: req.safetyRequirements.gpsHold, onChange: (v) => setSR("gpsHold", v) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { label: "Obstacle avoidance", defaultChecked: req.safetyRequirements.obstacleAvoidance, onChange: (v) => setSR("obstacleAvoidance", v) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { label: "Geofencing", defaultChecked: req.safetyRequirements.geofencing, onChange: (v) => setSR("geofencing", v) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { label: "Low battery failsafe", defaultChecked: req.safetyRequirements.lowBatteryFailsafe, onChange: (v) => setSR("lowBatteryFailsafe", v) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { label: "Parachute", defaultChecked: req.safetyRequirements.parachute, onChange: (v) => setSR("parachute", v) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { label: "Flight logging", defaultChecked: req.safetyRequirements.flightLogging, onChange: (v) => setSR("flightLogging", v) })
        ] })
      ] }),
      step === 4 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-semibold", children: "Review Inputs" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "text-xs bg-muted/40 rounded-lg p-4 overflow-auto max-h-96", children: JSON.stringify(req, null, 2) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between pt-2 border-t border-border/60", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", disabled: step === 1, onClick: () => setStep(step - 1), children: "Back" }),
        step < 4 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setStep(step + 1), className: "bg-sky-500 hover:bg-sky-600 text-white", children: "Next" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: generate, className: "bg-emerald-500 hover:bg-emerald-600 text-white", children: "Generate Drone Design" })
      ] })
    ] })
  ] });
}
function Grid({
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid sm:grid-cols-2 gap-4", children });
}
function Field({
  label,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs", children: label }),
    children
  ] });
}
function Toggle({
  label,
  defaultChecked,
  onChange
}) {
  const [v, setV] = reactExports.useState(!!defaultChecked);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between rounded-md border border-border/60 px-3 py-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { checked: v, onCheckedChange: (c) => {
      setV(c);
      onChange(c);
    } })
  ] });
}
export {
  RequirementsWizard as component
};
