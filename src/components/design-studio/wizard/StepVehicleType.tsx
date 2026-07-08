import { useState } from "react";
import {
  VEHICLE_TYPES,
  DEFAULT_VEHICLE_TYPE,
  getVehicleType,
  type VehicleTypeSlug,
} from "@/constants/vehicleTypes.constants";
import { VERTICALS } from "@/constants/verticals.constants";
import {
  TAG_TO_WIZARD_VERTICAL,
  WIZARD_VERTICAL_TO_TAG,
  getSuggestedDefaults,
} from "@/lib/design-studio/suggested-defaults";
import type { Vertical } from "@/lib/design-studio/constants";
import {
  recommendVehicleType,
  type VehicleTypeRecommendation,
  type YesNoUnsure,
} from "@/lib/intelligence/vehicleTypeRecommender";
import { WizardInput, WizardSelect } from "./WizardField";
import type { WizardFormState } from "@/lib/design-studio/wizard-types";

interface Props {
  form:     WizardFormState;
  onChange: (patch: Partial<WizardFormState>) => void;
  onNext:   () => void;
}

type View = "choice" | "recommend-form" | "recommend-result" | "grid";

// Only the 3 currently active vehicle types are shown/recommended.
// cargo-heavy-lift stays in VEHICLE_TYPES/the DB constraint for later reuse.
const ACTIVE_VEHICLE_TYPES = VEHICLE_TYPES.filter((vt) => vt.slug !== "cargo-heavy-lift");

const YES_NO_UNSURE_OPTIONS = ["yes", "no", "unsure"] as const;
const VERTICAL_OPTIONS = VERTICALS.map((v) => v.tag);

const CARD_STYLE = {
  background: "rgba(255,255,255,0.12)",
  borderColor: "rgba(255,255,255,0.15)",
};

// Reverse of TAG_TO_WIZARD_VERTICAL — used to resume the "Mission type"
// select from form.vertical (already persisted) when this component remounts.
function deriveMissionType(vertical: string): string {
  return (vertical && WIZARD_VERTICAL_TO_TAG[vertical as Vertical]) || VERTICAL_OPTIONS[0] || "";
}

export function StepVehicleType({ form, onChange, onNext }: Props) {
  // If the user already answered the "Let us recommend" questions before
  // navigating back to this step, resume straight at the result instead of
  // making them re-answer — recommendVehicleType is a pure function, so
  // recomputing it from the persisted raw inputs is reliable and cheap.
  const [view, setView] = useState<View>(() => {
    if (form.recommendPayloadKg && form.recommendRangeKm && form.recommendEnduranceMin) {
      return "recommend-result";
    }
    if (form.vehicleType) {
      return "grid";
    }
    return "choice";
  });
  const [payloadKg, setPayloadKg] = useState(form.recommendPayloadKg ?? "");
  const [rangeKm, setRangeKm] = useState(form.recommendRangeKm ?? "");
  const [enduranceMin, setEnduranceMin] = useState(form.recommendEnduranceMin ?? "");
  const [hoverRequired, setHoverRequired] = useState<YesNoUnsure>(form.recommendHoverRequired ?? "unsure");
  const [runwayAvailable, setRunwayAvailable] = useState<YesNoUnsure>(form.recommendRunwayAvailable ?? "unsure");
  const [missionType, setMissionType] = useState(() => deriveMissionType(form.vertical));
  const [error, setError] = useState("");
  const [recommendation, setRecommendation] = useState<VehicleTypeRecommendation | null>(() => {
    if (form.recommendPayloadKg && form.recommendRangeKm && form.recommendEnduranceMin) {
      return recommendVehicleType({
        payloadKg: parseFloat(form.recommendPayloadKg),
        rangeKm: parseFloat(form.recommendRangeKm),
        enduranceMin: parseFloat(form.recommendEnduranceMin),
        hoverRequired: form.recommendHoverRequired ?? "unsure",
        runwayAvailable: form.recommendRunwayAvailable ?? "unsure",
        vertical: deriveMissionType(form.vertical),
      });
    }
    return null;
  });

  function selectVehicleType(slug: VehicleTypeSlug) {
    // Suggest (not lock) purpose/user-type once both vehicle type and
    // vertical are known. If the user came from "Choose my vehicle type",
    // form.vertical is still "" and no suggestion is made — Step 2 keeps
    // its empty placeholders in that case, as intended.
    const suggestion = getSuggestedDefaults(slug, form.vertical);
    onChange({
      vehicleType: slug,
      ...(suggestion && { purpose: suggestion.purpose, userType: suggestion.userType }),
    });
    sessionStorage.setItem("torqwings-studio:vehicle-type", slug);
    onNext();
  }

  function handleGetRecommendation() {
    const payload = parseFloat(payloadKg);
    const range = parseFloat(rangeKm);
    const endurance = parseFloat(enduranceMin);
    if (!payloadKg || Number.isNaN(payload) || payload <= 0) {
      setError("Enter a payload weight greater than 0");
      return;
    }
    if (!rangeKm || Number.isNaN(range) || range <= 0) {
      setError("Enter a mission range greater than 0");
      return;
    }
    if (!enduranceMin || Number.isNaN(endurance) || endurance <= 0) {
      setError("Enter a mission endurance greater than 0");
      return;
    }
    setError("");
    // Persist the chosen mission type into wizard state now, so it survives
    // even if the user backs out to "See all options" after this point.
    onChange({ vertical: TAG_TO_WIZARD_VERTICAL[missionType] ?? "" });
    setRecommendation(
      recommendVehicleType({
        payloadKg: payload,
        rangeKm: range,
        enduranceMin: endurance,
        hoverRequired,
        runwayAvailable,
        vertical: missionType,
      }),
    );
    setView("recommend-result");
  }

  if (view === "choice") {
    return (
      <div>
        <h2 className="text-2xl font-semibold text-white mb-1">
          Choose Your Vehicle Type
        </h2>
        <p className="text-sm text-white/60 mb-6">
          Every autonomous aerial platform starts with a frame decision. Let us recommend one, or pick your own.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          <button
            onClick={() => setView("recommend-form")}
            className="text-left rounded-2xl border p-6 space-y-2 backdrop-blur-sm hover:border-white/30 transition-colors"
            style={CARD_STYLE}
          >
            <h3 className="text-base font-semibold text-white">Let us recommend</h3>
            <p className="text-sm text-white/60">
              Answer three quick questions about payload, range, and hover needs — we'll suggest the right platform type.
            </p>
          </button>

          <button
            onClick={() => setView("grid")}
            className="text-left rounded-2xl border p-6 space-y-2 backdrop-blur-sm hover:border-white/30 transition-colors"
            style={CARD_STYLE}
          >
            <h3 className="text-base font-semibold text-white">Choose my vehicle type</h3>
            <p className="text-sm text-white/60">
              Already know what you need? Pick directly from all four platform types.
            </p>
          </button>
        </div>
      </div>
    );
  }

  if (view === "recommend-form") {
    return (
      <div>
        <h2 className="text-2xl font-semibold text-white mb-1">Let Us Recommend</h2>
        <p className="text-sm text-white/60 mb-6">
          Three quick questions about your mission.
        </p>

        <div
          className="rounded-2xl border p-8 space-y-5 backdrop-blur-sm"
          style={CARD_STYLE}
        >
          <WizardInput
            label="Payload weight (kg)"
            type="number"
            min="0"
            step="0.1"
            value={payloadKg}
            placeholder="e.g. 10"
            onChange={(e) => {
              setPayloadKg(e.target.value);
              setError("");
              onChange({ recommendPayloadKg: e.target.value });
            }}
          />

          <WizardInput
            label="Mission range (km)"
            type="number"
            min="0"
            step="1"
            value={rangeKm}
            placeholder="e.g. 20"
            onChange={(e) => {
              setRangeKm(e.target.value);
              setError("");
              onChange({ recommendRangeKm: e.target.value });
            }}
          />

          <WizardInput
            label="Mission endurance (min)"
            type="number"
            min="0"
            step="1"
            value={enduranceMin}
            placeholder="e.g. 30"
            onChange={(e) => {
              setEnduranceMin(e.target.value);
              setError("");
              onChange({ recommendEnduranceMin: e.target.value });
            }}
          />

          <WizardSelect
            label="Does the mission require hovering or precise low-altitude work (spraying, close inspection, photography)?"
            options={YES_NO_UNSURE_OPTIONS}
            value={hoverRequired}
            onChange={(e) => {
              const v = e.target.value as YesNoUnsure;
              setHoverRequired(v);
              onChange({ recommendHoverRequired: v });
            }}
          />

          <WizardSelect
            label="Do you have a runway or open launch strip available?"
            options={YES_NO_UNSURE_OPTIONS}
            value={runwayAvailable}
            onChange={(e) => {
              const v = e.target.value as YesNoUnsure;
              setRunwayAvailable(v);
              onChange({ recommendRunwayAvailable: v });
            }}
          />

          <WizardSelect
            label="Mission type"
            options={VERTICAL_OPTIONS}
            value={missionType}
            onChange={(e) => setMissionType(e.target.value)}
          />

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setView("choice")}
              className="px-5 h-11 rounded-[10px] text-sm text-white/70
                border border-white/20 bg-transparent hover:bg-white/5 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleGetRecommendation}
              className="px-5 h-11 rounded-[10px] text-sm font-medium text-white
                hover:opacity-90 transition-opacity"
              style={{ background: "#378ADD" }}
            >
              Get recommendation
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "recommend-result" && recommendation) {
    if (recommendation.overflow) {
      return (
        <div>
          <h2 className="text-2xl font-semibold text-white mb-1">
            Payload exceeds current platform support
          </h2>
          <p className="text-sm text-white/60 mb-6">Based on your mission inputs.</p>

          <div
            className="rounded-2xl border p-8 space-y-4 backdrop-blur-sm"
            style={CARD_STYLE}
          >
            <p className="text-sm text-white/70">
              Our active platform types — multirotor, fixed-wing, and VTOL/hybrid — support payloads
              up to 25 kg. Heavier payloads are on our roadmap for a dedicated cargo/heavy-lift
              platform, but aren't available for recommendation yet.
            </p>

            <div className="pt-2">
              <button
                onClick={() => setView("grid")}
                className="px-5 h-11 rounded-[10px] text-sm text-white/70
                  border border-white/20 bg-transparent hover:bg-white/5 transition-colors"
              >
                See all options
              </button>
            </div>
          </div>
        </div>
      );
    }

    const match = ACTIVE_VEHICLE_TYPES.find((v) => v.slug === recommendation.type)
      ?? ACTIVE_VEHICLE_TYPES.find((v) => v.slug === DEFAULT_VEHICLE_TYPE)!;
    const Icon = match.icon;
    const runnerUpMatch = recommendation.runnerUp
      ? getVehicleType(recommendation.runnerUp.type)
      : null;
    const confidence = recommendation.confidence;

    const confidenceNote =
      confidence === "medium" && runnerUpMatch
        ? `This fits well, though ${runnerUpMatch.label} could also work for your mission.`
        : confidence === "low" && runnerUpMatch
        ? `This was a close call between ${match.label} and ${runnerUpMatch.label} — worth comparing both before committing.`
        : null;

    const seeAllOptionsBtnClass = confidence === "low"
      ? "px-5 h-11 rounded-[10px] text-sm font-medium text-white/80 border border-white/30 bg-transparent hover:bg-white/5 transition-colors"
      : "px-5 h-11 rounded-[10px] text-sm text-white/70 border border-white/20 bg-transparent hover:bg-white/5 transition-colors";

    return (
      <div>
        <h2 className="text-2xl font-semibold text-white mb-1">Recommended Platform</h2>
        <p className="text-sm text-white/60 mb-6">Based on your mission inputs.</p>

        <div
          className="rounded-2xl border p-8 space-y-4 backdrop-blur-sm"
          style={CARD_STYLE}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <Icon className="h-6 w-6" style={{ color: "#378ADD" }} aria-hidden="true" />
            <h3 className="text-lg font-semibold text-white">{match.label}</h3>
            {confidence && (
              <span
                className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                  confidence === "high"
                    ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                    : confidence === "medium"
                    ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
                    : "text-red-400 border-red-500/30 bg-red-500/10"
                }`}
              >
                {confidence} confidence
              </span>
            )}
          </div>

          <p className="text-sm text-white/70">{recommendation.reasoning}</p>
          {confidenceNote && <p className="text-sm text-white/50">{confidenceNote}</p>}

          <div className="grid grid-cols-2 gap-4 text-[13px]">
            <div>
              <span className="text-white/35">Typical payload: </span>
              <span className="text-white/75">{match.typicalPayload}</span>
            </div>
            <div>
              <span className="text-white/35">Typical range: </span>
              <span className="text-white/75">{match.typicalRange}</span>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <div className="flex gap-3">
              <button
                onClick={() => setView("recommend-form")}
                className="px-5 h-11 rounded-[10px] text-sm text-white/70
                  border border-white/20 bg-transparent hover:bg-white/5 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setView("grid")}
                className={seeAllOptionsBtnClass}
              >
                See all options
              </button>
            </div>
            <button
              onClick={() => selectVehicleType(match.slug)}
              className="px-5 h-11 rounded-[10px] text-sm font-medium text-white
                hover:opacity-90 transition-opacity"
              style={{ background: "#378ADD" }}
            >
              Use this vehicle type
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-white mb-1">Choose Your Vehicle Type</h2>
      <p className="text-sm text-white/60 mb-6">Pick the platform type that fits your mission.</p>

      <div className="grid md:grid-cols-2 gap-4">
        {ACTIVE_VEHICLE_TYPES.map((vt) => {
          const Icon = vt.icon;
          const isSelected = form.vehicleType === vt.slug;
          return (
            <button
              key={vt.slug}
              onClick={() => selectVehicleType(vt.slug)}
              className={`text-left rounded-2xl border p-6 space-y-3 backdrop-blur-sm hover:border-white/30 transition-colors ${
                isSelected ? "ring-1 ring-[#378ADD]" : ""
              }`}
              style={isSelected ? { ...CARD_STYLE, borderColor: "#378ADD" } : CARD_STYLE}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5" style={{ color: "#378ADD" }} aria-hidden="true" />
                <h3 className="text-base font-semibold text-white">{vt.label}</h3>
              </div>
              <p className="text-sm text-white/60">{vt.shortDescription}</p>
              <div className="flex gap-4 text-[12px] pt-1">
                <span className="text-white/40">
                  Payload: <span className="text-white/70">{vt.typicalPayload}</span>
                </span>
                <span className="text-white/40">
                  Range: <span className="text-white/70">{vt.typicalRange}</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="pt-4">
        <button
          onClick={() => setView("choice")}
          className="px-5 h-11 rounded-[10px] text-sm text-white/70
            border border-white/20 bg-transparent hover:bg-white/5 transition-colors"
        >
          Back
        </button>
      </div>
    </div>
  );
}
