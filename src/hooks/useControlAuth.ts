import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ControlAuthState = {
  loading: boolean;
  userId: string | null;
  phone: string | null;
  roles: string[];
  isAdmin: boolean;
};

/**
 * Client-side auth + role hook for control-center pages.
 * Uses Supabase session and reads roles via the authenticated client (RLS lets the
 * user read their own roles).
 */
export function useControlAuth(): ControlAuthState {
  const [state, setState] = useState<ControlAuthState>({
    loading: true,
    userId: null,
    phone: null,
    roles: [],
    isAdmin: false,
  });

  useEffect(() => {
    let cancelled = false;
    async function load(userId: string | null) {
      if (!userId) {
        if (!cancelled) setState({ loading: false, userId: null, phone: null, roles: [], isAdmin: false });
        return;
      }
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("phone").eq("user_id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      if (cancelled) return;
      const roleList = (roles ?? []).map((r) => r.role as string);
      setState({
        loading: false,
        userId,
        phone: profile?.phone ?? null,
        roles: roleList,
        isAdmin: roleList.includes("admin"),
      });
    }

    supabase.auth.getUser().then(({ data }) => load(data.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      load(session?.user?.id ?? null);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
