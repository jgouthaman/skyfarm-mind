// Shapes of a saved Bay 03 design (Hangar_aircraft_design_specs). Kept live
// after v1's generation logic moved to archive/vehicle-design-v1/ because
// past designs, the "Your vehicle designs" list and Bay 04 still read them.

export interface GeometryParameters {
  wingspan_m: number;
  fuselageLength_m: number;
  wingArea_m2: number;
  aspectRatio: number;
  vehicleClass: string;
}

export interface ComponentSelection {
  category: string;
  selection: string;
  rationale: string;
}
