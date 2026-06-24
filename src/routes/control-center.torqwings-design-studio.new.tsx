import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useMissionHubAuth } from "@/lib/mission-hub/context";
import { INITIAL_FORM } from "@/lib/design-studio/wizard-types";
import type { WizardFormState } from "@/lib/design-studio/wizard-types";
import { buildInsertPayload, createProject } from "@/lib/design-studio/project-service";
import { WizardProgress } from "@/components/design-studio/wizard/WizardProgress";
import { StepScope }   from "@/components/design-studio/wizard/StepScope";
import { StepMission } from "@/components/design-studio/wizard/StepMission";
import { StepPayload } from "@/components/design-studio/wizard/StepPayload";
import { StepSafety }  from "@/components/design-studio/wizard/StepSafety";
import { StepReview }  from "@/components/design-studio/wizard/StepReview";

export const Route = createFileRoute("/control-center/torqwings-design-studio/new")({
  component: NewProjectWizard,
  ssr: false,
});

const TOTAL = 5;

function NewProjectWizard() {
  const { profile } = useMissionHubAuth();
  const nav = useNavigate();
  const [step, setStep]     = useState(1);
  const [form, setForm]     = useState<WizardFormState>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const patch = (p: Partial<WizardFormState>) =>
    setForm((f) => ({ ...f, ...p }));

  async function handleSubmit() {
    if (!profile?.id) return;
    setSaving(true);
    try {
      const payload = buildInsertPayload(form, profile.id);
      const result  = await createProject(payload);
      if (result?.id) {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem("torqwings-studio:selected", result.id);
        }
        toast.success("Project created! Generating design…");
        nav({ to: "/control-center/torqwings-design-studio/design" });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save project.");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <WizardProgress
        step={step}
        total={TOTAL}
        projectName={form.projectName}
        vertical={form.vertical}
        purpose={form.purpose}
      />

      {step === 1 && (
        <StepScope
          form={form}
          onChange={patch}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <StepMission
          form={form}
          onChange={patch}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <StepPayload
          form={form}
          onChange={patch}
          onNext={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}
      {step === 4 && (
        <StepSafety
          form={form}
          onChange={patch}
          onNext={() => setStep(5)}
          onBack={() => setStep(3)}
        />
      )}
      {step === 5 && (
        <StepReview
          form={form}
          onBack={() => setStep(4)}
          onSubmit={handleSubmit}
          saving={saving}
        />
      )}
    </div>
  );
}
