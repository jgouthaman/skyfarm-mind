import { supabase } from "@/integrations/supabase/client";

export interface Pilot {
  id: string;
  name: string;
  phone: string;
  status: string;
  created_at: string;
}

export interface Farm {
  id: string;
  name: string;
  farmer: string | null;
  location: string | null;
  size_acres: number | null;
  crop: string | null;
  service_needed: string | null;
  created_at: string;
}

export interface Mission {
  id: string;
  farm_id: string;
  pilot_id: string | null;
  drone_id: string | null;
  service: string;
  status: string;
  notes: string | null;
  scheduled_at: string | null;
  created_at: string;
}

export interface Drone {
  id: string;
  name: string;
  model: string | null;
  serial_no: string | null;
  capacity_litres: number | null;
  status: string;
  notes: string | null;
  created_at: string;
}


export interface FieldUpload {
  id: string;
  mission_id: string | null;
  farm_id: string | null;
  pilot_id: string | null;
  image_url: string;
  caption: string | null;
  lat: number | null;
  lng: number | null;
  captured_at: string;
  created_at: string;
}

export const SERVICES = [
  "Aerial Survey",
  "Boundary Mapping",
  "Spraying",
  "Crop Health Inspection",
  "Yield Estimation",
] as const;

// ---------- Pilots ----------
export async function listPilots() {
  const { data, error } = await supabase
    .from("pilots")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Pilot[];
}

export async function createPilot(input: { name: string; phone: string }) {
  const phone = input.phone.replace(/\D/g, "").slice(-10);
  const { data, error } = await supabase
    .from("pilots")
    .insert({ name: input.name, phone, status: "active" })
    .select()
    .single();
  if (error) throw error;
  return data as Pilot;
}

export async function getPilotByPhone(phone: string) {
  const clean = phone.replace(/\D/g, "").slice(-10);
  const { data, error } = await supabase
    .from("pilots")
    .select("*")
    .eq("phone", clean)
    .maybeSingle();
  if (error) throw error;
  return data as Pilot | null;
}

// ---------- Farms ----------
export async function listFarms() {
  const { data, error } = await supabase
    .from("farms")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Farm[];
}

export async function getFarm(id: string) {
  const { data, error } = await supabase
    .from("farms")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Farm | null;
}

export async function createFarm(input: {
  name: string;
  farmer?: string;
  location?: string;
  size_acres?: number;
  crop?: string;
  service_needed?: string;
}) {
  const { data, error } = await supabase
    .from("farms")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Farm;
}

// ---------- Missions ----------
export async function listMissions() {
  const { data, error } = await supabase
    .from("missions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Mission[];
}

export async function listMissionsForPilot(pilotId: string) {
  const { data, error } = await supabase
    .from("missions")
    .select("*")
    .eq("pilot_id", pilotId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Mission[];
}

export async function listMissionsForFarm(farmId: string) {
  const { data, error } = await supabase
    .from("missions")
    .select("*")
    .eq("farm_id", farmId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Mission[];
}

export async function createMission(input: {
  farm_id: string;
  pilot_id: string;
  drone_id?: string | null;
  service: string;
  notes?: string;
  scheduled_at?: string | null;
}) {
  const { data, error } = await supabase
    .from("missions")
    .insert({ ...input, status: "assigned" })
    .select()
    .single();
  if (error) throw error;
  return data as Mission;
}

// ---------- Drones ----------
export async function listDrones() {
  const { data, error } = await supabase
    .from("drones")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Drone[];
}

export async function createDrone(input: {
  name: string;
  model?: string;
  serial_no?: string;
  capacity_litres?: number;
  notes?: string;
}) {
  const { data, error } = await supabase
    .from("drones")
    .insert({ ...input, status: "available" })
    .select()
    .single();
  if (error) throw error;
  return data as Drone;
}

export async function listMissionsForDrone(droneId: string) {
  const { data, error } = await supabase
    .from("missions")
    .select("*")
    .eq("drone_id", droneId)
    .order("scheduled_at", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as Mission[];
}


// ---------- Field uploads ----------
export async function listFieldUploadsForFarm(farmId: string) {
  const { data, error } = await supabase
    .from("field_uploads")
    .select("*")
    .eq("farm_id", farmId)
    .order("captured_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as FieldUpload[];
}

export async function listAllRecentUploads(limit = 24) {
  const { data, error } = await supabase
    .from("field_uploads")
    .select("*")
    .order("captured_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as FieldUpload[];
}

export async function uploadFieldPhoto(opts: {
  file: File;
  missionId: string;
  farmId: string;
  pilotId: string;
  caption?: string;
  lat?: number | null;
  lng?: number | null;
}) {
  const ext = opts.file.name.split(".").pop() || "jpg";
  const path = `${opts.farmId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("field-uploads")
    .upload(path, opts.file, {
      contentType: opts.file.type || "image/jpeg",
      upsert: false,
    });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from("field-uploads").getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  const { data, error } = await supabase
    .from("field_uploads")
    .insert({
      mission_id: opts.missionId,
      farm_id: opts.farmId,
      pilot_id: opts.pilotId,
      image_url: publicUrl,
      caption: opts.caption ?? null,
      lat: opts.lat ?? null,
      lng: opts.lng ?? null,
      captured_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;

  // Mark mission in_progress on first upload
  await supabase
    .from("missions")
    .update({ status: "in_progress" })
    .eq("id", opts.missionId)
    .eq("status", "assigned");

  return data as FieldUpload;
}
