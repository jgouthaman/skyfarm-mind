export type Role = "super_admin" | "admin" | "user";
export type Vertical = "agrisky" | "infrasky" | "geosky" | "guardsky" | "labs" | "academy" | "design-studio";

export const VERTICAL_LABELS: Record<Vertical, string> = {
  agrisky: "AgriSky",
  infrasky: "InfraSky",
  geosky: "GeoSky",
  guardsky: "GuardSky",
  labs: "Labs",
  academy: "Academy",
  "design-studio": "Design Studio",
};

export const VERTICAL_COLORS: Record<Vertical, string> = {
  agrisky: "#1D9E75",
  infrasky: "#378ADD",
  geosky: "#EF9F27",
  guardsky: "#E15757",
  labs: "#A574E1",
  academy: "#2BB3B0",
  "design-studio": "#EF9F27",
};

export const ALL_VERTICALS: Vertical[] = ["agrisky", "infrasky", "geosky", "guardsky", "labs", "academy", "design-studio"];

// Mission Hub users live in the `mission_hub_users` table, keyed by `id`,
// with industry mappings stored as an `industries` array of slugs. Industry
// labels/slugs come from the `industries` lookup table.
export type UserStatus = "active" | "inactive" | "pending";

export const STATUS_LABELS: Record<UserStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  pending: "Pending",
};

export type Industry = {
  id: string;
  name: string;
  slug: string;
};

export type MhUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: Role;
  status: UserStatus;
  industries: string[];
  created_at: string;
};
