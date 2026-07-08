import type { VehicleTypeSlug } from "@/constants/vehicleTypes.constants";
import type { YesNoUnsure } from "@/lib/intelligence/vehicleTypeRecommender";

export interface WizardFormState {
  projectName:        string;
  vehicleType:        VehicleTypeSlug | "";
  vertical:           string;
  purpose:            string;
  userType:           string;
  // Step 0's raw "Let us recommend" inputs, lifted here (rather than kept
  // local to StepVehicleType) so they survive back-navigation to Step 1 and
  // can pre-fill Step 3's payload weight / flight time. Unset entirely when
  // the user took the "Choose my vehicle type" path.
  recommendPayloadKg?:      string;
  recommendRangeKm?:        string;
  recommendEnduranceMin?:   string;
  recommendHoverRequired?:  YesNoUnsure;
  recommendRunwayAvailable?: YesNoUnsure;
  payloadWeight:      string;
  requiredFlightTime: string;
  missionArea:        string;
  areaUnit:           string;
  altitude:           string;
  terrain:            string;
  windCondition:      string;
  budgetRange:        string;
  automationLevel:    string;
  payloadDetails:     Record<string, string | number>;
  returnToHome:        boolean;
  gpsHold:             boolean;
  obstacleAvoidance:   boolean;
  geofencing:          boolean;
  lowBatteryFailsafe:  boolean;
  parachute:           boolean;
  flightLogging:       boolean;
}

export const INITIAL_FORM: WizardFormState = {
  projectName:        "",
  vehicleType:        "",
  vertical:           "",
  purpose:            "",
  userType:           "",
  payloadWeight:      "",
  requiredFlightTime: "",
  missionArea:        "",
  areaUnit:           "acres",
  altitude:           "",
  terrain:            "Flat farm",
  windCondition:      "Medium",
  budgetRange:        "Balanced",
  automationLevel:    "Semi-autonomous",
  payloadDetails:     {},
  returnToHome:        true,
  gpsHold:             true,
  obstacleAvoidance:   false,
  geofencing:          true,
  lowBatteryFailsafe:  true,
  parachute:           false,
  flightLogging:       true,
};

export interface StudioProjectInsert {
  user_id:         string;
  project_name:    string;
  vehicle_type:    VehicleTypeSlug;
  vertical:        string;
  purpose:         string;
  user_type:       string;
  status:          string;
  risk_level:      null;
  requirements:    Record<string, unknown>;
  payload_details: Record<string, unknown>;
  safety:                Record<string, boolean>;
  design_recommendation: Record<string, unknown> | null;
}
