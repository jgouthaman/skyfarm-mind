const INDIAN_STATES = [
  { state: "Andhra Pradesh", zoneNote: "Mostly Green. Coastal stretches near naval installations are Yellow.", authority: "AP State Police + DGCA DigitalSky", permissionWindowDays: 3, knownRedZones: ["Visakhapatnam Naval Base", "Sriharikota"], recommendation: "File DigitalSky flight plan and inform local SP office for spraying ops." },
  { state: "Arunachal Pradesh", zoneNote: "Border-sensitive. Large Red/Yellow zones along LAC.", authority: "MoD clearance + Local DM", permissionWindowDays: 14, knownRedZones: ["Tawang", "Anjaw", "All LAC corridors"], recommendation: "Defence clearance is mandatory; do not fly without written MoD approval." },
  { state: "Assam", zoneNote: "Yellow around Guwahati/Tezpur airbases.", authority: "Assam Police + DGCA", permissionWindowDays: 5, knownRedZones: ["Tezpur AFS", "Jorhat AFS"], recommendation: "Avoid airbase 5 km buffers; coordinate with district administration for crop spraying." },
  { state: "Bihar", zoneNote: "Mostly Green; Patna airport ring is Red.", authority: "Bihar Police + DGCA", permissionWindowDays: 3, knownRedZones: ["Patna Airport (8 km)", "Bodh Gaya temple"], recommendation: "Permitted for AgriSky spraying outside airport buffers with DigitalSky NOC." },
  { state: "Chhattisgarh", zoneNote: "Red around Maoist-affected districts (Bastar, Sukma).", authority: "Home Dept + DGCA", permissionWindowDays: 10, knownRedZones: ["Bastar", "Sukma", "Dantewada"], recommendation: "Strict ground clearance from district SP for any flight in southern districts." },
  { state: "Delhi NCR", zoneNote: "Almost entirely Red — no-fly without specific UAS Cell approval.", authority: "MHA + DGCA + Delhi Police", permissionWindowDays: 21, knownRedZones: ["Entire NCT of Delhi", "Vijay Chowk", "Rashtrapati Bhavan"], recommendation: "Avoid. Only enterprise/VIP-grade flights with prior MHA + DGCA + Delhi Police clearance." },
  { state: "Goa", zoneNote: "Yellow around Dabolim/Mopa airports.", authority: "Goa Police + DGCA", permissionWindowDays: 3, knownRedZones: ["Dabolim Naval Air Station"], recommendation: "Tourism/aerial photography needs district NOC; AgriSky usable inland." },
  { state: "Gujarat", zoneNote: "Mostly Green. Coastal Kutch is Yellow (border).", authority: "Gujarat Police + DGCA", permissionWindowDays: 3, knownRedZones: ["Kutch border belt (50 km from IB)", "Hazira/Reliance refinery"], recommendation: "Excellent for AgriSky in Saurashtra; file DigitalSky plan and intimate village panchayat." },
  { state: "Haryana", zoneNote: "Yellow due to proximity to Delhi NCR.", authority: "Haryana Police + DGCA", permissionWindowDays: 5, knownRedZones: ["Gurugram cyber city", "All NCR districts"], recommendation: "Hisar/Sirsa belt is operable; Gurugram/Faridabad need extra NCR clearance." },
  { state: "Himachal Pradesh", zoneNote: "Red along China border; Yellow in tourist hill stations.", authority: "HP Police + DGCA + MoD", permissionWindowDays: 10, knownRedZones: ["Kinnaur", "Lahaul-Spiti", "Shimla VIP zone"], recommendation: "Mountain flying requires terrain & altitude declaration; use Octocopter or higher payload class." },
  { state: "Jammu & Kashmir", zoneNote: "Almost entirely Red. Civilian drone use suspended in many districts.", authority: "MHA + J&K Police + IAF", permissionWindowDays: 30, knownRedZones: ["Entire UT (special restrictions)"], recommendation: "Do not operate without explicit written permission from MHA + local DM + IAF." },
  { state: "Jharkhand", zoneNote: "Yellow around mining belts; Red around Maoist districts.", authority: "Jharkhand Police + DGCA", permissionWindowDays: 7, knownRedZones: ["West Singhbhum", "Latehar"], recommendation: "Mining-area surveys permitted with mine operator + DGCA approval." },
  { state: "Karnataka", zoneNote: "Mostly Green; Bengaluru ring is Red.", authority: "Karnataka Police + DGCA", permissionWindowDays: 3, knownRedZones: ["HAL Airport", "Yelahanka AFS", "Kempegowda Airport (8 km)"], recommendation: "Excellent for AgriSky in North Karnataka. Bengaluru urban use needs DigitalSky + ATC NOC." },
  { state: "Kerala", zoneNote: "Yellow near Trivandrum/Kochi airports & naval bases.", authority: "Kerala Police + DGCA", permissionWindowDays: 5, knownRedZones: ["Trivandrum AFS", "INS Garuda Kochi"], recommendation: "Plantation/agri spraying permitted with district collector NOC outside airport buffers." },
  { state: "Madhya Pradesh", zoneNote: "Mostly Green; central tribal belts are Yellow.", authority: "MP Police + DGCA", permissionWindowDays: 5, knownRedZones: ["Bhopal VIP zone", "Indore airport"], recommendation: "Wide-open agri terrain — ideal for AgriSky deployments." },
  { state: "Maharashtra", zoneNote: "Mixed. Mumbai/Pune are Red/Yellow; rural districts Green.", authority: "Maharashtra Police + DGCA", permissionWindowDays: 5, knownRedZones: ["Mumbai (entire MCGM)", "Pune cantonment", "BARC Trombay"], recommendation: "Vidarbha/Marathwada are open for AgriSky; Mumbai/Pune need special UAS Cell NOC." },
  { state: "Manipur", zoneNote: "Border-sensitive. Mostly Red/Yellow.", authority: "MHA + Manipur Police + MoD", permissionWindowDays: 14, knownRedZones: ["Imphal valley airbase", "Myanmar border belt"], recommendation: "Avoid civilian drone ops without state Home Dept clearance." },
  { state: "Meghalaya", zoneNote: "Mostly Green; border belts are Yellow.", authority: "Meghalaya Police + DGCA", permissionWindowDays: 7, knownRedZones: ["Bangladesh border 30 km buffer"], recommendation: "Agri/forestry surveys feasible with district NOC." },
  { state: "Mizoram", zoneNote: "Border-sensitive (Myanmar/Bangladesh). Mostly Yellow.", authority: "Mizoram Police + MoD", permissionWindowDays: 10, knownRedZones: ["All international border belts"], recommendation: "Defence clearance recommended for any beyond-village flight." },
  { state: "Nagaland", zoneNote: "Yellow with Red along Myanmar border.", authority: "Nagaland Police + MoD", permissionWindowDays: 10, knownRedZones: ["Mon district", "Myanmar border"], recommendation: "Special permission required; AFSPA areas have additional restrictions." },
  { state: "Odisha", zoneNote: "Mostly Green; coastal/missile-test belts are Red.", authority: "Odisha Police + DGCA + DRDO", permissionWindowDays: 5, knownRedZones: ["Chandipur ITR", "Wheeler Island"], recommendation: "Inland districts open; avoid coastal Bhadrak/Balasore." },
  { state: "Punjab", zoneNote: "Yellow/Red near Pakistan border (within 50 km).", authority: "Punjab Police + BSF + DGCA", permissionWindowDays: 7, knownRedZones: ["Amritsar IB belt", "Pathankot AFS", "Ferozepur belt"], recommendation: "Highly suitable for AgriSky in central Punjab; do not fly within 50 km of IB without BSF NOC." },
  { state: "Rajasthan", zoneNote: "Western Rajasthan is Red (Pakistan border, military test ranges).", authority: "Rajasthan Police + IAF + DGCA", permissionWindowDays: 7, knownRedZones: ["Jaisalmer", "Pokhran range", "Barmer IB belt"], recommendation: "Eastern Rajasthan (Jaipur–Kota) is operable; never fly west of Jodhpur without MoD clearance." },
  { state: "Sikkim", zoneNote: "Border-sensitive. Mostly Yellow/Red.", authority: "Sikkim Police + MoD", permissionWindowDays: 14, knownRedZones: ["Nathu La", "Dzuluk", "All LAC corridors"], recommendation: "Avoid drone ops without Home Dept + MoD clearance." },
  { state: "Tamil Nadu", zoneNote: "Yellow around Chennai/Coimbatore airports; Red near nuclear/space facilities.", authority: "TN Police + DGCA", permissionWindowDays: 5, knownRedZones: ["Kalpakkam", "ISRO Mahendragiri", "Chennai Port"], recommendation: "Delta region (Thanjavur, Tiruvarur) is excellent for AgriSky paddy spraying with district NOC." },
  { state: "Telangana", zoneNote: "Green/Yellow. Telangana has an active state drone policy — most progressive in India.", authority: "Telangana Emerging Tech Wing + DGCA", permissionWindowDays: 2, knownRedZones: ["Hyderabad RGIA buffer", "Secunderabad cantonment"], recommendation: "Best-in-class regulatory support. Use the T-Drone platform for AgriSky/surveillance permissions; sandbox approvals available." },
  { state: "Tripura", zoneNote: "Yellow due to Bangladesh border proximity.", authority: "Tripura Police + BSF", permissionWindowDays: 7, knownRedZones: ["All IB belts"], recommendation: "Central Tripura operable with district NOC." },
  { state: "Uttar Pradesh", zoneNote: "Mixed. Lucknow/Noida are Red; Western UP agri belts are Green.", authority: "UP Police + DGCA", permissionWindowDays: 5, knownRedZones: ["Noida (NCR)", "Ayodhya VIP zone", "Lucknow cantonment"], recommendation: "Hapur–Meerut–Bulandshahr corridor is excellent for AgriSky sugarcane spraying." },
  { state: "Uttarakhand", zoneNote: "Yellow around hill towns; Red along China border.", authority: "UK Police + MoD", permissionWindowDays: 10, knownRedZones: ["Chamoli IB", "Pithoragarh IB", "Char Dham VIP windows"], recommendation: "Plains (Haridwar/Udham Singh Nagar) operable; hill flights need terrain declaration." },
  { state: "West Bengal", zoneNote: "Yellow near Kolkata/Bagdogra; Red near Bangladesh border.", authority: "WB Police + BSF + DGCA", permissionWindowDays: 7, knownRedZones: ["Kolkata Maidan/VIP zone", "Siliguri corridor", "All Bangladesh IB belts"], recommendation: "Operable in Bardhaman/Hooghly agri belt; avoid Siliguri corridor without special clearance." }
];
function classifyDrone(allUpWeightKg) {
  if (allUpWeightKg <= 0.25) return { category: "Nano", band: "≤ 250 g" };
  if (allUpWeightKg <= 2) return { category: "Micro", band: "250 g – 2 kg" };
  if (allUpWeightKg <= 25) return { category: "Small", band: "2 – 25 kg" };
  if (allUpWeightKg <= 150) return { category: "Medium", band: "25 – 150 kg" };
  return { category: "Large", band: "> 150 kg" };
}
function buildComplianceReport(project, auwOverride) {
  const sim = project.simulationResults;
  const params = project.simulationParameters;
  const payload = project.requirements?.payloadWeight ?? 0;
  const allUp = auwOverride ?? (sim?.totalWeight ?? (params ? params.frameWeight + payload + params.batteryCapacity / 200 : Math.max(0.5, payload + 2)));
  const { category, band } = classifyDrone(allUp);
  const npntRequired = category !== "Nano";
  const uinRequired = category !== "Nano";
  const rpcRequired = category !== "Nano" && category !== "Micro";
  const typeCertRequired = category === "Small" || category === "Medium" || category === "Large";
  const insuranceRequired = category !== "Nano";
  const thirdPartyInsurance = category !== "Nano";
  const maxAltitudeFtAgl = category === "Nano" ? 50 : category === "Micro" ? 200 : 400;
  const dsPerm = category !== "Nano";
  const policeNotice = category === "Small" || category === "Medium" || category === "Large";
  const atc = category === "Medium" || category === "Large";
  const checks = [
    { id: "uin", label: "UIN (Unique Identification Number)", ok: uinRequired, detail: uinRequired ? "Required — register on DigitalSky." : "Not required for Nano category." },
    { id: "npnt", label: "NPNT compliance (No Permission, No Take-off)", ok: npntRequired, detail: npntRequired ? "Flight controller must be NPNT-certified and fetch a valid Permission Artefact before each flight." : "Exempt for Nano below 50 ft AGL." },
    { id: "rpc", label: "Remote Pilot Certificate", ok: rpcRequired, detail: rpcRequired ? "PIC must hold a valid DGCA-approved RPC." : "Not mandatory; basic training still recommended." },
    { id: "type", label: "Type Certificate (TC)", ok: typeCertRequired, detail: typeCertRequired ? "Drone model must hold a DGCA Type Certificate or operate under an exemption." : "Not required for Nano/Micro." },
    { id: "ins", label: "Third-party liability insurance", ok: thirdPartyInsurance, detail: thirdPartyInsurance ? "Compulsory under Drone Rules 2021 §41." : "Strongly recommended." },
    { id: "ds", label: "DigitalSky flight permission", ok: dsPerm, detail: dsPerm ? "File flight plan via DigitalSky before each mission." : "Self-declared, no portal filing." },
    { id: "alt", label: `Altitude ceiling ${maxAltitudeFtAgl} ft AGL`, ok: true, detail: `${category} class is capped at ${maxAltitudeFtAgl} ft AGL in green zones.` },
    { id: "atc", label: "ATC / AAI coordination", ok: atc, detail: atc ? "Mandatory for Medium/Large class operations." : "Not required outside controlled airspace." },
    { id: "police", label: "Local police notice", ok: policeNotice, detail: policeNotice ? "Notify local SP / DM at least 24 hours before flight." : "Not statutorily required." }
  ];
  const notes = [];
  notes.push(`Estimated All-Up Weight ≈ ${allUp.toFixed(2)} kg → DGCA ${category} class (${band}).`);
  if (npntRequired) notes.push("Use an NPNT-compliant flight controller (e.g. Cube Orange + NPNT module, ideaForge, or equivalent).");
  if (typeCertRequired) notes.push("If using an in-house design, apply for DGCA Type Certificate via QCI before commercial use.");
  notes.push("Maintain a flight log for at least 12 months including pilot, drone UIN, take-off/landing time, and GPS track.");
  notes.push("Operate only in green/yellow zones unless you hold an explicit clearance for red zones.");
  return {
    allUpWeightKg: allUp,
    category,
    weightBand: band,
    npntRequired,
    uinRequired,
    rpcRequired,
    typeCertRequired,
    insuranceRequired,
    thirdPartyInsuranceRequired: thirdPartyInsurance,
    maxAltitudeFtAgl,
    requiresDigitalSkyPermission: dsPerm,
    requiresLocalPolicePermission: policeNotice,
    requiresATCApproval: atc,
    checks,
    notes
  };
}
function getStateRule(state) {
  return INDIAN_STATES.find((s) => s.state.toLowerCase() === state.toLowerCase());
}
export {
  INDIAN_STATES as I,
  buildComplianceReport as b,
  getStateRule as g
};
