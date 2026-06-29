import { s as supabase } from "./client-DYtC4Igq.mjs";
function buildInsertPayload(form, userId, recommendation = null, acceptedSource = "rule") {
  return {
    user_id: userId,
    project_name: form.projectName.trim(),
    vertical: form.vertical,
    purpose: form.purpose,
    user_type: form.userType,
    status: "Draft",
    risk_level: null,
    requirements: {
      payloadWeight: form.payloadWeight,
      requiredFlightTime: form.requiredFlightTime,
      missionArea: form.missionArea,
      areaUnit: form.areaUnit,
      altitude: form.altitude,
      terrain: form.terrain,
      windCondition: form.windCondition,
      budgetRange: form.budgetRange,
      automationLevel: form.automationLevel
    },
    payload_details: {
      tankCapacity: form.tankCapacity,
      sprayWidth: form.sprayWidth,
      cropType: form.cropType,
      farmSize: form.farmSize,
      liquidDensity: form.liquidDensity,
      sprayingMode: form.sprayingMode
    },
    safety: {
      returnToHome: form.returnToHome,
      gpsHold: form.gpsHold,
      obstacleAvoidance: form.obstacleAvoidance,
      geofencing: form.geofencing,
      lowBatteryFailsafe: form.lowBatteryFailsafe,
      parachute: form.parachute,
      flightLogging: form.flightLogging
    },
    design_recommendation: recommendation ? { ...recommendation, accepted_source: acceptedSource } : null
  };
}
async function createProject(payload) {
  const { data, error } = await supabase.from("studio_projects").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  return data;
}
async function fetchProjectStats(userId, isAdmin) {
  const makeQuery = (status) => {
    let q = supabase.from("studio_projects").select("*", { count: "exact", head: true });
    if (!isAdmin) q = q.eq("user_id", userId);
    if (status) q = q.eq("status", status);
    return q;
  };
  const [total, draft, designed, simulated, reviewed] = await Promise.all([
    makeQuery(),
    makeQuery("Draft"),
    makeQuery("Designed"),
    makeQuery("Simulated"),
    makeQuery("Reviewed")
  ]);
  return {
    total: total.count ?? 0,
    draft: draft.count ?? 0,
    designed: designed.count ?? 0,
    simulated: simulated.count ?? 0,
    reviewed: reviewed.count ?? 0
  };
}
async function fetchProjectsPage(userId, isAdmin, page, pageSize, search) {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  let q = supabase.from("studio_projects").select(
    "id, project_name, vertical, purpose, status, risk_level, created_at, updated_at, user_id",
    { count: "exact" }
  ).order("updated_at", { ascending: false }).range(from, to);
  if (!isAdmin) q = q.eq("user_id", userId);
  if (search.trim()) q = q.ilike("project_name", `%${search.trim()}%`);
  const { data, error, count } = await q;
  if (error) throw new Error(error.message);
  return { rows: data ?? [], total: count ?? 0 };
}
export {
  fetchProjectsPage as a,
  buildInsertPayload as b,
  createProject as c,
  fetchProjectStats as f
};
