import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { d as useNavigate } from "../_libs/tanstack__react-router.mjs";
import { s as supabase } from "./client-DYtC4Igq.mjs";
const MissionHubAuthContext = reactExports.createContext(null);
function MissionHubAuthProvider({ children }) {
  const [loading, setLoading] = reactExports.useState(true);
  const [profile, setProfile] = reactExports.useState(null);
  const [verticals, setVerticals] = reactExports.useState([]);
  const navigate = useNavigate();
  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setProfile(null);
      setVerticals([]);
      setLoading(false);
      return;
    }
    const { data: p } = await supabase.from("mission_hub_users").select("id, full_name, email, role, status, notification_prefs, industries").eq("id", user.id).maybeSingle();
    if (!p) {
      await supabase.auth.signOut();
      setProfile(null);
      setVerticals([]);
      setLoading(false);
      return;
    }
    setProfile(p);
    setVerticals(p.industries ?? []);
    setLoading(false);
  }
  reactExports.useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        load();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setVerticals([]);
    navigate({ to: "/mission-hub/login" });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MissionHubAuthContext.Provider, { value: { loading, profile, verticals, refresh: load, signOut }, children });
}
function useMissionHubAuth() {
  const ctx = reactExports.useContext(MissionHubAuthContext);
  if (!ctx) throw new Error("useMissionHubAuth must be used within MissionHubAuthProvider");
  return ctx;
}
export {
  MissionHubAuthProvider as M,
  useMissionHubAuth as u
};
