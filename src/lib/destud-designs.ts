import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DesignSummary } from "@/components/destud/DesignCard";

// KNOWN GAP: studio_projects.user_id is always a mission_hub_users id (set
// by the staff-only wizard's handleSubmit — see project-service.ts), never a
// destud_users id. A DeStud (name+email) visitor has no way to create a
// studio_projects row today, so this query is real (no mock data) but will
// always return empty until that identity link exists. See the "Wizard
// entry point" note in src/routes/destud.tsx for the same underlying gap.
export function useDestudDesigns(destudUserId: string): DesignSummary[] | null {
  const [designs, setDesigns] = useState<DesignSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDesigns(null);
    supabase
      .from("studio_projects" as any)
      .select("id, project_name, vertical, purpose, status, updated_at, created_at")
      .eq("user_id", destudUserId)
      .order("updated_at", { ascending: false })
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
