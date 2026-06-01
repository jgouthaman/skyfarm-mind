// Mock API layer for AgriSky Pilot Mobile App -> Control Center sync.
// Structured so each function can later be swapped for a real fetch() call
// to the documented backend endpoints.

export type SyncStatus = "synced" | "syncing" | "pending" | "failed";

export interface MobileSync {
  missionId: string;
  pilotName: string;
  pilotPhone: string;
  deviceId: string;
  appVersion: string;
  status: SyncStatus;
  lastSyncedAt: string; // ISO
  pendingItems: number;
  source: "AgriSky Pilot Mobile App";
}

export interface SurveyMedia {
  id: string;
  missionId: string;
  url: string;
  thumbnail: string;
  lat: number;
  lng: number;
  capturedAt: string;
  uploadedAt: string;
  pilotName: string;
  sizeKb: number;
  tag: string;
}

export interface SprayLog {
  missionId: string;
  fertilizerType: string;
  quantityLoaded: string;
  quantityUsed: string;
  areaCovered: string;
  startTime: string;
  endTime: string;
  pilotRemarks: string;
  completionStatus: "completed" | "in_progress" | "aborted";
  submittedAt: string;
  pilotName: string;
}

export interface Telemetry {
  missionId: string;
  lat: number;
  lng: number;
  battery: number;
  altitudeM: number;
  speedMs: number;
  gpsSignal: "Strong" | "Good" | "Weak";
  progress: number;
  lastUpdate: string;
}

export interface ActivityEvent {
  id: string;
  missionId: string;
  type:
    | "mission_created"
    | "assigned"
    | "started"
    | "image_uploaded"
    | "spray_submitted"
    | "completed"
    | "synced";
  description: string;
  actor: string;
  source: "Portal" | "Mobile App";
  timestamp: string;
}

export interface SyncHistoryItem {
  id: string;
  missionId: string;
  dataType: "Survey Images" | "Spray Log" | "Telemetry" | "Mission Status" | "Activity";
  count: number;
  source: "AgriSky Pilot Mobile App";
  status: "success" | "retrying" | "failed";
  timestamp: string;
  retryCount?: number;
  errorMessage?: string;
}

const wait = <T,>(data: T, ms = 250) => new Promise<T>((r) => setTimeout(() => r(data), ms));

// GET /api/missions/:id/mobile-sync
export async function getMobileSync(missionId: string): Promise<MobileSync> {
  return wait({
    missionId,
    pilotName: "Karthik R.",
    pilotPhone: "+91 99402 63589",
    deviceId: "PILOT-AND-0421",
    appVersion: "1.4.2",
    status: "synced",
    lastSyncedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    pendingItems: 0,
    source: "AgriSky Pilot Mobile App",
  });
}

// GET /api/missions/:id/media
export async function getMissionMedia(missionId: string): Promise<SurveyMedia[]> {
  const base = Date.now();
  return wait(
    Array.from({ length: 6 }).map((_, i) => ({
      id: `img-${i + 1}`,
      missionId,
      url: `https://picsum.photos/seed/agri-${missionId}-${i}/640/420`,
      thumbnail: `https://picsum.photos/seed/agri-${missionId}-${i}/320/210`,
      lat: 12.9716 + i * 0.0008,
      lng: 77.5946 + i * 0.0007,
      capturedAt: new Date(base - (60 - i * 6) * 60 * 1000).toISOString(),
      uploadedAt: new Date(base - (55 - i * 6) * 60 * 1000).toISOString(),
      pilotName: "Karthik R.",
      sizeKb: 1820 + i * 64,
      tag: ["Aerial", "NDVI", "Aerial", "Boundary", "Aerial", "Stress Patch"][i] ?? "Aerial",
    }))
  );
}

// GET /api/missions/:id/spray-log
export async function getSprayLog(missionId: string): Promise<SprayLog> {
  return wait({
    missionId,
    fertilizerType: "Neem Oil Solution (Organic)",
    quantityLoaded: "8 L",
    quantityUsed: "6.4 L",
    areaCovered: "0.5 acre",
    startTime: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    pilotRemarks: "Wind 6 km/h, even coverage. Nozzle 2 partial clog cleared mid-run.",
    completionStatus: "completed",
    submittedAt: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
    pilotName: "Karthik R.",
  });
}

// GET /api/missions/:id/telemetry
export async function getTelemetry(missionId: string): Promise<Telemetry> {
  return wait({
    missionId,
    lat: 12.9722,
    lng: 77.5953,
    battery: 68,
    altitudeM: 24.5,
    speedMs: 5.2,
    gpsSignal: "Strong",
    progress: 62,
    lastUpdate: new Date(Date.now() - 8 * 1000).toISOString(),
  });
}

// GET /api/missions/:id/activity-logs
export async function getActivityLogs(missionId: string): Promise<ActivityEvent[]> {
  const base = Date.now();
  const m = (mins: number) => new Date(base - mins * 60 * 1000).toISOString();
  return wait([
    { id: "a1", missionId, type: "mission_created", description: "Mission created in Control Center", actor: "Farm Manager", source: "Portal", timestamp: m(180) },
    { id: "a2", missionId, type: "assigned", description: "Assigned to pilot Karthik R.", actor: "Farm Manager", source: "Portal", timestamp: m(170) },
    { id: "a3", missionId, type: "started", description: "Pilot started mission from mobile app", actor: "Karthik R.", source: "Mobile App", timestamp: m(95) },
    { id: "a4", missionId, type: "image_uploaded", description: "6 survey images uploaded from field", actor: "Karthik R.", source: "Mobile App", timestamp: m(60) },
    { id: "a5", missionId, type: "spray_submitted", description: "Spray log submitted from field", actor: "Karthik R.", source: "Mobile App", timestamp: m(24) },
    { id: "a6", missionId, type: "completed", description: "Mission marked complete by pilot", actor: "Karthik R.", source: "Mobile App", timestamp: m(20) },
    { id: "a7", missionId, type: "synced", description: "All field data synced to Control Center", actor: "System", source: "Mobile App", timestamp: m(4) },
  ]);
}

// GET /api/missions/:id/sync-history
export async function getSyncHistory(missionId: string): Promise<SyncHistoryItem[]> {
  const base = Date.now();
  const m = (mins: number) => new Date(base - mins * 60 * 1000).toISOString();
  return wait([
    { id: "s1", missionId, dataType: "Mission Status", count: 1, source: "AgriSky Pilot Mobile App", status: "success", timestamp: m(95) },
    { id: "s2", missionId, dataType: "Telemetry", count: 142, source: "AgriSky Pilot Mobile App", status: "success", timestamp: m(72) },
    { id: "s3", missionId, dataType: "Survey Images", count: 6, source: "AgriSky Pilot Mobile App", status: "success", timestamp: m(60) },
    { id: "s4", missionId, dataType: "Spray Log", count: 1, source: "AgriSky Pilot Mobile App", status: "success", timestamp: m(24) },
    { id: "s5", missionId, dataType: "Activity", count: 4, source: "AgriSky Pilot Mobile App", status: "retrying", timestamp: m(12), retryCount: 1, errorMessage: "Transient network error" },
    { id: "s6", missionId, dataType: "Activity", count: 4, source: "AgriSky Pilot Mobile App", status: "success", timestamp: m(4) },
  ]);
}

// Live feed for Field Sync Monitor — multiple missions.
export interface IncomingMissionUpdate {
  missionId: string;
  missionName: string;
  farm: string;
  pilot: string;
  status: "In Progress" | "Completed" | "Spraying" | "Uploading" | "Queued";
  progress: number;
  lastUpdate: string;
  syncStatus: SyncStatus;
}

export async function getIncomingMissionUpdates(): Promise<IncomingMissionUpdate[]> {
  const now = Date.now();
  return wait([
    { missionId: "MSN-1042", missionName: "Zone B Spraying", farm: "Arunamangala Farm", pilot: "Karthik R.", status: "In Progress", progress: 62, lastUpdate: new Date(now - 8 * 1000).toISOString(), syncStatus: "syncing" },
    { missionId: "MSN-1041", missionName: "Aerial Survey", farm: "Arunamangala Farm", pilot: "Karthik R.", status: "Completed", progress: 100, lastUpdate: new Date(now - 60 * 1000).toISOString(), syncStatus: "synced" },
    { missionId: "MSN-1040", missionName: "Boundary Mapping", farm: "Green Valley Plot", pilot: "Sundar M.", status: "Uploading", progress: 88, lastUpdate: new Date(now - 90 * 1000).toISOString(), syncStatus: "pending" },
    { missionId: "MSN-1039", missionName: "Pest Patrol Spray", farm: "Organic Field A", pilot: "Anita V.", status: "Queued", progress: 0, lastUpdate: new Date(now - 9 * 60 * 1000).toISOString(), syncStatus: "pending" },
  ]);
}

export function formatRelative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.max(1, Math.round(diff))}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
