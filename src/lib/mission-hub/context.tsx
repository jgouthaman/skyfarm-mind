import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { Role, Vertical } from "./types";

export type MhProfile = {
  user_id: string;
  full_name: string;
  email: string;
  role: Role;
  is_active: boolean;
  notification_prefs?: { new_lead?: boolean; new_contact?: boolean };
};

type Ctx = {
  loading: boolean;
  profile: MhProfile | null;
  verticals: Vertical[];
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const MissionHubAuthContext = createContext<Ctx | null>(null);

export function MissionHubAuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<MhProfile | null>(null);
  const [verticals, setVerticals] = useState<Vertical[]>([]);
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
    const { data: p } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, role, is_active, notification_prefs")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!p) {
      await supabase.auth.signOut();
      setProfile(null);
      setVerticals([]);
      setLoading(false);
      return;
    }
    setProfile(p as any);
    const { data: vs } = await supabase
      .from("user_verticals")
      .select("vertical")
      .eq("user_id", user.id);
    setVerticals(((vs as any) ?? []).map((r: any) => r.vertical));
    setLoading(false);
  }

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        load();
      }
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setVerticals([]);
    navigate({ to: "/mission-hub/login" });
  }

  return (
    <MissionHubAuthContext.Provider value={{ loading, profile, verticals, refresh: load, signOut }}>
      {children}
    </MissionHubAuthContext.Provider>
  );
}

export function useMissionHubAuth() {
  const ctx = useContext(MissionHubAuthContext);
  if (!ctx) throw new Error("useMissionHubAuth must be used within MissionHubAuthProvider");
  return ctx;
}
