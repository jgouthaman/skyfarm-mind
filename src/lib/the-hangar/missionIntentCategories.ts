// Fixed list of mission categories Stage 2.1's extraction must pick from —
// the closed-set companion to the free-text `intent`.
//
// Why both: `intent` stays free text on purpose (Stage 2.2's decomposition
// reads it, and "aerial water drop to fight a forest fire" carries detail a
// label would lose). The category is what gives every run of "the same kind
// of mission" the same value to group, filter and branch on — the model's
// free-text wording drifts between runs, this doesn't.
//
// PRODUCT DECISION, easy to change: this list is a starting set, not a
// TorqWings-approved taxonomy. Add/remove entries here and nothing else needs
// to change — the extraction prompt, validation and UI label all derive from
// this array. `vertical` maps a category to one of the four existing
// TorqWings verticals (the same ones domainRules.ts DOM-001–004 recognise);
// categories with no defined vertical stay null rather than inventing one.

export interface IntentCategory {
  id: string;
  label: string;
  /** Shown to the model so it can tell the categories apart. */
  description: string;
  /** Existing TorqWings vertical this category belongs to, if any. */
  vertical: string | null;
}

export const INTENT_CATEGORIES = [
  {
    id: "agriculture",
    label: "Agriculture",
    description: "crop monitoring, spraying, field or farm survey",
    vertical: "AgriSky",
  },
  {
    id: "security_surveillance",
    label: "Security & surveillance",
    description: "perimeter patrol, monitoring, persistent observation",
    vertical: "GuardSky",
  },
  {
    id: "infrastructure_inspection",
    label: "Infrastructure inspection",
    description: "pipelines, power lines, towers, bridges, structures",
    vertical: "InfraSky",
  },
  {
    id: "mapping_survey",
    label: "Mapping & survey",
    description: "terrain or land mapping, photogrammetry, geospatial survey",
    vertical: "GeoSky",
  },
  {
    id: "emergency_response",
    label: "Emergency response",
    description: "firefighting, water or supply drop, search and rescue, disaster relief",
    vertical: null,
  },
  {
    id: "delivery_logistics",
    label: "Delivery & logistics",
    description: "moving parcels, medical supplies or cargo between points",
    vertical: null,
  },
  {
    id: "aerial_media",
    label: "Aerial media",
    description: "photography, videography, filming",
    vertical: null,
  },
  {
    id: "environmental_monitoring",
    label: "Environmental monitoring",
    description: "wildlife, forestry, water or air quality, coastal observation",
    vertical: null,
  },
  {
    id: "other",
    label: "Other",
    description: "none of the above clearly fits",
    vertical: null,
  },
] as const satisfies readonly IntentCategory[];

export type IntentCategoryId = (typeof INTENT_CATEGORIES)[number]["id"];

export const FALLBACK_INTENT_CATEGORY: IntentCategoryId = "other";

const BY_ID = new Map<string, IntentCategory>(INTENT_CATEGORIES.map((c) => [c.id, c]));

// The model's answer, normalised and checked against the list. Anything not
// on it — a made-up category, a sentence, a missing field — becomes "other"
// rather than flowing downstream as free text, which is the whole point.
export function normalizeIntentCategory(raw: unknown): IntentCategoryId {
  if (typeof raw !== "string") return FALLBACK_INTENT_CATEGORY;
  const id = raw
    .trim()
    .toLowerCase()
    .replace(/[\s&-]+/g, "_");
  return BY_ID.has(id) ? (id as IntentCategoryId) : FALLBACK_INTENT_CATEGORY;
}

export function intentCategoryLabel(id: string): string {
  return BY_ID.get(id)?.label ?? BY_ID.get(FALLBACK_INTENT_CATEGORY)!.label;
}

export function verticalForIntentCategory(id: string | null | undefined): string | null {
  return (id && BY_ID.get(id)?.vertical) || null;
}

// The list as shown to the model in the extraction prompt.
export function intentCategoryPromptList(): string {
  return INTENT_CATEGORIES.map((c) => `- ${c.id}: ${c.description}`).join("\n");
}
