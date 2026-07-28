import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DesignSummary } from "@/components/destud/DesignCard";

// studio_projects' RLS only allows SELECT to the `authenticated` role with
// user_id = auth.uid() (20260617104400) — a DeStud anon session can't
// satisfy that, so a direct .from("studio_projects") query here always came
// back empty (or errored) regardless of how many missions the user had
// actually created. Missions saved via /destud/new-mission are owned via the
// separate destud_user_id column instead, read through the same
// SECURITY DEFINER RPC (get_destud_studio_projects) the wizard's save path
// uses to bypass that RLS safely.
export function useDestudDesigns(destudUserId: string): DesignSummary[] | null {
  const [designs, setDesigns] = useState<DesignSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDesigns(null);
    supabase
      .rpc("get_destud_studio_projects" as any, { p_destud_user_id: destudUserId } as any)
      .then(({ data, error }: any) => {
        if (cancelled) return;
        if (error) {
          console.error("[DeStud] failed to load designs:", error);
          setDesigns([]);
          return;
        }
        setDesigns((data as DesignSummary[]) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [destudUserId]);

  return designs;
}

export function designsThisMonth(designs: DesignSummary[]): number {
  const now = new Date();
  return designs.filter((d: any) => {
    const created = new Date(d.created_at ?? d.updated_at);
    return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
  }).length;
}
