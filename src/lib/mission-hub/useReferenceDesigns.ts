import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type ReferenceDesign = Tables<"reference_designs">;
export type ReferenceDesignInsert = TablesInsert<"reference_designs">;

type Stats = {
  total: number;
  approved: number;
  pending: number;
  verticals: number;
};

export function useReferenceDesigns(search: string, verticalFilter: string[]) {
  const [designs, setDesigns] = useState<ReferenceDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({ total: 0, approved: 0, pending: 0, verticals: 0 });
  const [tick, setTick] = useState(0);

  // Debounce search by 300 ms
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Unfiltered stats — reruns after any insert
  useEffect(() => {
    supabase
      .from("reference_designs")
      .select("approval_status, vertical")
      .then(({ data, error: sErr }) => {
        if (sErr) { console.error("[useReferenceDesigns] stats:", sErr.message); return; }
        const rows = (data ?? []) as Pick<ReferenceDesign, "approval_status" | "vertical">[];
        setStats({
          total: rows.length,
          approved: rows.filter((r) => r.approval_status === "approved").length,
          pending:  rows.filter((r) => r.approval_status === "pending").length,
          verticals: new Set(rows.map((r) => r.vertical).filter(Boolean)).size,
        });
      });
  }, [tick]);

  // Filtered grid — reruns on search, vertical filter, or insert
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      let q = supabase
        .from("reference_designs")
        .select("*")
        .order("confidence_score", { ascending: false });

      if (debouncedSearch) {
        q = q.or(`name.ilike.%${debouncedSearch}%,purpose.ilike.%${debouncedSearch}%`);
      }
      if (verticalFilter.length > 0) {
        q = q.in("vertical", verticalFilter);
      }

      const { data, error: qErr } = await q;
      if (cancelled) return;
      if (qErr) {
        console.error("[useReferenceDesigns] grid:", qErr.message);
        setError(qErr.message);
        setLoading(false);
        return;
      }
      setDesigns((data ?? []) as ReferenceDesign[]);
      setLoading(false);
    }

    load().catch((err) => {
      if (!cancelled) {
        console.error("[useReferenceDesigns] load threw:", err);
        setError(err?.message ?? "Unexpected error");
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, JSON.stringify(verticalFilter), tick]);

  const insert = useCallback(async (row: ReferenceDesignInsert) => {
    const { error: insErr } = await supabase
      .from("reference_designs")
      .insert(row);
    if (insErr) throw new Error(insErr.message);
    setTick((t) => t + 1);
  }, []);

  const approveDesign = useCallback(async (id: string, userId: string) => {
    const { error: upErr } = await supabase
      .from("reference_designs")
      .update({ approval_status: "approved", approved_by: userId })
      .eq("id", id);
    if (upErr) throw new Error(upErr.message);
    setTick((t) => t + 1);
  }, []);

  const rejectDesign = useCallback(async (id: string, userId: string) => {
    const { error: upErr } = await supabase
      .from("reference_designs")
      .update({ approval_status: "rejected", approved_by: userId })
      .eq("id", id);
    if (upErr) throw new Error(upErr.message);
    setTick((t) => t + 1);
  }, []);

  return { designs, loading, error, stats, insert, approveDesign, rejectDesign };
}
