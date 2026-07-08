import { useState } from "react";
import { VERTICALS, PURPOSE_OPTIONS, USER_TYPES } from "@/lib/design-studio/constants";
import type { Vertical } from "@/lib/design-studio/constants";
import { WIZARD_VERTICAL_TO_TAG } from "@/lib/design-studio/suggested-defaults";
import { getVehicleType } from "@/constants/vehicleTypes.constants";
import { WizardInput, WizardSelect } from "./WizardField";
import type { WizardFormState } from "@/lib/design-studio/wizard-types";

// Step 0's "Mission type" select shows each vertical's `tag` (e.g. "Mapping").
// Mirror that same label here instead of the brand name (e.g. "GeoSky"), so
// the same underlying vertical reads identically across both steps — the
// stored form.vertical value stays the brand name for compatibility with
// the rest of the app (PURPOSE_OPTIONS, the intelligence engine, etc).
const VERTICAL_SELECT_OPTIONS = VERTICALS.map((v) => ({
  value: v,
  label: WIZARD_VERTICAL_TO_TAG[v],
}));

interface Props {
  form:     WizardFormState;
  onChange: (patch: Partial<WizardFormState>) => void;
  onNext:   () => void;
  onBack:   () => void;
}

export function StepScope({ form, onChange, onNext, onBack }: Props) {
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
  const verticalTag = form.vertical ? WIZARD_VERTICAL_TO_TAG[form.vertical as Vertical] : null;

  const projectNamePlaceholder = vehicleTypeLabel
    ? verticalTag
      ? `e.g. ${vehicleTypeLabel} ${verticalTag} Platform`
      : `e.g. ${vehicleTypeLabel} Platform Project`
    : "e.g. Autonomous Aerial Platform Project";

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
            placeholder={projectNamePlaceholder}
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
          options={VERTICAL_SELECT_OPTIONS}
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

        <div className="flex justify-between pt-2">
          <button
            onClick={onBack}
            className="px-5 h-11 rounded-[10px] text-sm text-white/70
              border border-white/20 bg-transparent hover:bg-white/5 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            className="px-5 h-11 rounded-[10px] text-sm font-medium text-white
              hover:opacity-90 transition-opacity"
            style={{ background: "#378ADD" }}
          >
            Continue to Requirements
          </button>
        </div>
      </div>
    </div>
  );
}
