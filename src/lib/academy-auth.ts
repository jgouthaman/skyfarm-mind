import { supabase } from "@/integrations/supabase/client";

export interface AcademyCourse {
  id: string;
  slug: string;
  title: string;
  level: string | null;
  hours: number | null;
  price: number | null;
  enrolled_at: string | null;
  status: string | null;
}

export interface AcademyUser {
  id: string;
  full_name: string;
  email: string;
  courses: AcademyCourse[];
}

export async function verifyAcademyUser(name: string, email: string): Promise<AcademyUser | null> {
  const { data, error } = await supabase.rpc("verify_academy_user" as any, {
    p_name: name.trim(),
    p_email: email.trim(),
  } as any);
  if (error) throw error;
  return (data as AcademyUser) ?? null; // rpc returns jsonb: object on match, null on no match
}
