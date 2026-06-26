import { supabase } from "@/integrations/supabase/client";
import type { DesignRule, DesignRuleInsert } from "./sme-types";

export async function fetchDesignRules(): Promise<DesignRule[]> {
  const { data, error } = await supabase
    .from("design_rules")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DesignRule[];
}

export async function insertDesignRule(rule: DesignRuleInsert): Promise<DesignRule> {
  const { data, error } = await supabase
    .from("design_rules")
    .insert(rule)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as DesignRule;
}

export async function updateDesignRule(
  id: string,
  patch: Partial<DesignRuleInsert>,
): Promise<void> {
  const { error } = await supabase
    .from("design_rules")
    .update(patch)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteDesignRule(id: string): Promise<void> {
  const { error } = await supabase
    .from("design_rules")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
