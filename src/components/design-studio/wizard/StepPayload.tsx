import {
  LIQUID_DENSITY_OPTIONS,
  SPRAYING_MODE_OPTIONS,
} from "@/lib/design-studio/constants";
import { WizardInput, WizardSelect } from "./WizardField";
import type { WizardFormState } from "@/lib/design-studio/wizard-types";

interface Props {
  form:     WizardFormState;
  onChange: (patch: Partial<WizardFormState>) => void;
  onNext:   () => void;
  onBack:   () => void;
}

export function StepPayload({ form, onChange, onNext, onBack }: Props) {
  return (
    <div
      className="rounded-2xl border p-8 space-y-6 backdrop-blur-sm"
      style={{ background: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.15)" }}
    >
      <h3 className="text-base font-semibold text-white mb-5">Payload Details</h3>

      <div className="grid md:grid-cols-2 gap-4">
        <WizardInput
          label="Tank capacity (L)"
          type="number"
          min={0}
          value={form.tankCapacity}
          placeholder="e.g. 10"
          onChange={(e) => onChange({ tankCapacity: e.target.value })}
        />
        <WizardInput
          label="Spray width (m)"
          type="number"
          min={0}
          value={form.sprayWidth}
          placeholder="e.g. 4"
          onChange={(e) => onChange({ sprayWidth: e.target.value })}
        />
        <WizardInput
          label="Crop type"
          value={form.cropType}
          placeholder="e.g. Cotton"
          onChange={(e) => onChange({ cropType: e.target.value })}
        />
        <WizardInput
          label="Farm size (acres)"
          type="number"
          min={0}
          value={form.farmSize}
          placeholder="e.g. 25"
          onChange={(e) => onChange({ farmSize: e.target.value })}
        />
        <WizardSelect
          label="Liquid density"
          options={LIQUID_DENSITY_OPTIONS}
          value={form.liquidDensity}
          onChange={(e) => onChange({ liquidDensity: e.target.value })}
        />
        <WizardSelect
          label="Spraying mode"
          options={SPRAYING_MODE_OPTIONS}
          value={form.sprayingMode}
          onChange={(e) => onChange({ sprayingMode: e.target.value })}
        />
      </div>

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
