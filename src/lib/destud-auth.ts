import { supabase } from "@/integrations/supabase/client";

export interface DestudUser {
  id: string;
  full_name: string;
  email: string;
}

// Mirrors verifyAcademyUser (src/lib/academy-auth.ts): no real Supabase Auth
// session for this flow, so verification happens via a SECURITY DEFINER RPC
// against destud_users rather than a client-side select.
export async function verifyDestudUser(name: string, email: string): Promise<DestudUser | null> {
  const { data, error } = await supabase.rpc("verify_destud_user" as any, {
    p_name: name.trim(),
    p_email: email.trim(),
  } as any);
  if (error) throw error;
  return (data as DestudUser) ?? null;
}
