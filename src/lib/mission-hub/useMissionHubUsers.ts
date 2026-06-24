import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Industry, MhUser } from "./types";

// Loads Mission Hub users from `mission_hub_users` and the `industries`
// lookup. Returns a `reload` callback to refresh after mutations.
export function useMissionHubUsers() {
  const [users, setUsers] = useState<MhUser[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: u }, { data: ind }] = await Promise.all([
        supabase
          .from("mission_hub_users")
          .select("id, full_name, email, role, status, industries, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("industries").select("id, name, slug").order("name", { ascending: true }),
      ]);
      if (cancelled) return;
      setUsers(((u as MhUser[]) ?? []));
      setIndustries(((ind as Industry[]) ?? []));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return { users, industries, loading, reload };
}
