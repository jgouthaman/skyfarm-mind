// Bay 04 (CAD Agent) STEP output viewer -- the two files the viewer reads
// for one design, typed from their fixtures in public/hangar-fixtures/bay04/.
// Later a Cloud Run STEP converter writes the same two files to Supabase
// Storage; keep these types the contract between it and the viewer.
//
//   <design>_cad_summary.json  parsed metadata, properties and checks
//   <design>_mesh.json         display tessellation, one mesh per part

export type Vec3 = [number, number, number];
// [xmin, ymin, zmin, xmax, ymax, zmax]
export type BBox = [number, number, number, number, number, number];

export type CheckSeverity = "critical" | "warning" | "info" | "pass";

export const CAD_GROUPS = [
  "Outer mould line",
  "Propulsion",
  "Internal envelopes",
  "Wing structure",
  "Fuselage structure",
  "Tail structure",
] as const;

export type CadGroup = (typeof CAD_GROUPS)[number];

export interface CadPart {
  name: string;
  group: CadGroup;
  faces: number;
  volume_mm3: number;
  area_mm2: number;
  centroid_mm: Vec3;
  bbox_mm: BBox;
}

export interface CadInterference {
  part_a: string;
  part_b: string;
  common_mm3: number;
  pct_of_a: number;
}

export interface CadCheck {
  severity: CheckSeverity;
  title: string;
  detail: string;
  parts: string[];
  // "Bay 03 · Aircraft Design"; null for passes nothing needs to act on.
  route: string | null;
}

export interface CadSummary {
  design: { id: string; name: string; title: string; subtitle: string };
  source: {
    file: string;
    size_bytes: number;
    schema: string;
    generator: string;
    created: string;
    entities: number;
    line_count: number;
  };
  units: { length: string; angle: string; tolerance_mm: number };
  envelope_mm: { length: number; span: number; height: number };
  wing_derived: {
    root_chord_mm: number;
    tip_chord_mm: number;
    taper_ratio: number;
    ref_area_m2: number;
    aspect_ratio: number;
    le_sweep_deg: number;
    note: string;
  };
  assembly: {
    root: string;
    parts: number;
    brep_solids: number;
    faces: number;
    groups: Record<CadGroup, string[]>;
  };
  parts: CadPart[];
  interference: CadInterference[];
  checks: CadCheck[];
  status: Record<CheckSeverity, number>;
  step_header: { lines: string[] };
  entity_counts: { type: string; count: number }[];
}

export interface CadMeshPart {
  name: string;
  group: CadGroup;
  // Flat xyz triples in mm, Z up.
  positions: number[];
  indices: number[];
}

export interface CadMesh {
  units: "mm";
  up: "Z";
  parts: CadMeshPart[];
}

export interface CadViewerData {
  summary: CadSummary;
  mesh: CadMesh;
}
