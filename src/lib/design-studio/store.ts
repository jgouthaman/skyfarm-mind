import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DroneProject, SimulationParameters, SimulationResult } from "./types";

type State = { projects: DroneProject[]; selectedId: string | null; loaded: boolean };

let state: State = { projects: [], selectedId: null, loaded: false };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const setState = (patch: Partial<State>) => { state = { ...state, ...patch }; emit(); };

// ---------- Hydration ----------
let loadPromise: Promise<void> | null = null;
async function hydrate() {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const [{ data: projects }, { data: reqs }, { data: designs }, { data: comps }, { data: sims }] = await Promise.all([
      supabase.from("studio_projects").select("*").order("created_at", { ascending: false }),
      supabase.from("studio_requirements").select("*"),
      supabase.from("studio_designs").select("*"),
      supabase.from("studio_components").select("*"),
      supabase.from("studio_simulations").select("*").order("created_at", { ascending: false }),
    ]);

    const reqMap = new Map((reqs ?? []).map((r: any) => [r.project_id, r.payload]));
    const designMap = new Map((designs ?? []).map((r: any) => [r.project_id, r.payload]));
    const compMap = new Map((comps ?? []).map((r: any) => [r.project_id, r.payload]));
    const simByProject = new Map<string, any[]>();
    for (const s of sims ?? []) {
      const arr = simByProject.get((s as any).project_id) ?? [];
      arr.push(s); simByProject.set((s as any).project_id, arr);
    }

    const built: DroneProject[] = (projects ?? []).map((p: any) => {
      const projSims = simByProject.get(p.id) ?? [];
      const latest = projSims.find((s) => s.finalized) ?? projSims[0];
      return {
        id: p.id,
        projectName: p.project_name,
        vertical: p.vertical,
        purpose: p.purpose,
        userType: p.user_type,
        status: p.status,
        riskLevel: p.risk_level ?? undefined,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        advisorMessages: Array.isArray(p.advisor_messages) ? p.advisor_messages : [],
        requirements: reqMap.get(p.id) ?? undefined,
        recommendedDesign: designMap.get(p.id) ?? undefined,
        componentList: compMap.get(p.id) ?? undefined,
        simulationParameters: latest?.inputs ?? undefined,
        simulationResults: latest?.outcome ?? undefined,
      };
    });

    const selectedId =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem("aerospawn-studio:selected")
        : null;
    setState({ projects: built, selectedId, loaded: true });
  })();
  return loadPromise;
}

// ---------- React hook ----------
function subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); }
const getSnap = () => state;
const empty: State = { projects: [], selectedId: null, loaded: false };
const getServer = () => empty;

export function useStudioStore() {
  const s = useSyncExternalStore(subscribe, getSnap, getServer);
  useEffect(() => { hydrate(); }, []);
  return s;
}

export function useCurrentProject(): DroneProject | null {
  const s = useStudioStore();
  return s.projects.find((p) => p.id === s.selectedId) ?? null;
}

// ---------- Actions ----------
function persistSelected(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) window.sessionStorage.setItem("aerospawn-studio:selected", id);
  else window.sessionStorage.removeItem("aerospawn-studio:selected");
}

async function reload() { loadPromise = null; await hydrate(); }

export const studioActions = {
  async create(input: Pick<DroneProject, "projectName" | "vertical" | "purpose" | "userType">): Promise<DroneProject | null> {
    const { data, error } = await supabase
      .from("studio_projects")
      .insert({
        project_name: input.projectName,
        vertical: input.vertical,
        purpose: input.purpose,
        user_type: input.userType,
        status: "Draft",
      })
      .select()
      .single();
    if (error || !data) { console.error("[studio] create failed", error); return null; }
    persistSelected((data as any).id);
    await reload();
    setState({ selectedId: (data as any).id });
    return state.projects.find((p) => p.id === (data as any).id) ?? null;
  },

  async update(id: string, patch: Partial<DroneProject>) {
    const projectFields: Record<string, any> = {};
    if (patch.projectName !== undefined) projectFields.project_name = patch.projectName;
    if (patch.vertical !== undefined) projectFields.vertical = patch.vertical;
    if (patch.purpose !== undefined) projectFields.purpose = patch.purpose;
    if (patch.userType !== undefined) projectFields.user_type = patch.userType;
    if (patch.status !== undefined) projectFields.status = patch.status;
    if (patch.riskLevel !== undefined) projectFields.risk_level = patch.riskLevel;
    if (patch.advisorMessages !== undefined) projectFields.advisor_messages = patch.advisorMessages;
    projectFields.updated_at = new Date().toISOString();
    await supabase.from("studio_projects").update(projectFields).eq("id", id);

    if (patch.requirements !== undefined) {
      await supabase.from("studio_requirements").upsert(
        { project_id: id, payload: patch.requirements as any, updated_at: new Date().toISOString() },
        { onConflict: "project_id" },
      );
    }
    if (patch.recommendedDesign !== undefined) {
      await supabase.from("studio_designs").upsert(
        { project_id: id, payload: patch.recommendedDesign as any },
        { onConflict: "project_id" },
      );
    }
    if (patch.componentList !== undefined) {
      await supabase.from("studio_components").upsert(
        { project_id: id, payload: patch.componentList as any },
        { onConflict: "project_id" },
      );
    }
    if (patch.simulationParameters !== undefined && patch.simulationResults !== undefined) {
      await supabase.from("studio_simulations").insert({
        project_id: id,
        inputs: patch.simulationParameters as any,
        outcome: patch.simulationResults as any,
        risk_level: (patch.simulationResults as SimulationResult).riskLevel,
        finalized: false,
      });
    }
    await reload();
  },

  select(id: string | null) { persistSelected(id); setState({ selectedId: id }); },

  async remove(id: string) {
    await supabase.from("studio_projects").delete().eq("id", id);
    if (state.selectedId === id) persistSelected(null);
    await reload();
    if (state.selectedId === id) setState({ selectedId: null });
  },

  async duplicate(id: string) {
    const src = state.projects.find((p) => p.id === id);
    if (!src) return;
    const created = await this.create({
      projectName: src.projectName + " (Copy)",
      vertical: src.vertical,
      purpose: src.purpose,
      userType: src.userType,
    });
    if (!created) return;
    await this.update(created.id, {
      status: src.status,
      riskLevel: src.riskLevel,
      requirements: src.requirements,
      recommendedDesign: src.recommendedDesign,
      componentList: src.componentList,
      advisorMessages: src.advisorMessages,
    });
  },

  // ---------- Simulations history (multi-row per project) ----------
  async listSimulations(projectId: string) {
    const { data } = await supabase
      .from("studio_simulations").select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    return (data ?? []) as Array<{
      id: string; project_id: string; label: string | null;
      inputs: SimulationParameters; outcome: SimulationResult;
      risk_level: string | null; finalized: boolean; created_at: string;
    }>;
  },

  async finalizeSimulation(projectId: string, simulationId: string) {
    await supabase.from("studio_simulations").update({ finalized: false }).eq("project_id", projectId);
    await supabase.from("studio_simulations").update({ finalized: true }).eq("id", simulationId);
    await reload();
  },

  async saveReport(projectId: string, title: string, snapshot: unknown) {
    await supabase.from("studio_reports").insert({ project_id: projectId, title, snapshot: snapshot as any });
  },
};

// No-op kept for backwards compatibility with existing route imports.
export function useSeedDemo() { /* DB-backed: nothing to seed */ }
