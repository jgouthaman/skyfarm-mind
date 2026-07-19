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

export type AcademyModuleSectionType = "content" | "quiz" | "final_test";

export interface AcademyModuleSection {
  id: string;
  module_id: string;
  order_index: number;
  section_type: AcademyModuleSectionType;
  title: string;
  topic_brief: string;
}

export async function getModuleSections(moduleId: string): Promise<AcademyModuleSection[]> {
  const { data, error } = await supabase
    .from("academy_module_sections" as any)
    .select("*")
    .eq("module_id", moduleId)
    .order("order_index");
  if (error) throw error;
  return (data as unknown as AcademyModuleSection[]) ?? [];
}

export interface SaveQuizAttemptInput {
  user_id: string;
  section_id: string;
  generated_questions: unknown;
  user_answers: Record<number, string>;
  score: number;
  total: number;
  passed: boolean;
}

export async function saveQuizAttempt(input: SaveQuizAttemptInput): Promise<void> {
  const { count, error: countError } = await supabase
    .from("academy_quiz_attempts" as any)
    .select("id", { count: "exact", head: true })
    .eq("user_id", input.user_id)
    .eq("section_id", input.section_id);
  if (countError) throw countError;

  const { error } = await supabase.from("academy_quiz_attempts" as any).insert({
    ...input,
    attempt_number: (count ?? 0) + 1,
  } as any);
  if (error) throw error;
}
