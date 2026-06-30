import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { L as Link } from "../_libs/tanstack__react-router.mjs";
import { u as useQuery, a as useQueryClient, b as useMutation } from "../_libs/tanstack__react-query.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { T as Toaster } from "./sonner-DeNSN9-c.mjs";
import { B as Button } from "./button-DjOZMqFS.mjs";
import { g as getPilotByPhone, u as uploadFieldPhoto, l as listMissionsForPilot, a as listFarms, b as listFieldUploadsForFarm } from "./cloud-api-CcVCjfQj.mjs";
import { P as Plane, d as Leaf, e as LoaderCircle, M as MapPin, C as Camera, A as ArrowLeft, f as Upload, S as Smartphone, I as Image, g as CircleCheck } from "../_libs/lucide-react.mjs";
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
import "../_libs/tanstack__query-core.mjs";
import "../_libs/radix-ui__react-slot.mjs";
import "../_libs/radix-ui__react-compose-refs.mjs";
import "../_libs/class-variance-authority.mjs";
import "../_libs/clsx.mjs";
import "../_libs/tailwind-merge.mjs";
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
function FieldApp() {
  const [pilot, setPilot] = reactExports.useState(() => {
    if (typeof window === "undefined") return null;
    try {
      return JSON.parse(localStorage.getItem("field-pilot") || "null");
    } catch {
      return null;
    }
  });
  const [view, setView] = reactExports.useState(pilot ? "missions" : "login");
  const [activeMission, setActiveMission] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (pilot) localStorage.setItem("field-pilot", JSON.stringify(pilot));
    else localStorage.removeItem("field-pilot");
  }, [pilot]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-gradient-hero text-foreground", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Toaster, { richColors: true, position: "top-center", theme: "dark" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-md min-h-screen flex flex-col", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "sticky top-0 z-30 backdrop-blur bg-background/60 border-b border-border/60 px-4 h-14 flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/", className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "grid place-items-center h-8 w-8 rounded-lg bg-gradient-primary shadow-glow", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plane, { className: "h-4 w-4 text-primary-foreground" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "leading-none", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-display font-semibold", children: "AgriSky Field" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-muted-foreground", children: "Pilot mobile" })
          ] })
        ] }),
        pilot && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
          setPilot(null);
          setView("login");
        }, className: "text-[11px] text-muted-foreground", children: "Sign out" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "flex-1 p-4", children: [
        view === "login" && /* @__PURE__ */ jsxRuntimeExports.jsx(Login, { onLogin: (p) => {
          setPilot(p);
          setView("missions");
        } }),
        view === "missions" && pilot && /* @__PURE__ */ jsxRuntimeExports.jsx(Missions, { pilot, onPick: (m) => {
          setActiveMission(m);
          setView("capture");
        } }),
        view === "capture" && pilot && activeMission && /* @__PURE__ */ jsxRuntimeExports.jsx(Capture, { pilot, mission: activeMission, onBack: () => setView("missions") })
      ] })
    ] })
  ] });
}
function Login({
  onLogin
}) {
  const [phone, setPhone] = reactExports.useState("");
  const [otp, setOtp] = reactExports.useState("");
  const [sent, setSent] = reactExports.useState(false);
  const [loading, setLoading] = reactExports.useState(false);
  const send = () => {
    if (phone.length !== 10) return toast.error("Enter a 10-digit mobile");
    setSent(true);
    toast.success("Demo OTP sent");
  };
  const verify = async () => {
    if (otp.length !== 5 || otp !== phone.slice(-5)) return toast.error("Invalid OTP. Please enter the last 5 digits of your mobile number.");
    setLoading(true);
    try {
      const p = await getPilotByPhone(phone);
      if (!p) {
        toast.error("This mobile is not registered. Ask the Control Center to add you as a pilot.");
        setLoading(false);
        return;
      }
      toast.success(`Welcome, ${p.name}`);
      onLogin(p);
    } catch (e) {
      toast.error(e.message);
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pt-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/60 bg-gradient-card p-6 shadow-card", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs text-accent mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Leaf, { className: "h-3.5 w-3.5" }),
      " Field operations sign-in"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-xl font-semibold", children: "Pilot login" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mt-1", children: "Use the mobile number that the Control Center registered for you." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground mt-5 block", children: "Mobile number" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("input", { inputMode: "numeric", value: phone, onChange: (e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)), placeholder: "10-digit mobile", className: "mt-1 w-full h-12 rounded-lg bg-input/40 border border-border/60 px-3 text-base outline-none focus:ring-2 focus:ring-ring" }),
    !sent ? /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: send, className: "mt-4 w-full h-12 bg-gradient-primary text-primary-foreground", children: "Send OTP" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground mt-4 block", children: "Enter OTP" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { inputMode: "numeric", value: otp, onChange: (e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 5)), placeholder: "5-digit OTP", className: "mt-1 w-full h-12 rounded-lg bg-input/40 border border-border/60 px-3 text-center text-lg tracking-[0.5em] font-mono outline-none focus:ring-2 focus:ring-ring" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: verify, disabled: loading, className: "mt-4 w-full h-12 bg-gradient-agri text-primary-foreground", children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : "Verify & Login" })
    ] })
  ] }) });
}
function Missions({
  pilot,
  onPick
}) {
  const {
    data: missions = [],
    isLoading
  } = useQuery({
    queryKey: ["field-missions", pilot.id],
    queryFn: () => listMissionsForPilot(pilot.id),
    refetchInterval: 5e3
  });
  const {
    data: farms = []
  } = useQuery({
    queryKey: ["farms"],
    queryFn: listFarms
  });
  const farmOf = (id) => farms.find((f) => f.id === id);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4 pt-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Welcome back" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "text-2xl font-semibold", children: [
        "Hi, ",
        pilot.name,
        " 👋"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Your assigned missions from the Control Center." })
    ] }),
    isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center py-10 text-sm text-muted-foreground", children: "Loading missions…" }) : missions.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-dashed border-border/60 p-8 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Leaf, { className: "h-8 w-8 mx-auto text-muted-foreground" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-sm text-muted-foreground", children: "No missions assigned yet. The Control Center will assign farms to you here." })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: missions.map((m) => {
      const f = farmOf(m.farm_id);
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => onPick(m), className: "w-full text-left rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-muted-foreground", children: m.service }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-semibold", children: f?.name || "Farm" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] px-2 py-1 rounded-full border bg-primary/15 text-primary border-primary/30 capitalize", children: m.status.replace("_", " ") })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 text-xs text-muted-foreground flex items-center gap-3 flex-wrap", children: [
          f?.location && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(MapPin, { className: "h-3 w-3" }),
            f.location
          ] }),
          f?.crop && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: f.crop })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 text-xs text-accent flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Camera, { className: "h-3 w-3" }),
          " Tap to capture photo"
        ] })
      ] }, m.id);
    }) })
  ] });
}
function Capture({
  pilot,
  mission,
  onBack
}) {
  const qc = useQueryClient();
  const {
    data: farms = []
  } = useQuery({
    queryKey: ["farms"],
    queryFn: listFarms
  });
  const farm = farms.find((f) => f.id === mission.farm_id);
  const {
    data: uploads = [],
    refetch
  } = useQuery({
    queryKey: ["uploads", mission.farm_id],
    queryFn: () => listFieldUploadsForFarm(mission.farm_id)
  });
  const fileRef = reactExports.useRef(null);
  const [preview, setPreview] = reactExports.useState(null);
  const [file, setFile] = reactExports.useState(null);
  const [coords, setCoords] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => setCoords({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude
    }), () => {
    }, {
      enableHighAccuracy: true,
      timeout: 5e3
    });
  }, []);
  const onPick = (f) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };
  const up = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Pick a photo first");
      return uploadFieldPhoto({
        file,
        missionId: mission.id,
        farmId: mission.farm_id,
        pilotId: pilot.id,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null
      });
    },
    onSuccess: () => {
      toast.success("Photo synced to Control Center");
      setFile(null);
      setPreview(null);
      refetch();
      qc.invalidateQueries({
        queryKey: ["field-missions", pilot.id]
      });
    },
    onError: (e) => toast.error(e.message)
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4 pt-2 pb-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: onBack, className: "text-xs text-muted-foreground flex items-center gap-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "h-3 w-3" }),
      " Back to missions"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-xl font-semibold", children: "Field Photo Capture" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-muted-foreground", children: mission.service }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold", children: farm?.name }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-1", children: [
        farm?.location && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(MapPin, { className: "inline h-3 w-3 mr-1" }),
          farm.location
        ] }),
        coords && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-accent", children: [
          "GPS: ",
          coords.lat.toFixed(4),
          ", ",
          coords.lng.toFixed(4)
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-sm font-semibold flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Camera, { className: "h-4 w-4 text-accent" }),
        " Capture field photo"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { ref: fileRef, type: "file", accept: "image/*", capture: "environment", className: "hidden", onChange: (e) => onPick(e.target.files?.[0] || null) }),
      preview ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: preview, alt: "Captured field photo preview", className: "w-full rounded-lg border border-border/60" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => {
            setFile(null);
            setPreview(null);
          }, children: "Retake" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => up.mutate(), disabled: up.isPending, className: "bg-gradient-agri text-primary-foreground", children: up.isPending ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "h-4 w-4 mr-1" }),
            " Push to Control Center"
          ] }) })
        ] })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: () => fileRef.current?.click(), className: "w-full h-14 bg-gradient-primary text-primary-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Camera, { className: "h-5 w-5 mr-2" }),
        " Open camera"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[11px] text-muted-foreground flex items-start gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Smartphone, { className: "h-3 w-3 mt-0.5" }),
        " On mobile this opens the camera. On desktop you can pick a file."
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-sm font-semibold flex items-center gap-2 mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { className: "h-4 w-4 text-accent" }),
        " Already uploaded (",
        uploads.length,
        ")"
      ] }),
      uploads.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "No photos yet for this farm." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-3 gap-2", children: uploads.slice(0, 9).map((u) => /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: u.image_url, alt: "", loading: "lazy", className: "aspect-square w-full object-cover rounded-md border border-border/60" }, u.id)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-accent/30 bg-accent/5 p-3 text-xs flex items-start gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-4 w-4 text-accent shrink-0 mt-0.5" }),
      "Photos appear in real-time under this farm in the Control Center (Farms → ",
      farm?.name,
      ")."
    ] })
  ] });
}
export {
  FieldApp as component
};
