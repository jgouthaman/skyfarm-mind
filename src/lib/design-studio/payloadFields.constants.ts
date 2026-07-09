import { LIQUID_DENSITY_OPTIONS, SPRAYING_MODE_OPTIONS, type Vertical } from "./constants";

export type PayloadFieldType = "number" | "text" | "select";

export interface PayloadFieldDef {
  key: string;
  label: string;
  placeholder?: string;
  type: PayloadFieldType;
  unit?: string;
  options?: string[];
}

// Fallback field set for verticals with no dedicated entry below (including
// the "Choose my vehicle type" path, where no vertical is known yet).
export const DEFAULT_PAYLOAD_FIELDS: PayloadFieldDef[] = [
  { key: "payloadType", label: "Payload type", placeholder: "e.g. Custom sensor package", type: "text" },
  { key: "payloadNotes", label: "Payload notes", placeholder: "Describe the payload requirements", type: "text" },
];

// Keyed by the same brand-name Vertical identifier StepScope uses for
// PURPOSE_OPTIONS (e.g. "AgriSky", "GeoSky") — not the verticals.constants.tsx
// `tag` — since that's what form.vertical actually stores.
export const PAYLOAD_FIELDS_BY_VERTICAL: Partial<Record<Vertical, PayloadFieldDef[]>> = {
  // Matches Step 4's original hardcoded fields exactly — same keys, same
  // option lists (LIQUID_DENSITY_OPTIONS/SPRAYING_MODE_OPTIONS) — so
  // existing AgriSky projects see no behavior change.
  AgriSky: [
    { key: "tankCapacity",  label: "Tank capacity",  placeholder: "e.g. 10", type: "number", unit: "L" },
    { key: "sprayWidth",    label: "Spray width",    placeholder: "e.g. 4",  type: "number", unit: "m" },
    { key: "cropType",      label: "Crop type",      placeholder: "e.g. Cotton", type: "text" },
    { key: "farmSize",      label: "Farm size",      placeholder: "e.g. 25", type: "number", unit: "acres" },
    { key: "liquidDensity", label: "Liquid density", type: "select", options: [...LIQUID_DENSITY_OPTIONS] },
    { key: "sprayingMode",  label: "Spraying mode",  type: "select", options: [...SPRAYING_MODE_OPTIONS] },
  ],
  GeoSky: [
    { key: "sensorType",     label: "Sensor type",           type: "select", options: ["RGB", "Multispectral", "LiDAR"] },
    { key: "gsd",             label: "Ground sample distance", placeholder: "e.g. 3",   type: "number", unit: "cm/px" },
    { key: "overlap",         label: "Overlap",                placeholder: "e.g. 75",  type: "number", unit: "%" },
    { key: "surveyArea",      label: "Survey area",            placeholder: "e.g. 100", type: "number", unit: "acres" },
    { key: "flightAltitude",  label: "Flight altitude",        placeholder: "e.g. 120", type: "number", unit: "m" },
  ],
  InfraSky: [
    { key: "sensorType",           label: "Sensor type",           type: "select", options: ["RGB", "Thermal", "LiDAR"] },
    { key: "standoffDistance",     label: "Standoff distance",     placeholder: "e.g. 5", type: "number", unit: "m" },
    { key: "zoomCapability",       label: "Zoom capability",       type: "select", options: ["yes", "no"] },
    { key: "structureType",        label: "Structure type",        type: "select", options: ["Tower", "Pipeline", "Substation", "Bridge"] },
    { key: "inspectionFrequency",  label: "Inspection frequency",  type: "select", options: ["One-time", "Monthly", "Quarterly", "Annual"] },
  ],
  GuardSky: [
    { key: "cameraType",      label: "Camera type",      type: "select", options: ["Day", "Night", "Thermal"] },
    { key: "detectionRange",  label: "Detection range",  placeholder: "e.g. 500", type: "number", unit: "m" },
    { key: "loiterTime",      label: "Loiter time",      placeholder: "e.g. 30",  type: "number", unit: "min" },
    { key: "patrolArea",      label: "Patrol area",      placeholder: "e.g. 50",  type: "number", unit: "acres" },
    { key: "nightVision",     label: "Night vision",     type: "select", options: ["yes", "no"] },
  ],
};

export function getPayloadFields(vertical: string): PayloadFieldDef[] {
  return PAYLOAD_FIELDS_BY_VERTICAL[vertical as Vertical] ?? DEFAULT_PAYLOAD_FIELDS;
}
