import type { VehicleTypeSlug } from "@/constants/vehicleTypes.constants";

export interface VehicleTypeRecommenderInput {
  payloadKg: number;
  rangeKm: number;
  vtolRequired: "yes" | "no" | "unsure";
}

export interface VehicleTypeRecommendation {
  type: VehicleTypeSlug;
  reasoning: string;
}

export function recommendVehicleType(
  input: VehicleTypeRecommenderInput,
): VehicleTypeRecommendation {
  const { payloadKg, rangeKm, vtolRequired } = input;

  if (payloadKg > 25) {
    return {
      type: "cargo-heavy-lift",
      reasoning: `A payload of ${payloadKg} kg exceeds what standard multirotor or fixed-wing airframes carry — a cargo/heavy-lift platform is built for this thrust-to-weight range.`,
    };
  }

  if (vtolRequired === "no" && rangeKm > 30) {
    return {
      type: "fixed-wing",
      reasoning: `No hover requirement and a range of ${rangeKm} km call for wing-generated lift — fixed-wing platforms cover long distances far more efficiently than rotorcraft.`,
    };
  }

  if (vtolRequired === "yes" && rangeKm > 15) {
    return {
      type: "vtol-hybrid",
      reasoning: `You need vertical takeoff and landing but also ${rangeKm} km of range — a VTOL/hybrid airframe combines hover capability with fixed-wing cruise efficiency.`,
    };
  }

  return {
    type: "multirotor",
    reasoning: `A payload of ${payloadKg} kg over ${rangeKm} km fits comfortably within a multirotor's hover and short-range envelope — the simplest and most common platform for this mission.`,
  };
}
