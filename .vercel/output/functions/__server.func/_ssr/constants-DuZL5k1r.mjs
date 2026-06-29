const VERTICALS = [
  "AgriSky",
  "InfraSky",
  "GeoSky",
  "GuardSky",
  "TorqWings Labs",
  "Academy"
];
const PURPOSE_OPTIONS = {
  AgriSky: ["Agriculture spraying", "Crop monitoring", "NDVI mapping", "Irrigation planning"],
  InfraSky: ["Bridge inspection", "Solar farm inspection", "Tower inspection", "Road inspection"],
  GeoSky: ["Aerial mapping", "Land survey", "Site progress monitoring", "GIS data capture"],
  GuardSky: ["Perimeter surveillance", "Fire detection", "Asset monitoring", "Remote area patrol"],
  "TorqWings Labs": ["R&D prototype", "Payload testing", "Custom build", "Aerospace research"],
  Academy: ["Training flight", "Demo flight", "Certification prep"]
};
const USER_TYPES = ["Farmer", "Student", "Engineer", "Researcher", "Demo"];
const TERRAIN_OPTIONS = ["Flat farm", "Hilly", "Forest", "Coastal", "Urban", "Industrial"];
const WIND_OPTIONS = ["Calm", "Light", "Medium", "Strong"];
const BUDGET_OPTIONS = ["Economy", "Balanced", "Premium"];
const AUTOMATION_OPTIONS = ["Manual", "Semi-autonomous", "Fully autonomous"];
const AREA_UNIT_OPTIONS = ["acres", "hectares", "sq km"];
const LIQUID_DENSITY_OPTIONS = ["Normal", "High"];
const SPRAYING_MODE_OPTIONS = ["route-based", "manual", "waypoint"];
const RISK_TONE = {
  Safe: { text: "text-emerald-700", badge: "text-emerald-700 border-emerald-500/30 bg-emerald-500/10" },
  Warning: { text: "text-amber-700", badge: "text-amber-700 border-amber-500/30 bg-amber-500/10" },
  Unsafe: { text: "text-red-700", badge: "text-rose-400 border-rose-500/30 bg-rose-500/10" }
};
export {
  AUTOMATION_OPTIONS as A,
  BUDGET_OPTIONS as B,
  LIQUID_DENSITY_OPTIONS as L,
  PURPOSE_OPTIONS as P,
  RISK_TONE as R,
  SPRAYING_MODE_OPTIONS as S,
  TERRAIN_OPTIONS as T,
  USER_TYPES as U,
  VERTICALS as V,
  WIND_OPTIONS as W,
  AREA_UNIT_OPTIONS as a
};
