import { useEffect } from "react";
import { getPayloadFields } from "@/lib/design-studio/payloadFields.constants";
import { WizardInput, WizardSelect } from "./WizardField";
import type { WizardFormState } from "@/lib/design-studio/wizard-types";

interface Props {
  form:     WizardFormState;
  onChange: (patch: Partial<WizardFormState>) => void;
  onNext:   () => void;
  onBack:   () => void;
}

export function StepPayload({ form, onChange, onNext, onBack }: Props) {
  const fields = getPayloadFields(form.vertical);

  // Seed select-type fields with their first option (matching the original
  // per-vertical defaults, e.g. AgriSky's "liquidDensity: Normal") — without
  // this, an untouched select would visually show its first option while
  // form.payloadDetails silently kept no value for that key.
  useEffect(() => {
    const patch: Record<string, string> = {};
    for (const f of fields) {
      if (f.type === "select" && form.payloadDetails[f.key] === undefined && f.options?.length) {
        patch[f.key] = f.options[0];
      }
    }
    if (Object.keys(patch).length > 0) {
      onChange({ payloadDetails: { ...form.payloadDetails, ...patch } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.vertical]);

  function setField(key: string, value: string) {
    onChange({ payloadDetails: { ...form.payloadDetails, [key]: value } });
  }

  return (
    <div
      className="rounded-2xl border p-8 space-y-6 backdrop-blur-sm"
      style={{ background: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.15)" }}
    >
      <h3 className="text-base font-semibold text-white mb-5">Payload Details</h3>

      <div className="grid md:grid-cols-2 gap-4">
        {fields.map((field) => {
          const value = form.payloadDetails[field.key] ?? "";
          const label = field.unit ? `${field.label} (${field.unit})` : field.label;

          if (field.type === "select") {
            return (
              <WizardSelect
                key={field.key}
                label={label}
                options={field.options ?? []}
                value={String(value)}
                onChange={(e) => setField(field.key, e.target.value)}
              />
            );
          }

          return (
            <WizardInput
              key={field.key}
              label={label}
              type={field.type === "number" ? "number" : "text"}
              min={field.type === "number" ? 0 : undefined}
              value={String(value)}
              placeholder={field.placeholder}
              onChange={(e) => setField(field.key, e.target.value)}
            />
          );
        })}
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
