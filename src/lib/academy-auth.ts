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

export interface AcademyModule {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  completed: boolean;
}

export async function getCourseModules(courseId: string, userId: string): Promise<AcademyModule[]> {
  const { data, error } = await supabase.rpc("get_course_modules_for_user" as any, {
    p_course_id: courseId,
    p_user_id: userId,
  } as any);
  if (error) throw error;
  return (data as AcademyModule[]) ?? [];
}

export async function setModuleComplete(userId: string, moduleId: string, done: boolean): Promise<void> {
  const { error } = await supabase.rpc("set_module_complete" as any, {
    p_user_id: userId,
    p_module_id: moduleId,
    p_done: done,
  } as any);
  if (error) throw error;
}
