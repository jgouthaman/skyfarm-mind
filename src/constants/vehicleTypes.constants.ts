import { Fan, Plane, PlaneTakeoff, PackagePlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type VehicleTypeSlug =
  | "multirotor"
  | "fixed-wing"
  | "vtol-hybrid"
  | "cargo-heavy-lift";

export type VehicleTypeDatum = {
  slug: VehicleTypeSlug;
  label: string;
  icon: LucideIcon;
  shortDescription: string;
  typicalPayload: string;
  typicalRange: string;
};

export const VEHICLE_TYPES: VehicleTypeDatum[] = [
  {
    slug: "multirotor",
    label: "Multirotor",
    icon: Fan,
    shortDescription: "Vertical takeoff, hover, and precise low-speed manoeuvring — the default choice for spraying, inspection, and short-range payload work on an autonomous aerial platform.",
    typicalPayload: "0.5 – 25 kg",
    typicalRange: "1 – 15 km",
  },
  {
    slug: "fixed-wing",
    label: "Fixed-wing",
    icon: Plane,
    shortDescription: "Wing-generated lift for long-endurance, long-range missions where hover isn't required — suited to large-area mapping and surveillance autonomous aerial platforms.",
    typicalPayload: "0.5 – 10 kg",
    typicalRange: "30 – 150+ km",
  },
  {
    slug: "vtol-hybrid",
    label: "VTOL/Hybrid",
    icon: PlaneTakeoff,
    shortDescription: "Combines vertical takeoff and landing with fixed-wing cruise efficiency — for autonomous aerial platforms that need both hover precision and extended range without a runway.",
    typicalPayload: "1 – 15 kg",
    typicalRange: "15 – 60 km",
  },
  {
    slug: "cargo-heavy-lift",
    label: "Cargo/Heavy-lift",
    icon: PackagePlus,
    shortDescription: "High thrust-to-weight airframes built to carry heavy or bulky payloads — for autonomous aerial platforms in logistics, agri-input transport, and industrial lift missions.",
    typicalPayload: "25 – 200+ kg",
    typicalRange: "1 – 20 km",
  },
];

export const DEFAULT_VEHICLE_TYPE: VehicleTypeSlug = "multirotor";

export function getVehicleType(slug: string): VehicleTypeDatum | undefined {
  return VEHICLE_TYPES.find((v) => v.slug === slug);
}
