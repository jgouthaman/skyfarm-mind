import { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { INITIAL_FORM } from "@/lib/design-studio/wizard-types";
import type { WizardFormState } from "@/lib/design-studio/wizard-types";
import { buildInsertPayload, createProject } from "@/lib/design-studio/project-service";
import { WizardProgress } from "./WizardProgress";
import { StepVehicleType } from "./StepVehicleType";
import { StepScope } from "./StepScope";
import { StepMission } from "./StepMission";
import { StepPayload } from "./StepPayload";
import { StepSafety } from "./StepSafety";
import { StepReview } from "./StepReview";
import { StepRecommendation } from "./StepRecommendation";
import { runIntelligenceEngine } from "@/lib/intelligence/orchestrator";
import type { IntelligenceResult, IntelligenceInput } from "@/lib/intelligence/types";

const TOTAL = 7;

export interface MissionWizardProps {
  // Whoever owns the resulting studio_projects row — a mission_hub_users.id
  // for staff, or a destud_users.id for a DeStud customer. studio_projects.
  // user_id has no FK constraint tying it to either table specifically.
  userId: string;
  onSubmitted: (projectId: string) => void;
  // Distinct sessionStorage keys per caller so the Mission Hub wizard and the
  // DeStud wizard don't clobber each other's in-progress draft in the same
  // browser session.
  stepStorageKey?: string;
  formStorageKey?: string;
  // "Start from a proven design" (reference_designs lookup) is a Mission Hub
  // admin/staff feature — off by default so the DeStud wizard doesn't pick up
  // a stray sessionStorage key from an unrelated flow.
  allowBaseDesign?: boolean;
}

function loadInitialStep(key: string): number {
  if (typeof window === "undefined") return 1;
  const saved = Number(sessionStorage.getItem(key));
  return Number.isFinite(saved) && saved >= 1 && saved <= TOTAL ? saved : 1;
}

function loadInitialForm(key: string): WizardFormState {
  if (typeof window === "undefined") return INITIAL_FORM;
  const saved = sessionStorage.getItem(key);
  if (!saved) return INITIAL_FORM;
  try {
    return { ...INITIAL_FORM, ...JSON.parse(saved) };
  } catch {
    return INITIAL_FORM;
  }
}

export function MissionWizard({
  userId, onSubmitted,
  stepStorageKey = "torqwings-studio:wizard-step",
  formStorageKey = "torqwings-studio:wizard-form",
  allowBaseDesign = false,
}: MissionWizardProps) {
  const [step, setStep]             = useState(() => loadInitialStep(stepStorageKey));
  const [form, setForm]             = useState<WizardFormState>(() => loadInitialForm(formStorageKey));
  const [saving, setSaving]         = useState(false);
  const [baseName, setBaseName]     = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<IntelligenceResult | null>(null);
  const [engineLoading, setEngineLoading]   = useState(false);
  const [engineError, setEngineError]       = useState<string | null>(null);
  const [acceptedSource, setAcceptedSource] = useState<'rule' | 'reference'>('rule');

  const patch = (p: Partial<WizardFormState>) =>
    setForm((f) => ({ ...f, ...p }));

  useEffect(() => {
    sessionStorage.setItem(stepStorageKey, String(step));
  }, [step, stepStorageKey]);

  useEffect(() => {
    sessionStorage.setItem(formStorageKey, JSON.stringify(form));
  }, [form, formStorageKey]);

  const SLUG_TO_VERTICAL: Record<string, string> = {
    agriculture:    "AgriSky",
    infrastructure: "InfraSky",
    mapping:        "GeoSky",
    surveillance:   "GuardSky",
    industrial:     "TorqWings Labs",
    defence:        "GuardSky",
  };

  useEffect(() => {
    if (!allowBaseDesign) return;
    const baseId = sessionStorage.getItem("torqwings-studio:base-design");
    if (!baseId) return;
    sessionStorage.removeItem("torqwings-studio:base-design");

    supabase
      .from("reference_designs")
      .select("name, purpose, vertical, vehicle_type, payload_weight, estimated_flight_time")
      .eq("id", baseId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        patch({
          projectName:        data.name ?? "",
          vehicleType:        (data.vehicle_type as WizardFormState["vehicleType"]) ?? INITIAL_FORM.vehicleType,
          purpose:            data.purpose ?? INITIAL_FORM.purpose,
          vertical:           SLUG_TO_VERTICAL[data.vertical ?? ""] ?? INITIAL_FORM.vertical,
          payloadWeight:      data.payload_weight != null ? String(data.payload_weight) : "",
          requiredFlightTime: data.estimated_flight_time != null ? String(data.estimated_flight_time) : "",
        });
        setBaseName(data.name ?? null);
        // Starting from a proven design is a fresh run — don't leave the
        // wizard sitting on a step left over from a previously abandoned,
        // now-restored session.
        setStep(1);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowBaseDesign]);

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
      vehicleType:        form.vehicleType,
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
    setEngineError(null);
    try {
      const result = await runIntelligenceEngine(buildEngineInput(f));
      setRecommendation(result);
    } catch (err: any) {
      setEngineError(err?.message ?? "Something went wrong while analysing your requirements.");
    } finally {
      setEngineLoading(false);
    }
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      const payload = buildInsertPayload(form, userId, recommendation, acceptedSource);
      const result  = await createProject(payload);
      if (result?.id) {
        sessionStorage.removeItem(stepStorageKey);
        sessionStorage.removeItem(formStorageKey);
        toast.success("Project created! Generating design…");
        onSubmitted(result.id);
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
        <StepVehicleType
          form={form}
          onChange={patch}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <StepScope
          form={form}
          onChange={patch}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <StepMission
          form={form}
          onChange={patch}
          onNext={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}
      {step === 4 && (
        <StepPayload
          form={form}
          onChange={patch}
          onNext={() => setStep(5)}
          onBack={() => setStep(3)}
        />
      )}
      {step === 5 && (
        <StepSafety
          form={form}
          onChange={patch}
          onNext={() => {
            // runEngine catches its own errors and always resolves (never
            // rejects) — this .catch is just a safety net so a genuinely
            // unexpected failure never surfaces as an unhandled rejection.
            runEngine(form).catch(() => {});
            setStep(6);
          }}
          onBack={() => setStep(4)}
        />
      )}
      {step === 6 && (
        <StepRecommendation
          result={recommendation}
          input={buildEngineInput(form)}
          isLoading={engineLoading}
          error={engineError}
          onRetry={() => runEngine(form)}
          onBack={() => setStep(5)}
          onAccept={(choice) => { setAcceptedSource(choice); setStep(7); }}
        />
      )}
      {step === 7 && (
        <StepReview
          form={form}
          onBack={() => setStep(6)}
          onSubmit={handleSubmit}
          saving={saving}
        />
      )}
    </div>
  );
}
