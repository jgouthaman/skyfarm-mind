import { WizardToggle } from "./WizardField";
import type { WizardFormState } from "@/lib/design-studio/wizard-types";

interface Props {
  form:     WizardFormState;
  onChange: (patch: Partial<WizardFormState>) => void;
  onNext:   () => void;
  onBack:   () => void;
}

export function StepSafety({ form, onChange, onNext, onBack }: Props) {
  return (
    <div
      className="rounded-2xl border p-8 space-y-6 backdrop-blur-sm"
      style={{ background: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.15)" }}
    >
      <h3 className="text-base font-semibold text-white mb-5">Safety Requirements</h3>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-3">
          <WizardToggle
            label="Return to home"
            checked={form.returnToHome}
            onChange={(v) => onChange({ returnToHome: v })}
          />
          <WizardToggle
            label="Obstacle avoidance"
            checked={form.obstacleAvoidance}
            onChange={(v) => onChange({ obstacleAvoidance: v })}
          />
          <WizardToggle
            label="Low battery failsafe"
            checked={form.lowBatteryFailsafe}
            onChange={(v) => onChange({ lowBatteryFailsafe: v })}
          />
          <WizardToggle
            label="Flight logging"
            checked={form.flightLogging}
            onChange={(v) => onChange({ flightLogging: v })}
          />
        </div>
        <div className="space-y-3">
          <WizardToggle
            label="GPS hold"
            checked={form.gpsHold}
            onChange={(v) => onChange({ gpsHold: v })}
          />
          <WizardToggle
            label="Geofencing"
            checked={form.geofencing}
            onChange={(v) => onChange({ geofencing: v })}
          />
          <WizardToggle
            label="Parachute"
            checked={form.parachute}
            onChange={(v) => onChange({ parachute: v })}
          />
        </div>
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
