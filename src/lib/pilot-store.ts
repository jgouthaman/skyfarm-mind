import { useSyncExternalStore } from "react";

export type MissionType = "SURVEY" | "SPRAYING";
export type MissionStatus = "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "SYNC_PENDING";
export type UploadStatus = "PENDING" | "UPLOADING" | "UPLOADED" | "FAILED";

export interface ActivityLog {
  id: string;
  missionId: string;
  action: string;
  timestamp: string;
  createdBy: string;
}
export interface Media {
  id: string;
  missionId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  gpsLat: number;
  gpsLng: number;
  capturedAt: string;
  uploadStatus: UploadStatus;
  progress: number;
  sizeKb: number;
}
export interface SprayLog {
  missionId: string;
  fertilizerType: string;
  quantityLoadedLiters: number;
  quantityUsedLiters: number;
  areaCoveredAcres: number;
  sprayStartTime: string;
  sprayEndTime: string;
  remarks: string;
  synced: boolean;
}
export interface Telemetry {
  missionId: string;
  droneId: string;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  battery: number;
  gpsSignal: string;
  timestamp: string;
  synced: boolean;
}
export interface Mission {
  id: string;
  missionCode: string;
  farmName: string;
  farmLocation: string;
  missionType: MissionType;
  status: MissionStatus;
  scheduledTime: string;
  assignedDrone: string;
  pilotName: string;
  startTime?: string;
  endTime?: string;
  progress: number;
  tankLevel: number;
}

interface State {
  pilot: { name: string; mobile: string; role: "PILOT" } | null;
  missions: Mission[];
  media: Media[];
  sprayLogs: SprayLog[];
  telemetry: Telemetry[];
  activity: ActivityLog[];
  online: boolean;
  lastSync: string | null;
}

const SEED_MISSIONS: Mission[] = [
  { id: "m1", missionCode: "AGM-2041", farmName: "Greenfield Estate", farmLocation: "Erode, TN", missionType: "SURVEY", status: "ASSIGNED", scheduledTime: "09:30 AM", assignedDrone: "AS-DRN-014", pilotName: "Pilot", progress: 0, tankLevel: 0 },
  { id: "m2", missionCode: "AGM-2042", farmName: "Sundar Paddy Farm", farmLocation: "Thanjavur, TN", missionType: "SPRAYING", status: "IN_PROGRESS", scheduledTime: "11:00 AM", assignedDrone: "AS-DRN-022", pilotName: "Pilot", startTime: "11:04 AM", progress: 42, tankLevel: 65 },
  { id: "m3", missionCode: "AGM-2043", farmName: "Krishna Cotton Fields", farmLocation: "Warangal, TS", missionType: "SPRAYING", status: "SYNC_PENDING", scheduledTime: "Yesterday", assignedDrone: "AS-DRN-014", pilotName: "Pilot", startTime: "08:10 AM", endTime: "09:42 AM", progress: 100, tankLevel: 0 },
  { id: "m4", missionCode: "AGM-2040", farmName: "Hilltop Banana Co-op", farmLocation: "Theni, TN", missionType: "SURVEY", status: "COMPLETED", scheduledTime: "Yesterday", assignedDrone: "AS-DRN-007", pilotName: "Pilot", startTime: "06:30 AM", endTime: "07:50 AM", progress: 100, tankLevel: 0 },
];

const initial: State = {
  pilot: null,
  missions: SEED_MISSIONS,
  media: [
    { id: "im1", missionId: "m2", fileName: "DJI_0012.JPG", fileUrl: "", fileType: "image/jpeg", gpsLat: 10.787, gpsLng: 79.137, capturedAt: "11:12 AM", uploadStatus: "UPLOADED", progress: 100, sizeKb: 2840 },
    { id: "im2", missionId: "m2", fileName: "DJI_0013.JPG", fileUrl: "", fileType: "image/jpeg", gpsLat: 10.788, gpsLng: 79.138, capturedAt: "11:14 AM", uploadStatus: "PENDING", progress: 0, sizeKb: 3120 },
  ],
  sprayLogs: [],
  telemetry: [],
  activity: [
    { id: "a1", missionId: "m2", action: "Mission assigned", timestamp: "10:45 AM", createdBy: "Dispatch" },
    { id: "a2", missionId: "m2", action: "Pilot arrived on site", timestamp: "10:58 AM", createdBy: "Pilot" },
    { id: "a3", missionId: "m2", action: "Mission started", timestamp: "11:04 AM", createdBy: "Pilot" },
  ],
  online: true,
  lastSync: null,
};

let state: State = (() => {
  if (typeof window === "undefined") return initial;
  try {
    const raw = localStorage.getItem("agrisky-pilot");
    if (raw) return { ...initial, ...JSON.parse(raw) };
  } catch {}
  return initial;
})();

const listeners = new Set<() => void>();
function persist() {
  if (typeof window === "undefined") return;
  try { localStorage.setItem("agrisky-pilot", JSON.stringify(state)); } catch {}
}
function set(next: Partial<State> | ((s: State) => Partial<State>)) {
  const patch = typeof next === "function" ? next(state) : next;
  state = { ...state, ...patch };
  persist();
  listeners.forEach((l) => l());
}

export const pilotStore = {
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
  get: () => state,
  login(name: string, mobile: string) {
    set({ pilot: { name: name || "Pilot", mobile, role: "PILOT" } });
  },
  logout() { set({ pilot: null }); },
  setOnline(online: boolean) { set({ online }); },
  startMission(id: string) {
    set((s) => ({
      missions: s.missions.map((m) => m.id === id ? { ...m, status: "IN_PROGRESS", startTime: nowTime() } : m),
      activity: [...s.activity, { id: uid(), missionId: id, action: "Mission started", timestamp: nowTime(), createdBy: "Pilot" }],
    }));
  },
  pauseMission(id: string) {
    set((s) => ({
      missions: s.missions.map((m) => m.id === id ? { ...m, status: "ASSIGNED" } : m),
      activity: [...s.activity, { id: uid(), missionId: id, action: "Mission paused", timestamp: nowTime(), createdBy: "Pilot" }],
    }));
  },
  completeMission(id: string) {
    set((s) => ({
      missions: s.missions.map((m) => m.id === id ? { ...m, status: s.online ? "COMPLETED" : "SYNC_PENDING", endTime: nowTime(), progress: 100 } : m),
      activity: [...s.activity, { id: uid(), missionId: id, action: "Mission completed", timestamp: nowTime(), createdBy: "Pilot" }],
    }));
  },
  addMedia(missionId: string, files: { name: string; sizeKb: number }[]) {
    const lat = 10.787 + Math.random() * 0.01;
    const lng = 79.137 + Math.random() * 0.01;
    const items: Media[] = files.map((f) => ({
      id: uid(), missionId, fileName: f.name, fileUrl: "", fileType: "image/jpeg",
      gpsLat: +lat.toFixed(5), gpsLng: +lng.toFixed(5), capturedAt: nowTime(),
      uploadStatus: "PENDING", progress: 0, sizeKb: f.sizeKb,
    }));
    set((s) => ({
      media: [...s.media, ...items],
      activity: [...s.activity, { id: uid(), missionId, action: `${files.length} image(s) queued`, timestamp: nowTime(), createdBy: "Pilot" }],
    }));
  },
  uploadMedia(id: string) {
    set((s) => ({ media: s.media.map((m) => m.id === id ? { ...m, uploadStatus: "UPLOADING", progress: 35 } : m) }));
    setTimeout(() => {
      set((s) => ({ media: s.media.map((m) => m.id === id ? { ...m, uploadStatus: "UPLOADED", progress: 100 } : m) }));
    }, 900);
  },
  retryMedia(id: string) { this.uploadMedia(id); },
  submitSprayLog(log: Omit<SprayLog, "synced">) {
    set((s) => ({
      sprayLogs: [...s.sprayLogs.filter((l) => l.missionId !== log.missionId), { ...log, synced: false }],
      activity: [...s.activity, { id: uid(), missionId: log.missionId, action: "Spray log submitted", timestamp: nowTime(), createdBy: "Pilot" }],
    }));
  },
  sendTelemetry(t: Omit<Telemetry, "synced" | "timestamp">) {
    set((s) => ({
      telemetry: [...s.telemetry, { ...t, timestamp: nowTime(), synced: false }],
    }));
  },
  syncAll() {
    set((s) => ({
      media: s.media.map((m) => m.uploadStatus === "PENDING" || m.uploadStatus === "FAILED" ? { ...m, uploadStatus: "UPLOADED", progress: 100 } : m),
      sprayLogs: s.sprayLogs.map((l) => ({ ...l, synced: true })),
      telemetry: s.telemetry.map((t) => ({ ...t, synced: true })),
      missions: s.missions.map((m) => m.status === "SYNC_PENDING" ? { ...m, status: "COMPLETED" } : m),
      lastSync: nowTime(),
    }));
  },
};

function uid() { return Math.random().toString(36).slice(2, 10); }
function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function usePilotStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    pilotStore.subscribe,
    () => selector(pilotStore.get()),
    () => selector(initial),
  );
}
