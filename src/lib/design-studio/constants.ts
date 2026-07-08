export const VERTICALS = [
  "AgriSky", "InfraSky", "GeoSky", "GuardSky", "TorqWings Labs", "Academy",
] as const;

export type Vertical = typeof VERTICALS[number];

export const PURPOSE_OPTIONS: Record<Vertical, string[]> = {
  AgriSky:          ["Agriculture spraying", "Crop monitoring", "NDVI mapping", "Irrigation planning"],
  InfraSky:         ["Bridge inspection", "Solar farm inspection", "Tower inspection", "Road inspection"],
  GeoSky:           ["Aerial mapping and survey", "Aerial mapping", "Land survey", "Site progress monitoring", "GIS data capture"],
  GuardSky:         ["Perimeter surveillance", "Fire detection", "Asset monitoring", "Remote area patrol"],
  "TorqWings Labs": ["R&D prototype", "Payload testing", "Custom build", "Aerospace research"],
  Academy:          ["Training flight", "Demo flight", "Certification prep"],
};

export const USER_TYPES         = ["Farmer", "Student", "Engineer", "Researcher", "Surveyor", "Demo"] as const;
export const TERRAIN_OPTIONS    = ["Flat farm", "Hilly", "Forest", "Coastal", "Urban", "Industrial"] as const;
export const WIND_OPTIONS       = ["Calm", "Light", "Medium", "Strong"] as const;
export const BUDGET_OPTIONS     = ["Economy", "Balanced", "Premium"] as const;
export const AUTOMATION_OPTIONS = ["Manual", "Semi-autonomous", "Fully autonomous"] as const;
export const AREA_UNIT_OPTIONS  = ["acres", "hectares", "sq km"] as const;
export const LIQUID_DENSITY_OPTIONS = ["Normal", "High"] as const;
export const SPRAYING_MODE_OPTIONS  = ["route-based", "manual", "waypoint"] as const;

export const RISK_TONE: Record<string, { text: string; badge: string }> = {
  Safe:    { text: "text-emerald-700", badge: "text-emerald-700 border-emerald-500/30 bg-emerald-500/10" },
  Warning: { text: "text-amber-700",   badge: "text-amber-700 border-amber-500/30 bg-amber-500/10" },
  Unsafe:  { text: "text-red-700",     badge: "text-rose-400 border-rose-500/30 bg-rose-500/10" },
};

export const PROJECT_STATUS = ["Draft", "Designed", "Simulated", "Reviewed"] as const;
export type ProjectStatus = typeof PROJECT_STATUS[number];
