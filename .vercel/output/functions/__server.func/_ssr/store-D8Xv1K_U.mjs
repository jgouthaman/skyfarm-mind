import { r as reactExports } from "../_libs/react.mjs";
import { s as supabase } from "./client-DYtC4Igq.mjs";
let state = { projects: [], selectedId: null, loaded: false };
const listeners = /* @__PURE__ */ new Set();
const emit = () => listeners.forEach((l) => l());
const setState = (patch) => {
  state = { ...state, ...patch };
  emit();
};
let loadPromise = null;
async function hydrate() {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const [{ data: projects }, { data: reqs }, { data: designs }, { data: comps }, { data: sims }] = await Promise.all([
      supabase.from("studio_projects").select("*").order("created_at", { ascending: false }),
      supabase.from("studio_requirements").select("*"),
      supabase.from("studio_designs").select("*"),
      supabase.from("studio_components").select("*"),
      supabase.from("studio_simulations").select("*").order("created_at", { ascending: false })
    ]);
    const reqMap = new Map((reqs ?? []).map((r) => [r.project_id, r.payload]));
    const designMap = new Map((designs ?? []).map((r) => [r.project_id, r.payload]));
    const compMap = new Map((comps ?? []).map((r) => [r.project_id, r.payload]));
    const simByProject = /* @__PURE__ */ new Map();
    for (const s of sims ?? []) {
      const arr = simByProject.get(s.project_id) ?? [];
      arr.push(s);
      simByProject.set(s.project_id, arr);
    }
    const built = (projects ?? []).map((p) => {
      const projSims = simByProject.get(p.id) ?? [];
      const latest = projSims.find((s) => s.finalized) ?? projSims[0];
      return {
        id: p.id,
        projectName: p.project_name,
        vertical: p.vertical,
        purpose: p.purpose,
        userType: p.user_type,
        status: p.status,
        riskLevel: p.risk_level ?? void 0,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        advisorMessages: Array.isArray(p.advisor_messages) ? p.advisor_messages : [],
        requirements: reqMap.get(p.id) ?? void 0,
        recommendedDesign: designMap.get(p.id) ?? void 0,
        componentList: compMap.get(p.id) ?? void 0,
        simulationParameters: latest?.inputs ?? void 0,
        simulationResults: latest?.outcome ?? void 0,
        design_recommendation: p.design_recommendation ?? null
      };
    });
    const selectedId = typeof window !== "undefined" ? window.sessionStorage.getItem("torqwings-studio:selected") : null;
    setState({ projects: built, selectedId, loaded: true });
  })();
  return loadPromise;
}
function subscribe(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}
const getSnap = () => state;
const empty = { projects: [], selectedId: null, loaded: false };
const getServer = () => empty;
function useStudioStore() {
  const s = reactExports.useSyncExternalStore(subscribe, getSnap, getServer);
  reactExports.useEffect(() => {
    hydrate();
  }, []);
  return s;
}
function useCurrentProject() {
  const s = useStudioStore();
  return s.projects.find((p) => p.id === s.selectedId) ?? null;
}
function persistSelected(id) {
  if (typeof window === "undefined") return;
  if (id) window.sessionStorage.setItem("torqwings-studio:selected", id);
  else window.sessionStorage.removeItem("torqwings-studio:selected");
}
async function reload() {
  loadPromise = null;
  await hydrate();
}
const studioActions = {
  async create(input) {
    const { data, error } = await supabase.from("studio_projects").insert({
      project_name: input.projectName,
      vertical: input.vertical,
      purpose: input.purpose,
      user_type: input.userType,
      status: "Draft"
    }).select().single();
    if (error || !data) {
      console.error("[studio] create failed", error);
      return null;
    }
    persistSelected(data.id);
    await reload();
    setState({ selectedId: data.id });
    return state.projects.find((p) => p.id === data.id) ?? null;
  },
  async update(id, patch) {
    const projectFields = {};
    if (patch.projectName !== void 0) projectFields.project_name = patch.projectName;
    if (patch.vertical !== void 0) projectFields.vertical = patch.vertical;
    if (patch.purpose !== void 0) projectFields.purpose = patch.purpose;
    if (patch.userType !== void 0) projectFields.user_type = patch.userType;
    if (patch.status !== void 0) projectFields.status = patch.status;
    if (patch.riskLevel !== void 0) projectFields.risk_level = patch.riskLevel;
    if (patch.advisorMessages !== void 0) projectFields.advisor_messages = patch.advisorMessages;
    projectFields.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    await supabase.from("studio_projects").update(projectFields).eq("id", id);
    if (patch.requirements !== void 0) {
      await supabase.from("studio_requirements").upsert(
        { project_id: id, payload: patch.requirements, updated_at: (/* @__PURE__ */ new Date()).toISOString() },
        { onConflict: "project_id" }
      );
    }
    if (patch.recommendedDesign !== void 0) {
      await supabase.from("studio_designs").upsert(
        { project_id: id, payload: patch.recommendedDesign },
        { onConflict: "project_id" }
      );
    }
    if (patch.componentList !== void 0) {
      await supabase.from("studio_components").upsert(
        { project_id: id, payload: patch.componentList },
        { onConflict: "project_id" }
      );
    }
    if (patch.simulationParameters !== void 0 && patch.simulationResults !== void 0) {
      await supabase.from("studio_simulations").insert({
        project_id: id,
        inputs: patch.simulationParameters,
        outcome: patch.simulationResults,
        risk_level: patch.simulationResults.riskLevel,
        finalized: false
      });
    }
    await reload();
  },
  select(id) {
    persistSelected(id);
    setState({ selectedId: id });
  },
  async remove(id) {
    await supabase.from("studio_projects").delete().eq("id", id);
    if (state.selectedId === id) persistSelected(null);
    await reload();
    if (state.selectedId === id) setState({ selectedId: null });
  },
  async duplicate(id) {
    const src = state.projects.find((p) => p.id === id);
    if (!src) return;
    const created = await this.create({
      projectName: src.projectName + " (Copy)",
      vertical: src.vertical,
      purpose: src.purpose,
      userType: src.userType
    });
    if (!created) return;
    await this.update(created.id, {
      status: src.status,
      riskLevel: src.riskLevel,
      requirements: src.requirements,
      recommendedDesign: src.recommendedDesign,
      componentList: src.componentList,
      advisorMessages: src.advisorMessages
    });
  },
  // ---------- Simulations history (multi-row per project) ----------
  async listSimulations(projectId) {
    const { data } = await supabase.from("studio_simulations").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
    return data ?? [];
  },
  async finalizeSimulation(projectId, simulationId) {
    await supabase.from("studio_simulations").update({ finalized: false }).eq("project_id", projectId);
    await supabase.from("studio_simulations").update({ finalized: true }).eq("id", simulationId);
    await reload();
  },
  async saveReport(projectId, title, snapshot) {
    await supabase.from("studio_reports").insert({ project_id: projectId, title, snapshot });
  }
};
export {
  useStudioStore as a,
  studioActions as s,
  useCurrentProject as u
};
