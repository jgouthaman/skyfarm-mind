import type { VehicleTypeSlug } from "@/constants/vehicleTypes.constants";

export interface WizardFormState {
  projectName:        string;
  vehicleType:        VehicleTypeSlug | "";
  vertical:           string;
  purpose:            string;
  userType:           string;
  payloadWeight:      string;
  requiredFlightTime: string;
  missionArea:        string;
  areaUnit:           string;
  altitude:           string;
  terrain:            string;
  windCondition:      string;
  budgetRange:        string;
  automationLevel:    string;
  tankCapacity:       string;
  sprayWidth:         string;
  cropType:           string;
  farmSize:           string;
  liquidDensity:      string;
  sprayingMode:       string;
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
  vertical:           "AgriSky",
  purpose:            "Agriculture spraying",
  userType:           "Farmer",
  payloadWeight:      "",
  requiredFlightTime: "",
  missionArea:        "",
  areaUnit:           "acres",
  altitude:           "",
  terrain:            "Flat farm",
  windCondition:      "Medium",
  budgetRange:        "Balanced",
  automationLevel:    "Semi-autonomous",
  tankCapacity:       "",
  sprayWidth:         "",
  cropType:           "",
  farmSize:           "",
  liquidDensity:      "Normal",
  sprayingMode:       "route-based",
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
