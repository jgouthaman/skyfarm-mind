import type {
  CadCheck,
  CadGroup,
  CadSummary,
  CadViewerData,
  CheckSeverity,
} from "./cadViewerTypes";

// Bay 04 STEP output viewer data. Phase 1 reads static fixtures from
// public/hangar-fixtures/bay04/. When the Cloud Run STEP converter lands it
// writes the same two files to Supabase Storage -- only fixtureUrl() and the
// fetch below change; callers and types stay as they are.

function fixtureUrl(designId: string, file: "cad_summary" | "mesh"): string {
  return `/hangar-fixtures/bay04/${encodeURIComponent(designId)}_${file}.json`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn't load ${url.split("/").pop()} (HTTP ${res.status}).`);
  return (await res.json()) as T;
}

export async function loadCadViewerData(designId: string): Promise<CadViewerData> {
  const [summary, mesh] = await Promise.all([
    fetchJson<CadSummary>(fixtureUrl(designId, "cad_summary")),
    fetchJson<CadViewerData["mesh"]>(fixtureUrl(designId, "mesh")),
  ]);
  return { summary, mesh };
}

// ── Derived values the tabs share ─────────────────────────────────────────

export const SEVERITY_RANK: Record<CheckSeverity, number> = {
  critical: 3,
  warning: 2,
  info: 1,
  pass: 0,
};

// The worst severity any check gives each part it lists.
export function partFlags(checks: CadCheck[]): Map<string, CheckSeverity> {
  const flags = new Map<string, CheckSeverity>();
  for (const c of checks) {
    for (const p of c.parts) {
      const prev = flags.get(p);
      if (!prev || SEVERITY_RANK[c.severity] > SEVERITY_RANK[prev]) flags.set(p, c.severity);
    }
  }
  return flags;
}

export function isOpenFinding(c: CadCheck): boolean {
  return c.severity === "critical" || c.severity === "warning";
}

// Tree swatches and default part colours, one per assembly group.
export const GROUP_COLORS: Record<CadGroup, string> = {
  "Outer mould line": "#9fb3c8",
  Propulsion: "#5d6b7c",
  "Internal envelopes": "#3fa37a",
  "Wing structure": "#c98a3a",
  "Fuselage structure": "#4f86c6",
  "Tail structure": "#a76bb5",
};

export const SKIN_GROUP: CadGroup = "Outer mould line";

export function fmtNum(n: number, digits = 0): string {
  return Number.isFinite(n)
    ? n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })
    : "—";
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
