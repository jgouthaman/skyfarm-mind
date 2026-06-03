export type Vertical = "AgriSky" | "GuardSky" | "DeliverySky" | "TrainSky" | "Custom Drone Lab";
export type Purpose =
  | "Agriculture spraying" | "Farm aerial survey" | "Crop monitoring"
  | "Surveillance" | "Fire detection" | "Fire extinguisher ball dropping"
  | "Payload delivery" | "Training drone" | "Custom research drone";
export type UserType = "Farmer" | "Drone engineer" | "Student" | "Trainer" | "Enterprise client" | "Investor demo" | "Internal R&D";
export type RiskLevel = "Safe" | "Warning" | "Unsafe";

export interface DroneRequirement {
  payloadWeight: number;
  requiredFlightTime: number;
  missionArea: number;
  areaUnit: "acres" | "sq km" | "route km";
  altitude: number;
  terrain: string;
  windCondition: "Low" | "Medium" | "High";
  budgetRange: "Low cost" | "Balanced" | "Premium" | "R&D prototype";
  automationLevel: "Manual" | "Semi-autonomous" | "Fully autonomous";
  payloadDetails: Record<string, string | number | boolean>;
  safetyRequirements: Record<string, boolean>;
}

export interface DroneDesign {
  droneType: "Quadcopter" | "Hexacopter" | "Octocopter";
  frameSize: string;
  motorClass: string;
  escRating: string;
  propellerSize: string;
  battery: string;
  flightController: string;
  gps: string;
  payloadSystem: string;
  estimatedFlightTime: number;
  estimatedCost: { min: number; max: number };
  riskLevel: RiskLevel;
  notes: string[];
}

export interface ComponentItem {
  category: string;
  name: string;
  specification: string;
  quantity: number;
  estimatedCost: number;
  priority: "Mandatory" | "Recommended" | "Optional" | "Advanced";
  notes?: string;
}

export interface SimulationParameters {
  payloadWeight: number;
  batteryCapacity: number;
  batteryVoltage: "4S" | "6S" | "12S" | "14S";
  numMotors: 4 | 6 | 8;
  motorThrust: number;
  propellerSize: number;
  frameWeight: number;
  windSpeed: number;
  altitude: number;
  missionDistance: number;
  tankVolume: number;
  sprayFlowRate: number;
  safetyReservePct: number;
}

export interface SimulationResult {
  totalWeight: number;
  totalThrust: number;
  thrustToWeightRatio: number;
  estimatedFlightTime: number;
  batteryConsumption: number;
  motorLoad: number;
  payloadSafetyMargin: number;
  windStabilityScore: number;
  coverageArea: number;
  sprayDuration: number;
  missionFeasibility: "Feasible" | "Marginal" | "Not feasible";
  riskLevel: RiskLevel;
  recommendation: string;
}

export interface AdvisorMessage {
  role: "user" | "assistant";
  content: string;
  at: string;
}

export interface DroneProject {
  id: string;
  projectName: string;
  vertical: Vertical;
  purpose: Purpose;
  userType: UserType;
  requirements?: DroneRequirement;
  recommendedDesign?: DroneDesign;
  componentList?: ComponentItem[];
  simulationParameters?: SimulationParameters;
  simulationResults?: SimulationResult;
  advisorMessages?: AdvisorMessage[];
  riskLevel?: RiskLevel;
  status: "Draft" | "Designed" | "Simulated" | "Reviewed";
  createdAt: string;
  updatedAt: string;
}
