import { getPayloadFields } from "@/lib/design-studio/payloadFields.constants";
import type { WizardFormState } from "@/lib/design-studio/wizard-types";

interface Props {
  form:     WizardFormState;
  onBack:   () => void;
  onSubmit: () => void;
  saving:   boolean;
}

export function StepReview({ form, onBack, onSubmit, saving }: Props) {
  const payloadFields = getPayloadFields(form.vertical);
  const payloadDetailsDisplay: Record<string, string> = Object.fromEntries(
    Object.entries(form.payloadDetails).map(([key, value]) => {
      const def = payloadFields.find((f) => f.key === key);
      const label = def?.label ?? key;
      const display = def?.unit ? `${value} ${def.unit}` : String(value);
      return [label, display];
    }),
  );

  const review = {
    payloadWeight:      form.payloadWeight,
    requiredFlightTime: form.requiredFlightTime,
    missionArea:        form.missionArea,
    areaUnit:           form.areaUnit,
    altitude:           form.altitude,
    terrain:            form.terrain,
    windCondition:      form.windCondition,
    budgetRange:        form.budgetRange,
    automationLevel:    form.automationLevel,
    payloadDetails: payloadDetailsDisplay,
    safetyRequirements: {
      returnToHome:       form.returnToHome,
      gpsHold:            form.gpsHold,
      obstacleAvoidance:  form.obstacleAvoidance,
      geofencing:         form.geofencing,
      lowBatteryFailsafe: form.lowBatteryFailsafe,
      parachute:          form.parachute,
      flightLogging:      form.flightLogging,
    },
  };

  return (
    <div
      className="rounded-2xl border p-8 space-y-6 backdrop-blur-sm"
      style={{ background: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.15)" }}
    >
      <h3 className="text-base font-semibold text-white mb-5">Review Inputs</h3>

      <pre
        className="bg-black/30 rounded-xl p-5 text-[12px] font-mono
          text-green-400 overflow-auto max-h-[400px]"
      >
        {JSON.stringify(review, null, 2)}
      </pre>

      <div className="flex justify-between pt-2">
        <button
          onClick={onBack}
          disabled={saving}
          className="px-5 h-11 rounded-[10px] text-sm text-white/70
            border border-white/20 bg-transparent hover:bg-white/5
            disabled:opacity-40 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={saving}
          className="px-6 h-11 rounded-[10px] text-sm font-medium text-white
            hover:opacity-90 disabled:opacity-60 transition-opacity"
          style={{ background: "#22c55e" }}
        >
          {saving ? "Saving…" : "Generate Drone Design"}
        </button>
      </div>
    </div>
  );
}
