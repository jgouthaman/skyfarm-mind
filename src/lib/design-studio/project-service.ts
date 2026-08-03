import { supabase } from "@/integrations/supabase/client";
import type { WizardFormState, StudioProjectInsert } from "./wizard-types";
import type { IntelligenceResult } from "@/lib/intelligence/types";
import type { DesignStudioSource } from "@/lib/intelligence/designStudioBuilder";
import { DEFAULT_VEHICLE_TYPE } from "@/constants/vehicleTypes.constants";

export function buildInsertPayload(
  form: WizardFormState,
  userId: string,
  recommendation: IntelligenceResult | null = null,
  acceptedSource: 'rule' | 'reference' = 'rule',
): StudioProjectInsert {
  return {
    user_id:      userId,
    project_name: form.projectName.trim(),
    vehicle_type: form.vehicleType || DEFAULT_VEHICLE_TYPE,
    vertical:     form.vertical,
    purpose:      form.purpose,
    user_type:    form.userType,
    status:       "Draft",
    risk_level:   null,
    requirements: {
      payloadWeight:      form.payloadWeight,
      requiredFlightTime: form.requiredFlightTime,
      missionArea:        form.missionArea,
      areaUnit:           form.areaUnit,
      altitude:           form.altitude,
      terrain:            form.terrain,
      windCondition:      form.windCondition,
      budgetRange:        form.budgetRange,
      automationLevel:    form.automationLevel,
    },
    payload_details: form.payloadDetails,
    safety: {
      returnToHome:       form.returnToHome,
      gpsHold:            form.gpsHold,
      obstacleAvoidance:  form.obstacleAvoidance,
      geofencing:         form.geofencing,
      lowBatteryFailsafe: form.lowBatteryFailsafe,
      parachute:          form.parachute,
      flightLogging:      form.flightLogging,
    },
    design_recommendation: recommendation
      ? { ...recommendation, accepted_source: acceptedSource }
      : null,
  };
}

export async function createProject(
  payload: StudioProjectInsert,
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("studio_projects")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// studio_projects' RLS only allows INSERT/SELECT to the `authenticated` role
// with user_id = auth.uid() (see 20260617104400) — a DeStud session has
// neither, since it's an anon session identified by a destud_users row, not
// a real Supabase Auth user. This goes through a SECURITY DEFINER RPC
// instead, which verifies the destud_users row itself and stores ownership
// in a separate destud_user_id column (not user_id, which has a hard FK to
// auth.users).
export async function createDestudProject(
  destudUserId: string,
  form: WizardFormState,
  recommendation: IntelligenceResult | null = null,
  acceptedSource: 'rule' | 'reference' = 'rule',
): Promise<{ id: string } | null> {
  const payload = buildInsertPayload(form, destudUserId, recommendation, acceptedSource);
  const { data, error } = await supabase.rpc("create_destud_studio_project" as any, {
    p_destud_user_id: destudUserId,
    p_project_name: payload.project_name,
    p_vehicle_type: payload.vehicle_type,
    p_vertical: payload.vertical,
    p_purpose: payload.purpose,
    p_user_type: payload.user_type,
    p_requirements: payload.requirements,
    p_payload_details: payload.payload_details,
    p_safety: payload.safety,
    p_design_recommendation: payload.design_recommendation,
  } as any);
  if (error) throw new Error(error.message);
  return data ? { id: data as unknown as string } : null;
}

// design_recommendation is exactly what buildInsertPayload() stored:
// { ...IntelligenceResult, accepted_source: acceptedSource }. requirements
// is buildInsertPayload()'s own requirements object — { payloadWeight,
// requiredFlightTime, missionArea, ... } — the raw WizardFormState string
// fields, not payload_details (a different jsonb column, unrelated
// per-vertical payload config that buildDesignStudioOutput never reads).
export interface DestudProjectDetail {
  id: string;
  project_name: string;
  vertical: string;
  purpose: string;
  status: string;
  created_at: string;
  requirements: Record<string, unknown> | null;
  design_recommendation: (IntelligenceResult & { accepted_source: DesignStudioSource }) | null;
}

// studio_projects' RLS is authenticated-only (same as createDestudProject's
// comment above) — reads for a DeStud (anon) session go through this
// SECURITY DEFINER RPC instead, which also enforces that a DeStud user can
// only ever fetch their own project (destud_user_id = p_destud_user_id is
// baked into the RPC's WHERE clause, not just a status check).
export async function fetchDestudProject(
  destudUserId: string,
  projectId: string,
): Promise<DestudProjectDetail | null> {
  const { data, error } = await supabase.rpc("get_destud_studio_project_by_id" as any, {
    p_destud_user_id: destudUserId,
    p_project_id: projectId,
  } as any);
  if (error) throw new Error(error.message);
  return (data as DestudProjectDetail) ?? null;
}

export async function fetchProjectStats(userId: string, isAdmin: boolean) {
  const makeQuery = (status?: string) => {
    let q = supabase
      .from("studio_projects")
      .select("*", { count: "exact", head: true });
    if (!isAdmin) q = q.eq("user_id", userId);
    if (status)   q = q.eq("status", status);
    return q;
  };

  const [total, draft, designed, simulated, reviewed] = await Promise.all([
    makeQuery(),
    makeQuery("Draft"),
    makeQuery("Designed"),
    makeQuery("Simulated"),
    makeQuery("Reviewed"),
  ]);

  return {
    total:     total.count     ?? 0,
    draft:     draft.count     ?? 0,
    designed:  designed.count  ?? 0,
    simulated: simulated.count ?? 0,
    reviewed:  reviewed.count  ?? 0,
  };
}

export async function fetchProjectsPage(
  userId: string,
  isAdmin: boolean,
  page: number,
  pageSize: number,
  search: string,
) {
  const from = page * pageSize;
  const to   = from + pageSize - 1;

  let q = supabase
    .from("studio_projects")
    .select(
      "id, project_name, vertical, purpose, status, risk_level, created_at, updated_at, user_id",
      { count: "exact" },
    )
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (!isAdmin)      q = q.eq("user_id", userId);
  if (search.trim()) q = q.ilike("project_name", `%${search.trim()}%`);

  const { data, error, count } = await q;
  if (error) throw new Error(error.message);
  return { rows: data ?? [], total: count ?? 0 };
}
