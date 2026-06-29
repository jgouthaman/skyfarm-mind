function generateDroneDesign(req, purpose) {
  const p = req.payloadWeight;
  const heavyMission = /spraying|fire/i.test(purpose);
  const stabilityCritical = heavyMission || req.windCondition === "High";
  const premium = req.budgetRange === "Premium" || req.budgetRange === "R&D prototype";
  let droneType = "Quadcopter";
  if (p > 8 || heavyMission) droneType = p > 12 ? "Octocopter" : "Hexacopter";
  else if (p >= 2) droneType = "Hexacopter";
  if (stabilityCritical && droneType === "Quadcopter") droneType = "Hexacopter";
  const frameSize = droneType === "Quadcopter" ? "450 mm" : droneType === "Hexacopter" ? p > 5 ? "960 mm" : "650 mm" : p > 12 ? "1600 mm" : "1200 mm";
  const motorClass = p < 2 ? "Lightweight brushless motor" : p < 6 ? "Medium-lift motor" : heavyMission ? "Heavy-lift agricultural motor" : "Industrial-grade motor";
  const escRating = p < 2 ? "30A" : p < 4 ? "40A" : p < 8 ? "60A" : p < 12 ? "80A" : "120A";
  const propellerSize = droneType === "Quadcopter" ? "10 inch" : droneType === "Hexacopter" ? "15 inch" : "22 inch";
  const battery = p < 2 ? "4S 5000 mAh" : p < 6 ? "6S 10000 mAh" : p < 12 ? "12S 22000 mAh" : "14S 30000 mAh";
  const flightController = premium ? "Pixhawk Cube Orange+ (triple-redundant IMU)" : "Pixhawk 6C / equivalent open-source FC";
  const gps = premium || req.safetyRequirements.gpsHold ? "Dual GPS + RTK (cm-level)" : "Standard GNSS (M9N)";
  const payloadSystem = heavyMission ? "Pressurised spray tank + pump + nozzles" : /survey|monitor|surveillance|detection/i.test(purpose) ? "Gimbal-mounted imaging payload" : "Modular payload bay";
  const baseFlight = droneType === "Quadcopter" ? 28 : droneType === "Hexacopter" ? 22 : 18;
  const estimatedFlightTime = Math.max(8, Math.round(baseFlight - p * 1.3 - (req.windCondition === "High" ? 3 : 0)));
  const costBase = droneType === "Quadcopter" ? 1200 : droneType === "Hexacopter" ? 4500 : 9500;
  const mult = premium ? 1.8 : req.budgetRange === "Low cost" ? 0.85 : 1.2;
  const estimatedCost = { min: Math.round(costBase * mult), max: Math.round(costBase * mult * 1.6) };
  let riskLevel = "Safe";
  if (estimatedFlightTime < req.requiredFlightTime) riskLevel = "Warning";
  if (estimatedFlightTime + 4 < req.requiredFlightTime || p > 12 && droneType !== "Octocopter") riskLevel = "Unsafe";
  const notes = [];
  if (heavyMission) notes.push("Heavy-lift mission profile — use redundant motors and ESCs.");
  if (req.windCondition === "High") notes.push("High wind conditions — enable position-hold and reduce mission altitude.");
  if (premium) notes.push("Premium build — RTK, obstacle avoidance, telemetry redundancy included.");
  if (riskLevel !== "Safe") notes.push("Flight-time target may not be met; consider higher battery capacity or reduced payload.");
  return {
    droneType,
    frameSize,
    motorClass,
    escRating,
    propellerSize,
    battery,
    flightController,
    gps,
    payloadSystem,
    estimatedFlightTime,
    estimatedCost,
    riskLevel,
    notes
  };
}
const robu = (q) => `https://robu.in/?s=${encodeURIComponent(q)}&post_type=product`;
const SRC = "robu.in";
function generateComponentList(design, req, purpose) {
  const motorCount = design.droneType === "Quadcopter" ? 4 : design.droneType === "Hexacopter" ? 6 : 8;
  const heavyMission = /spraying|fire/i.test(purpose);
  const advanced = req.budgetRange === "Premium" || req.budgetRange === "R&D prototype";
  const list = [
    { category: "Frame", name: `${design.droneType} frame`, specification: design.frameSize, quantity: 1, estimatedCost: 9e3, priority: "Mandatory", sourceName: SRC, sourceUrl: robu(`${design.droneType} carbon fiber frame ${design.frameSize}`) },
    { category: "Motors", name: design.motorClass, specification: `${design.escRating} class brushless`, quantity: motorCount, estimatedCost: 3500, priority: "Mandatory", sourceName: SRC, sourceUrl: robu(`${design.motorClass} brushless motor`) },
    { category: "ESCs", name: "Electronic Speed Controllers", specification: design.escRating, quantity: motorCount, estimatedCost: 2200, priority: "Mandatory", sourceName: SRC, sourceUrl: robu(`${design.escRating} ESC brushless`) },
    { category: "Propellers", name: "Carbon-fibre propellers", specification: design.propellerSize, quantity: motorCount * 2, estimatedCost: 350, priority: "Mandatory", sourceName: SRC, sourceUrl: robu(`carbon fiber propeller ${design.propellerSize}`) },
    { category: "Battery", name: "LiPo battery pack", specification: design.battery, quantity: 1, estimatedCost: 18e3, priority: "Mandatory", sourceName: SRC, sourceUrl: robu(`LiPo battery ${design.battery}`) },
    { category: "Power distribution board", name: "PDB", specification: `${design.escRating} rated`, quantity: 1, estimatedCost: 1200, priority: "Mandatory", sourceName: SRC, sourceUrl: robu("power distribution board PDB drone") },
    { category: "Flight controller", name: design.flightController, specification: "ArduPilot / PX4 compatible", quantity: 1, estimatedCost: advanced ? 35e3 : 15e3, priority: "Mandatory", sourceName: SRC, sourceUrl: robu(design.flightController) },
    { category: "GPS module", name: design.gps, specification: "u-blox / RTK", quantity: design.gps.includes("Dual") ? 2 : 1, estimatedCost: design.gps.includes("RTK") ? 28e3 : 3500, priority: "Mandatory", sourceName: SRC, sourceUrl: robu(`${design.gps} GPS`) },
    { category: "Telemetry module", name: "Long-range telemetry radio", specification: "915/433 MHz, 1W", quantity: 1, estimatedCost: 6500, priority: "Recommended", sourceName: SRC, sourceUrl: robu("telemetry radio 915 MHz 1W") },
    { category: "Remote controller", name: "Hand-held RC", specification: "16-ch, 2.4 GHz", quantity: 1, estimatedCost: 16e3, priority: "Mandatory", sourceName: SRC, sourceUrl: robu("RC transmitter 16 channel 2.4GHz") },
    { category: "Landing gear", name: "Reinforced landing gear", specification: design.droneType === "Octocopter" ? "Heavy-duty" : "Standard", quantity: 1, estimatedCost: 2500, priority: "Mandatory", sourceName: SRC, sourceUrl: robu("drone landing gear carbon fiber") },
    { category: "Wiring", name: "Wiring harness", specification: "14AWG silicone", quantity: 1, estimatedCost: 800, priority: "Mandatory", sourceName: SRC, sourceUrl: robu("14 AWG silicone wire") },
    { category: "Connectors", name: "XT60 / XT90 connectors", specification: "Set", quantity: 1, estimatedCost: 500, priority: "Mandatory", sourceName: SRC, sourceUrl: robu("XT60 XT90 connector") },
    { category: "Safety buzzer", name: "Low-voltage buzzer", specification: "Audible alarm", quantity: 1, estimatedCost: 250, priority: "Mandatory", sourceName: SRC, sourceUrl: robu("low voltage buzzer lipo") },
    { category: "Voltage monitor", name: "Battery monitor", specification: "Cell-level sense", quantity: 1, estimatedCost: 600, priority: "Mandatory", sourceName: SRC, sourceUrl: robu("lipo battery cell voltage monitor") }
  ];
  if (heavyMission) {
    list.push(
      { category: "Tank", name: "Spray tank", specification: `${req.payloadDetails.tankCapacity ?? 10}L`, quantity: 1, estimatedCost: 3500, priority: "Mandatory", sourceName: SRC, sourceUrl: robu(`agriculture spray tank ${req.payloadDetails.tankCapacity ?? 10}L`) },
      { category: "Pump", name: "Diaphragm pump", specification: "12V high-pressure", quantity: 1, estimatedCost: 2200, priority: "Mandatory", sourceName: SRC, sourceUrl: robu("12V diaphragm pump high pressure") },
      { category: "Nozzles", name: "Spray nozzles", specification: "Fan-jet", quantity: motorCount, estimatedCost: 150, priority: "Mandatory", sourceName: SRC, sourceUrl: robu("agriculture drone spray nozzle") },
      { category: "Spray system", name: "Spray controller", specification: "PWM regulated", quantity: 1, estimatedCost: 2800, priority: "Recommended", sourceName: SRC, sourceUrl: robu("PWM spray controller drone") }
    );
  }
  if (/survey|monitor|surveillance|detection/i.test(purpose)) {
    list.push(
      { category: "Camera module", name: "Imaging payload", specification: String(req.payloadDetails.cameraType ?? "RGB camera"), quantity: 1, estimatedCost: 35e3, priority: "Mandatory", sourceName: SRC, sourceUrl: robu(`${req.payloadDetails.cameraType ?? "RGB"} camera drone`) },
      { category: "Payload module", name: "3-axis gimbal", specification: "Brushless gimbal", quantity: 1, estimatedCost: 18e3, priority: "Recommended", sourceName: SRC, sourceUrl: robu("3 axis brushless gimbal") }
    );
  }
  if (req.safetyRequirements.obstacleAvoidance) {
    list.push({ category: "Obstacle sensor", name: "360° LiDAR / ultrasonic array", specification: "5-15m range", quantity: 1, estimatedCost: 22e3, priority: advanced ? "Mandatory" : "Recommended", sourceName: SRC, sourceUrl: robu("LiDAR obstacle avoidance drone") });
  }
  if (req.safetyRequirements.parachute) {
    list.push({ category: "Parachute", name: "Auto-deploy parachute", specification: "Up to 25 kg", quantity: 1, estimatedCost: 28e3, priority: "Recommended", sourceName: SRC, sourceUrl: robu("drone parachute auto deploy") });
  }
  list.push({ category: "Carrying case", name: "Hard-shell case", specification: "Foam-lined", quantity: 1, estimatedCost: 6500, priority: "Optional", sourceName: SRC, sourceUrl: robu("drone hard case foam") });
  return list;
}
function runSimulation(p) {
  const batteryWeight = p.batteryCapacity / 1e3 * (p.batteryVoltage === "4S" ? 0.55 : p.batteryVoltage === "6S" ? 0.8 : p.batteryVoltage === "12S" ? 1.4 : 1.7);
  const payloadSystemWeight = p.tankVolume > 0 ? p.tankVolume * 1.05 : 0.3;
  const totalWeight = +(p.frameWeight + p.payloadWeight + batteryWeight + payloadSystemWeight).toFixed(2);
  const totalThrust = +(p.numMotors * p.motorThrust).toFixed(2);
  const thrustToWeightRatio = +(totalThrust / Math.max(totalWeight, 0.1)).toFixed(2);
  const voltage = p.batteryVoltage === "4S" ? 14.8 : p.batteryVoltage === "6S" ? 22.2 : p.batteryVoltage === "12S" ? 44.4 : 51.8;
  const wattHours = p.batteryCapacity / 1e3 * voltage;
  const powerDraw = totalWeight * 180 / Math.max(thrustToWeightRatio, 0.5);
  const usableEnergy = wattHours * (1 - p.safetyReservePct / 100);
  const estimatedFlightTime = Math.max(2, +(usableEnergy / powerDraw * 60).toFixed(1));
  const batteryConsumption = +Math.min(100, powerDraw * estimatedFlightTime / 60 / wattHours * 100).toFixed(1);
  const motorLoad = +Math.min(100, totalWeight / totalThrust * 100).toFixed(1);
  const payloadSafetyMargin = +((totalThrust - totalWeight) / Math.max(p.payloadWeight, 0.1) * 100).toFixed(1);
  const windStabilityScore = +Math.max(0, 100 - p.windSpeed * 2 - (totalWeight > totalThrust * 0.7 ? 15 : 0)).toFixed(1);
  const cruiseSpeedKmh = 25;
  const coverageArea = +(estimatedFlightTime / 60 * cruiseSpeedKmh * 0.5).toFixed(2);
  const sprayDuration = p.sprayFlowRate > 0 ? +(p.tankVolume / p.sprayFlowRate).toFixed(1) : 0;
  let riskLevel = "Safe";
  if (thrustToWeightRatio < 1.5) riskLevel = "Unsafe";
  else if (thrustToWeightRatio < 2) riskLevel = "Warning";
  const missionFeasibility = riskLevel === "Unsafe" ? "Not feasible" : riskLevel === "Warning" ? "Marginal" : "Feasible";
  const recommendation = riskLevel === "Safe" ? "Configuration is within safe operating envelope. Proceed to engineering review." : riskLevel === "Warning" ? "Reduce payload or increase motor thrust to improve safety margin." : "Configuration cannot lift safely. Increase motor thrust significantly or reduce payload.";
  return {
    totalWeight,
    totalThrust,
    thrustToWeightRatio,
    estimatedFlightTime,
    batteryConsumption,
    motorLoad,
    payloadSafetyMargin,
    windStabilityScore,
    coverageArea,
    sprayDuration,
    missionFeasibility,
    riskLevel,
    recommendation
  };
}
function riskColor(level) {
  if (level === "Safe") return "text-white bg-emerald-700 border-emerald-800 font-semibold";
  if (level === "Warning") return "text-white bg-amber-600 border-amber-700 font-semibold";
  if (level === "Unsafe") return "text-white bg-red-700 border-red-800 font-semibold";
  return "text-foreground bg-muted/60 border-border";
}
export {
  riskColor as a,
  generateComponentList as b,
  generateDroneDesign as g,
  runSimulation as r
};
