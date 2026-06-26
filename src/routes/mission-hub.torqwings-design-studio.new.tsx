import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMissionHubAuth } from "@/lib/mission-hub/context";
import { INITIAL_FORM } from "@/lib/design-studio/wizard-types";
import type { WizardFormState } from "@/lib/design-studio/wizard-types";
import { buildInsertPayload, createProject } from "@/lib/design-studio/project-service";
import { WizardProgress } from "@/components/design-studio/wizard/WizardProgress";
import { StepScope }   from "@/components/design-studio/wizard/StepScope";
import { StepMission } from "@/components/design-studio/wizard/StepMission";
import { StepPayload } from "@/components/design-studio/wizard/StepPayload";
import { StepSafety }  from "@/components/design-studio/wizard/StepSafety";
import { StepReview }          from "@/components/design-studio/wizard/StepReview";
import { StepRecommendation }  from "@/components/design-studio/wizard/StepRecommendation";
import { runIntelligenceEngine } from "@/lib/intelligence/orchestrator";
import type { IntelligenceResult, IntelligenceInput } from "@/lib/intelligence/types";

export const Route = createFileRoute("/mission-hub/torqwings-design-studio/new")({
  component: NewProjectWizard,
  ssr: false,
});

const TOTAL = 6;

function NewProjectWizard() {
  const { profile } = useMissionHubAuth();
  const nav = useNavigate();
  const [step, setStep]             = useState(1);
  const [form, setForm]             = useState<WizardFormState>(INITIAL_FORM);
  const [saving, setSaving]         = useState(false);
  const [baseName, setBaseName]     = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<IntelligenceResult | null>(null);
  const [engineLoading, setEngineLoading]   = useState(false);
  const [acceptedSource, setAcceptedSource] = useState<'rule' | 'reference'>('rule');

  const patch = (p: Partial<WizardFormState>) =>
    setForm((f) => ({ ...f, ...p }));

  const SLUG_TO_VERTICAL: Record<string, string> = {
    agriculture:    "AgriSky",
    infrastructure: "InfraSky",
    mapping:        "GeoSky",
    surveillance:   "GuardSky",
    industrial:     "TorqWings Labs",
    defence:        "GuardSky",
  };

  useEffect(() => {
    const baseId = sessionStorage.getItem("torqwings-studio:base-design");
    if (!baseId) return;
    sessionStorage.removeItem("torqwings-studio:base-design");

    supabase
      .from("reference_designs")
      .select("name, purpose, vertical, payload_weight, estimated_flight_time")
      .eq("id", baseId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        patch({
          projectName:        data.name ?? "",
          purpose:            data.purpose ?? INITIAL_FORM.purpose,
          vertical:           SLUG_TO_VERTICAL[data.vertical ?? ""] ?? INITIAL_FORM.vertical,
          payloadWeight:      data.payload_weight != null ? String(data.payload_weight) : "",
          requiredFlightTime: data.estimated_flight_time != null ? String(data.estimated_flight_time) : "",
        });
        setBaseName(data.name ?? null);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function buildEngineInput(form: WizardFormState): IntelligenceInput {
    const USER_TYPE_MAP: Record<string, string> = {
      'Farmer':     'commercial',
      'Engineer':   'commercial',
      'Researcher': 'research',
      'Student':    'research',
      'Demo':       'commercial',
    };
    return {
      vertical:           form.vertical,
      purpose:            form.purpose,
      payloadWeight:      parseFloat(form.payloadWeight) || 0,
      requiredFlightTime: parseFloat(form.requiredFlightTime) || 0,
      terrain:            form.terrain || null,
      windCondition:      form.windCondition || null,
      userType:           USER_TYPE_MAP[form.userType] ?? null,
    };
  }

  async function runEngine(f: WizardFormState) {
    setEngineLoading(true);
    try {
      const result = await runIntelligenceEngine(buildEngineInput(f));
      setRecommendation(result);
    } finally {
      setEngineLoading(false);
    }
  }

  async function handleSubmit() {
    if (!profile?.id) return;
    setSaving(true);
    try {
      const payload = buildInsertPayload(form, profile.id, recommendation, acceptedSource);
      const result  = await createProject(payload);
      if (result?.id) {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem("torqwings-studio:selected", result.id);
        }
        toast.success("Project created! Generating design…");
        nav({ to: "/mission-hub/torqwings-design-studio/design" });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save project.");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      {baseName && (
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(55,138,221,0.10)", border: "0.5px solid rgba(55,138,221,0.25)" }}
        >
          <Bookmark className="h-4 w-4 shrink-0" style={{ color: "#378ADD" }} />
          <span style={{ color: "#94c7f5" }}>
            Started from proven design:{" "}
            <strong className="text-white">{baseName}</strong>
          </span>
        </div>
      )}

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
          onNext={() => { runEngine(form); setStep(5); }}
          onBack={() => setStep(3)}
        />
      )}
      {step === 5 && (
        <StepRecommendation
          result={recommendation}
          input={buildEngineInput(form)}
          isLoading={engineLoading}
          onBack={() => setStep(4)}
          onAccept={(choice) => { setAcceptedSource(choice); setStep(6); }}
        />
      )}
      {step === 6 && (
        <StepReview
          form={form}
          onBack={() => setStep(5)}
          onSubmit={handleSubmit}
          saving={saving}
        />
      )}
    </div>
  );
}
