import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DesignSummary } from "@/components/destud/DesignCard";

// studio_projects.user_id holds whichever id created it — a
// mission_hub_users.id for the staff wizard, or a destud_users.id for
// missions created via /destud/new-mission (MissionWizard is shared between
// both entry points; see its userId doc comment). No FK ties the column to
// either table specifically.
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
