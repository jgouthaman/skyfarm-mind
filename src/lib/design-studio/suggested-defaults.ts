import { VERTICALS as MARKETING_VERTICALS } from "@/constants/verticals.constants";
import type { VehicleTypeSlug } from "@/constants/vehicleTypes.constants";
import { VERTICALS as WIZARD_VERTICALS, PURPOSE_OPTIONS, type Vertical } from "./constants";

function normalizeVerticalName(s: string): string {
  return s.replace(/^TorqWings\s+/i, "").trim().toLowerCase();
}

/** Maps a verticals.constants.tsx `tag` (shown in Step 0's "Mission type"
 * select, e.g. "Mapping") to the wizard's own brand-name vertical value
 * used internally and by Step 2 (e.g. "GeoSky") — derived by cross
 * referencing both lists' titles rather than hardcoding pairs. */
export const TAG_TO_WIZARD_VERTICAL: Record<string, string> = Object.fromEntries(
  MARKETING_VERTICALS.map((v) => {
    const target = normalizeVerticalName(v.title);
    const match = WIZARD_VERTICALS.find((wv) => normalizeVerticalName(wv) === target) ?? "";
    return [v.tag, match];
  }),
);

/** Inverse of TAG_TO_WIZARD_VERTICAL — the tag/label Step 0 showed for a
 * given wizard vertical value, so Step 2 can display that same label
 * instead of the brand name. */
export const WIZARD_VERTICAL_TO_TAG: Record<Vertical, string> = WIZARD_VERTICALS.reduce(
  (acc, wv) => {
    const target = normalizeVerticalName(wv);
    const entry = MARKETING_VERTICALS.find((v) => normalizeVerticalName(v.title) === target);
    acc[wv] = entry?.tag ?? wv;
    return acc;
  },
  {} as Record<Vertical, string>,
);

interface SuggestedDefault {
  purpose: string;
  userType: string;
}

type ComboKey = `${VehicleTypeSlug}:${Vertical}`;

const SUGGESTED_DEFAULTS: Partial<Record<ComboKey, SuggestedDefault>> = {
  "multirotor:AgriSky":   { purpose: "Agriculture spraying",      userType: "Farmer" },
  "multirotor:InfraSky":  { purpose: "Tower inspection",          userType: "Engineer" },
  "multirotor:GuardSky":  { purpose: "Perimeter surveillance",    userType: "Engineer" },
  "fixed-wing:GeoSky":    { purpose: "Aerial mapping and survey", userType: "Surveyor" },
  "fixed-wing:InfraSky":  { purpose: "Road inspection",           userType: "Engineer" },
  "vtol-hybrid:InfraSky": { purpose: "Solar farm inspection",     userType: "Engineer" },
  "vtol-hybrid:GuardSky": { purpose: "Remote area patrol",        userType: "Engineer" },
};

/**
 * Suggested (not locked) purpose/user-type default for a given vehicle
 * type + vertical combination, used to pre-fill Step 2 after "Let us
 * recommend". Returns null when either input is unknown (e.g. the user
 * came from "Choose my vehicle type", which never asks for a vertical).
 * Falls back to the vertical's first purpose option and a generic user
 * type for combinations not explicitly covered above.
 */
export function getSuggestedDefaults(
  vehicleType: VehicleTypeSlug | "",
  vertical: string,
): SuggestedDefault | null {
  if (!vehicleType || !vertical) return null;

  const exact = SUGGESTED_DEFAULTS[`${vehicleType}:${vertical}` as ComboKey];
  if (exact) return exact;

  const fallbackPurpose = PURPOSE_OPTIONS[vertical as Vertical]?.[0];
  if (!fallbackPurpose) return null;
  return { purpose: fallbackPurpose, userType: "Engineer" };
}
