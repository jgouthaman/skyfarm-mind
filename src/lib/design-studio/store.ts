import { useEffect, useState, useSyncExternalStore } from "react";
import type { DroneProject } from "./types";

const KEY = "aerospawn-design-studio:v1";
const SELECTED_KEY = "aerospawn-design-studio:selected";

type State = { projects: DroneProject[]; selectedId: string | null };

function load(): State {
  if (typeof window === "undefined") return { projects: [], selectedId: null };
  try {
    const raw = window.localStorage.getItem(KEY);
    const sel = window.localStorage.getItem(SELECTED_KEY);
    return { projects: raw ? JSON.parse(raw) : [], selectedId: sel };
  } catch { return { projects: [], selectedId: null }; }
}

let state: State = { projects: [], selectedId: null };
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state.projects));
  if (state.selectedId) window.localStorage.setItem(SELECTED_KEY, state.selectedId);
  else window.localStorage.removeItem(SELECTED_KEY);
}
function emit() { listeners.forEach((l) => l()); }

function subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); }
function getSnap(): State { return state; }
const empty: State = { projects: [], selectedId: null };
function getServer(): State { return empty; }

let hydrated = false;
export function useStudioStore() {
  const s = useSyncExternalStore(subscribe, getSnap, getServer);
  useEffect(() => {
    if (!hydrated) { hydrated = true; state = load(); emit(); }
  }, []);
  return s;
}

export function useCurrentProject(): DroneProject | null {
  const s = useStudioStore();
  return s.projects.find((p) => p.id === s.selectedId) ?? null;
}

export const studioActions = {
  create(input: Omit<DroneProject, "id" | "createdAt" | "updatedAt" | "status">): DroneProject {
    const now = new Date().toISOString();
    const project: DroneProject = { ...input, id: crypto.randomUUID(), status: "Draft", createdAt: now, updatedAt: now };
    state = { ...state, projects: [project, ...state.projects], selectedId: project.id };
    persist(); emit(); return project;
  },
  update(id: string, patch: Partial<DroneProject>) {
    state = {
      ...state,
      projects: state.projects.map((p) => p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p),
    };
    persist(); emit();
  },
  select(id: string | null) { state = { ...state, selectedId: id }; persist(); emit(); },
  remove(id: string) {
    state = {
      projects: state.projects.filter((p) => p.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    };
    persist(); emit();
  },
  duplicate(id: string) {
    const src = state.projects.find((p) => p.id === id); if (!src) return;
    const now = new Date().toISOString();
    const copy: DroneProject = { ...src, id: crypto.randomUUID(), projectName: src.projectName + " (Copy)", createdAt: now, updatedAt: now };
    state = { ...state, projects: [copy, ...state.projects] };
    persist(); emit();
  },
  seedDemoIfEmpty() {
    if (state.projects.length > 0) return;
    const demo: DroneProject[] = [
      { id: crypto.randomUUID(), projectName: "AgriSky 10L Spraying Drone", vertical: "AgriSky", purpose: "Agriculture spraying", userType: "Farmer", status: "Designed", riskLevel: "Safe", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: crypto.randomUUID(), projectName: "GuardSky Thermal Surveillance Drone", vertical: "GuardSky", purpose: "Surveillance", userType: "Enterprise client", status: "Simulated", riskLevel: "Warning", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: crypto.randomUUID(), projectName: "Fire Response Drone", vertical: "GuardSky", purpose: "Fire extinguisher ball dropping", userType: "Internal R&D", status: "Reviewed", riskLevel: "Safe", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: crypto.randomUUID(), projectName: "Training Quadcopter", vertical: "TrainSky", purpose: "Training drone", userType: "Trainer", status: "Draft", riskLevel: "Safe", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: crypto.randomUUID(), projectName: "Delivery Payload Drone", vertical: "DeliverySky", purpose: "Payload delivery", userType: "Enterprise client", status: "Designed", riskLevel: "Warning", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];
    state = { ...state, projects: demo };
    persist(); emit();
  },
};

export function useSeedDemo() {
  const [done, setDone] = useState(false);
  useEffect(() => { if (!done) { studioActions.seedDemoIfEmpty(); setDone(true); } }, [done]);
}
