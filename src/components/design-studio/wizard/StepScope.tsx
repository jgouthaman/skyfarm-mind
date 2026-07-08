import { useState } from "react";
import { VERTICALS, PURPOSE_OPTIONS, USER_TYPES } from "@/lib/design-studio/constants";
import type { Vertical } from "@/lib/design-studio/constants";
import { getVehicleType } from "@/constants/vehicleTypes.constants";
import { WizardInput, WizardSelect } from "./WizardField";
import type { WizardFormState } from "@/lib/design-studio/wizard-types";

interface Props {
  form:     WizardFormState;
  onChange: (patch: Partial<WizardFormState>) => void;
  onNext:   () => void;
}

export function StepScope({ form, onChange, onNext }: Props) {
  const [error, setError] = useState("");
  const [selectError, setSelectError] = useState("");

  function handleNext() {
    if (!form.projectName.trim()) {
      setError("Project name is required");
      return;
    }
    setError("");

    if (!form.vertical) {
      setSelectError("Select a drone vertical to continue");
      return;
    }
    if (!form.purpose) {
      setSelectError("Select a drone purpose to continue");
      return;
    }
    if (!form.userType) {
      setSelectError("Select a user type to continue");
      return;
    }
    setSelectError("");
    onNext();
  }

  const vehicleTypeLabel = getVehicleType(form.vehicleType)?.label;

  return (
    <div>
      <h2 className="text-2xl font-semibold text-white mb-1">
        {vehicleTypeLabel ? `Create ${vehicleTypeLabel} Platform Project` : "Create Platform Project"}
      </h2>
      <p className="text-sm text-white/60 mb-6">
        Define the project scope. You'll capture mission requirements next.
      </p>

      <div
        className="rounded-2xl border p-8 space-y-5 backdrop-blur-sm"
        style={{ background: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.15)" }}
      >
        <div>
          <WizardInput
            label="Project name"
            value={form.projectName}
            placeholder="e.g. AgriSky 10L Spraying Drone"
            onChange={(e) => {
              onChange({ projectName: e.target.value });
              setError("");
            }}
          />
          {error && (
            <p className="text-red-400 text-xs mt-1.5">{error}</p>
          )}
        </div>

        <WizardSelect
          label="Drone vertical"
          placeholder="Select vertical"
          options={VERTICALS}
          value={form.vertical}
          onChange={(e) => {
            onChange({
              vertical: e.target.value,
              purpose:  PURPOSE_OPTIONS[e.target.value as Vertical][0],
            });
            setSelectError("");
          }}
        />

        <WizardSelect
          label="Drone purpose"
          placeholder="Select purpose"
          options={PURPOSE_OPTIONS[form.vertical as Vertical] ?? []}
          value={form.purpose}
          onChange={(e) => { onChange({ purpose: e.target.value }); setSelectError(""); }}
        />

        <WizardSelect
          label="User type"
          placeholder="Select user type"
          options={USER_TYPES}
          value={form.userType}
          onChange={(e) => { onChange({ userType: e.target.value }); setSelectError(""); }}
        />

        {selectError && (
          <p className="text-red-400 text-xs">{selectError}</p>
        )}

        <button
          onClick={handleNext}
          className="w-full h-11 rounded-[10px] text-sm font-medium text-white
            hover:opacity-90 transition-opacity"
          style={{ background: "#378ADD" }}
        >
          Continue to Requirements
        </button>
      </div>
    </div>
  );
}
