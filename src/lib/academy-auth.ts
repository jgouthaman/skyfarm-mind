import { supabase } from "@/integrations/supabase/client";

export interface AcademyUser {
  id: string;
  full_name: string;
  email: string;
}

export async function verifyAcademyUser(name: string, email: string): Promise<AcademyUser | null> {
  const { data, error } = await supabase.rpc("verify_academy_user" as any, {
    p_name: name.trim(),
    p_email: email.trim(),
  } as any);
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row ?? null;
}
