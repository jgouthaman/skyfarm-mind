import {
  TERRAIN_OPTIONS,
  WIND_OPTIONS,
  BUDGET_OPTIONS,
  AUTOMATION_OPTIONS,
  AREA_UNIT_OPTIONS,
} from "@/lib/design-studio/constants";
import { WizardInput, WizardSelect } from "./WizardField";
import type { WizardFormState } from "@/lib/design-studio/wizard-types";

interface Props {
  form:     WizardFormState;
  onChange: (patch: Partial<WizardFormState>) => void;
  onNext:   () => void;
  onBack:   () => void;
}

export function StepMission({ form, onChange, onNext, onBack }: Props) {
  return (
    <div
      className="rounded-2xl border p-8 space-y-6 backdrop-blur-sm"
      style={{ background: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.15)" }}
    >
      <h3 className="text-base font-semibold text-white mb-5">Mission Requirement</h3>

      <div className="grid md:grid-cols-2 gap-4">
        <WizardInput
          label="Payload weight (kg)"
          type="number"
          min={0}
          value={form.payloadWeight}
          placeholder="e.g. 10"
          onChange={(e) => onChange({ payloadWeight: e.target.value })}
        />
        <WizardInput
          label="Required flight time (min)"
          type="number"
          min={0}
          value={form.requiredFlightTime}
          placeholder="e.g. 20"
          onChange={(e) => onChange({ requiredFlightTime: e.target.value })}
        />
        <WizardInput
          label="Mission area"
          type="number"
          min={0}
          value={form.missionArea}
          placeholder="e.g. 25"
          onChange={(e) => onChange({ missionArea: e.target.value })}
        />
        <WizardSelect
          label="Area unit"
          options={AREA_UNIT_OPTIONS}
          value={form.areaUnit}
          onChange={(e) => onChange({ areaUnit: e.target.value })}
        />
        <WizardInput
          label="Altitude (m)"
          type="number"
          min={0}
          value={form.altitude}
          placeholder="e.g. 30"
          onChange={(e) => onChange({ altitude: e.target.value })}
        />
        <WizardSelect
          label="Terrain"
          options={TERRAIN_OPTIONS}
          value={form.terrain}
          onChange={(e) => onChange({ terrain: e.target.value })}
        />
        <WizardSelect
          label="Wind condition"
          options={WIND_OPTIONS}
          value={form.windCondition}
          onChange={(e) => onChange({ windCondition: e.target.value })}
        />
        <WizardSelect
          label="Budget range"
          options={BUDGET_OPTIONS}
          value={form.budgetRange}
          onChange={(e) => onChange({ budgetRange: e.target.value })}
        />
      </div>

      <WizardSelect
        label="Automation level"
        options={AUTOMATION_OPTIONS}
        value={form.automationLevel}
        onChange={(e) => onChange({ automationLevel: e.target.value })}
      />

      <div className="flex justify-between pt-2">
        <button
          onClick={onBack}
          className="px-5 h-11 rounded-[10px] text-sm text-white/70
            border border-white/20 bg-transparent hover:bg-white/5 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="px-5 h-11 rounded-[10px] text-sm font-medium text-white
            hover:opacity-90 transition-opacity"
          style={{ background: "#378ADD" }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
