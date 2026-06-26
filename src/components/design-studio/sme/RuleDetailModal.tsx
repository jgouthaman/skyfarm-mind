import { useEffect, useState } from "react";
import { ArrowUpCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { DesignRule } from "@/lib/design-studio/sme-types";

interface Props {
  rule:      DesignRule | null;
  onClose:   () => void;
  onEdit:    (rule: DesignRule) => void;
  onDelete:  (id: string) => void;
  onPromote?: (rule: DesignRule) => Promise<void>;
}

function SpecCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 rounded-lg px-3 py-2">
      <div className="text-[10px] text-white/35 uppercase tracking-wide">{label}</div>
      <div className="text-sm text-white/85 mt-0.5">{value}</div>
    </div>
  );
}

export function RuleDetailModal({ rule, onClose, onEdit, onDelete, onPromote }: Props) {
  const [promoting, setPromoting] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!rule) return null;

  const handlePromote = async () => {
    if (!onPromote || promoting) return;
    setPromoting(true);
    try {
      await onPromote(rule);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Promote failed.");
    } finally {
      setPromoting(false);
    }
  };

  const confStars = () => {
    const v = rule.confidence_level ?? 0;
    const color =
      v >= 4 ? "text-emerald-400" : v >= 3 ? "text-amber-400" : "text-red-400";
    return (
      <span className={`font-mono ${color}`}>
        {"★".repeat(v)}{"☆".repeat(5 - v)}
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto py-12 px-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0d1b2e] border border-white/[0.12] rounded-2xl max-w-3xl w-full p-8 relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors text-xl leading-none"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        {/* Header */}
        <h2 className="text-xl font-semibold text-white">
          {rule.engineer_name} — {rule.purpose}
        </h2>
        <div className="flex gap-3 mt-1 flex-wrap text-[12px] text-white/50 items-center">
          <span>{rule.vertical}</span>
          <span>· {confStars()}</span>
          <span>· {new Date(rule.created_at).toLocaleDateString("en-IN")}</span>
          <span className="flex items-center gap-1">
            ·{" "}
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${rule.is_active ? "bg-emerald-400" : "bg-white/20"}`} />
            {rule.is_active ? "Active" : "Inactive"}
          </span>
        </div>

        {/* Conditions */}
        <div className="mt-6">
          <p className="text-[11px] uppercase tracking-widest text-white/30 font-medium mb-3">
            Conditions
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <SpecCard
              label="Payload range"
              value={
                rule.payload_min_kg !== null || rule.payload_max_kg !== null
                  ? `${rule.payload_min_kg ?? "?"} – ${rule.payload_max_kg ?? "?"} kg`
                  : "Any"
              }
            />
            <SpecCard
              label="Flight time"
              value={rule.flight_time_min ? `${rule.flight_time_min} min min.` : "Any"}
            />
            <SpecCard label="Terrain"    value={rule.terrain_types ?? "Any"} />
            <SpecCard label="Wind"       value={rule.wind_condition ?? "Any"} />
            <SpecCard label="Automation" value={rule.automation_level ?? "Any"} />
            <SpecCard label="Budget"     value={rule.budget_range ?? "Any"} />
          </div>
        </div>

        {/* Recommended Design */}
        <div className="mt-6">
          <p className="text-[11px] uppercase tracking-widest text-white/30 font-medium mb-3">
            Recommended Design
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <SpecCard label="Drone type"       value={rule.drone_type ?? "—"} />
            <SpecCard label="Frame size"       value={rule.frame_size ?? "—"} />
            <SpecCard label="Motor class"      value={rule.motor_class ?? "—"} />
            <SpecCard label="ESC rating"       value={rule.esc_rating ?? "—"} />
            <SpecCard label="Propeller spec"   value={rule.propeller_spec ?? "—"} />
            <SpecCard label="Battery config"   value={rule.battery_config ?? "—"} />
            <SpecCard label="Flight controller" value={rule.flight_controller ?? "—"} />
            <SpecCard label="GPS type"         value={rule.gps_type ?? "—"} />
            <SpecCard label="Payload system"   value={rule.payload_system ?? "—"} />
            <div className="bg-white/5 rounded-lg px-3 py-2">
              <div className="text-[10px] text-white/35 uppercase tracking-wide">Risk level</div>
              <div className={`text-sm mt-0.5 font-medium ${
                rule.risk_level === "Safe"
                  ? "text-emerald-400"
                  : rule.risk_level === "Warning"
                  ? "text-amber-400"
                  : "text-red-400"
              }`}>
                {rule.risk_level ?? "—"}
              </div>
            </div>
            <SpecCard
              label="Cost range"
              value={
                rule.cost_min_inr !== null || rule.cost_max_inr !== null
                  ? `₹${(rule.cost_min_inr ?? 0).toLocaleString("en-IN")} – ₹${(rule.cost_max_inr ?? 0).toLocaleString("en-IN")}`
                  : "—"
              }
            />
          </div>
        </div>

        {/* Engineering Notes */}
        {rule.engineer_notes && (
          <div className="mt-6">
            <p className="text-[11px] uppercase tracking-widest text-white/30 font-medium mb-3">
              Engineering Notes
            </p>
            <p className="text-sm text-white/60 bg-white/5 rounded-xl p-4">
              {rule.engineer_notes}
            </p>
          </div>
        )}

        {/* Risk flags */}
        {(rule.risk_flags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {rule.risk_flags!.map((f, i) => (
              <span
                key={i}
                className="bg-red-500/15 border border-red-500/30 text-red-300 text-[12px] rounded-full px-3 py-1"
              >
                {f}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-8 pt-4 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={() => {
              if (confirm("Delete this rule? This cannot be undone.")) {
                onDelete(rule.id);
              }
            }}
            className="border border-red-500/30 text-red-400 hover:bg-red-500/10 h-9 px-5 rounded-lg text-sm transition-colors"
          >
            Delete
          </button>

          <div className="flex items-center gap-2 ml-auto">
            {onPromote && (
              <button
                type="button"
                onClick={handlePromote}
                disabled={promoting}
                className="inline-flex items-center gap-2 h-9 px-5 rounded-lg text-sm transition-colors disabled:opacity-50"
                style={{
                  background: "rgba(20,184,166,0.12)",
                  color: "#2dd4bf",
                  border: "0.5px solid rgba(20,184,166,0.3)",
                }}
              >
                {promoting
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <ArrowUpCircle className="h-3.5 w-3.5" />}
                Promote to Proven Design
              </button>
            )}
            <button
              type="button"
              onClick={() => onEdit(rule)}
              className="bg-[#378ADD] text-white h-9 px-6 rounded-lg text-sm hover:opacity-90 transition-opacity"
            >
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
