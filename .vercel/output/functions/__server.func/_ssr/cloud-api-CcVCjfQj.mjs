import { s as supabase$1 } from "./client-DYtC4Igq.mjs";
const supabase = supabase$1;
async function getPilotByPhone(phone) {
  const clean = phone.replace(/\D/g, "").slice(-10);
  const { data, error } = await supabase.from("agrisky_pilots").select("*").eq("phone", clean).maybeSingle();
  if (error) throw error;
  return data;
}
async function listFarms() {
  const { data, error } = await supabase.from("agrisky_farms").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
async function listMissionsForPilot(pilotId) {
  const { data, error } = await supabase.from("agrisky_missions").select("*").eq("pilot_id", pilotId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
async function listFieldUploadsForFarm(farmId) {
  const { data, error } = await supabase.from("agrisky_field_uploads").select("*").eq("farm_id", farmId).order("captured_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
async function uploadFieldPhoto(opts) {
  const ext = opts.file.name.split(".").pop() || "jpg";
  const path = `${opts.farmId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: upErr } = await supabase.storage.from("field-uploads").upload(path, opts.file, {
    contentType: opts.file.type || "image/jpeg",
    upsert: false
  });
  if (upErr) throw upErr;
  const { data: pub } = supabase.storage.from("field-uploads").getPublicUrl(path);
  const publicUrl = pub.publicUrl;
  const { data, error } = await supabase.from("agrisky_field_uploads").insert({
    mission_id: opts.missionId,
    farm_id: opts.farmId,
    pilot_id: opts.pilotId,
    image_url: publicUrl,
    caption: opts.caption ?? null,
    lat: opts.lat ?? null,
    lng: opts.lng ?? null,
    captured_at: (/* @__PURE__ */ new Date()).toISOString()
  }).select().single();
  if (error) throw error;
  await supabase.from("agrisky_missions").update({ status: "in_progress" }).eq("id", opts.missionId).eq("status", "assigned");
  return data;
}
export {
  listFarms as a,
  listFieldUploadsForFarm as b,
  getPilotByPhone as g,
  listMissionsForPilot as l,
  uploadFieldPhoto as u
};
