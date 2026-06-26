import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Brain } from "lucide-react";
import { useMissionHubAuth } from "@/lib/mission-hub/context";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchDesignRules,
  insertDesignRule,
  updateDesignRule,
  deleteDesignRule,
} from "@/lib/design-studio/sme-service";
import { RuleForm } from "@/components/design-studio/sme/RuleForm";
import { RuleDetailModal } from "@/components/design-studio/sme/RuleDetailModal";
import type { DesignRule, DesignRuleInsert } from "@/lib/design-studio/sme-types";

const VERTICAL_MAP: Record<string, string | null> = {
  "AgriSky":        "agriculture",
  "InfraSky":       "infrastructure",
  "GeoSky":         "mapping",
  "GuardSky":       "surveillance",
  "TorqWings Labs": "industrial",
  "Academy":        null,
};

export const Route = createFileRoute(
  "/mission-hub/torqwings-design-studio/design-rule",
)({ component: DesignRulePage });

function DesignRulePage() {
  const { profile } = useMissionHubAuth();
  const isAdmin =
    profile?.role === "admin" || profile?.role === "super_admin";
  const engineerName = profile?.full_name ?? "Unknown Engineer";

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Brain className="h-10 w-10 text-white/20 mb-4" aria-hidden="true" />
        <p className="text-white/40 text-sm">
          Access restricted to the engineering team.
        </p>
      </div>
    );
  }

  return <DesignRuleContent engineerName={engineerName} userId={profile!.id} />;
}

function DesignRuleContent({ engineerName, userId }: { engineerName: string; userId: string }) {
  const [rules, setRules]             = useState<DesignRule[]>([]);
  const [loadingRules, setLoading]    = useState(true);
  const [saving, setSaving]           = useState(false);
  const [selected, setSelected]       = useState<DesignRule | null>(null);
  const [editingRule, setEditingRule] = useState<DesignRule | null>(null);

  useEffect(() => {
    fetchDesignRules()
      .then(setRules)
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (form: DesignRuleInsert) => {
    setSaving(true);
    try {
      if (editingRule) {
        await updateDesignRule(editingRule.id, form);
        const updated = await fetchDesignRules();
        setRules(updated);
        setEditingRule(null);
        toast.success("Rule updated successfully.");
      } else {
        const saved = await insertDesignRule(form);
        setRules(r => [saved, ...r]);
        toast.success("Design rule saved to Design Rule.");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDesignRule(id);
      setRules(r => r.filter(x => x.id !== id));
      setSelected(null);
      toast.success("Rule deleted.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed.");
    }
  };

  const handleEdit = (rule: DesignRule) => {
    setEditingRule(rule);
    setSelected(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePromote = async (rule: DesignRule) => {
    const droneLabel = rule.drone_type ?? "Drone";
    const payloadPart = rule.payload_max_kg != null ? ` Payload up to ${rule.payload_max_kg} kg.` : "";
    const noteParts = [rule.engineer_notes, "Reference: see real-world implementation (link TBD)"].filter(Boolean);

    const { error } = await supabase.from("reference_designs").insert({
      name:                  rule.purpose,
      purpose:               rule.purpose,
      description:           `${droneLabel} for ${rule.purpose}.${payloadPart}`,
      vertical:              VERTICAL_MAP[rule.vertical] ?? null,
      drone_type:            rule.drone_type ?? null,
      frame_size:            rule.frame_size ?? null,
      motor_class:           rule.motor_class ?? null,
      battery:               rule.battery ?? null,
      estimated_flight_time: rule.flight_time_min ?? null,
      payload_weight:        rule.payload_max_kg,
      confidence_score:      rule.confidence_level != null ? rule.confidence_level * 20 : 60,
      engineer_notes:        noteParts.length > 0 ? noteParts.join("\n") : null,
      approval_status:       "pending",
      created_by:            userId,
    });
    if (error) throw new Error(error.message);
    toast.success("Promoted to Proven Designs (pending review)");
  };

  const stars = (n: number | null) => {
    const v = n ?? 0;
    return "★".repeat(v) + "☆".repeat(5 - v);
  };

  const starColor = (n: number | null) =>
    (n ?? 0) >= 4
      ? "text-emerald-400"
      : (n ?? 0) >= 3
      ? "text-amber-400"
      : "text-red-400";

  /* Strip id/created_at/updated_at when pre-populating the form */
  const editInitial = editingRule
    ? (({ id: _id, created_at: _c, updated_at: _u, ...rest }) => rest)(editingRule)
    : undefined;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-[#378ADD]" aria-hidden="true" />
          <h1 className="text-2xl font-semibold text-white">
            Design Rule — Design Knowledge Capture
          </h1>
        </div>
        <p className="text-sm text-white/50 mt-1 max-w-2xl">
          Feed your engineering knowledge here. Each rule teaches the design
          engine how to recommend drone configurations for specific mission
          conditions.
        </p>
      </div>

      {/* Form divider */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] uppercase tracking-widest text-white/30">
          {editingRule ? "EDITING RULE" : "NEW KNOWLEDGE ENTRY"}
        </span>
        <div className="flex-1 h-px bg-white/[0.08]" />
        {editingRule && (
          <button
            type="button"
            onClick={() => setEditingRule(null)}
            className="text-[12px] text-white/40 hover:text-white/70"
          >
            Cancel edit
          </button>
        )}
      </div>

      {/* Form */}
      <RuleForm
        engineerName={engineerName}
        userId={userId}
        initial={editInitial}
        onSave={handleSave}
        saving={saving}
        isEditing={!!editingRule}
      />

      {/* Knowledge base divider */}
      <div className="flex items-center gap-3 pt-4">
        <span className="text-[11px] uppercase tracking-widest text-white/30">
          KNOWLEDGE BASE — {rules.length} rule{rules.length !== 1 ? "s" : ""} stored
        </span>
        <div className="flex-1 h-px bg-white/[0.08]" />
      </div>

      {/* Rules list */}
      <div className="bg-[#0d1b2e]/60 border border-white/[0.08] rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px_80px_60px] bg-[#0a0f1c] text-[11px] uppercase text-white/40 px-4 py-3 gap-3">
          <span>Purpose</span>
          <span>Vertical</span>
          <span>Drone type</span>
          <span>Payload range</span>
          <span>By</span>
          <span>Conf</span>
          <span>Date</span>
          <span>Active</span>
        </div>

        {/* Loading skeleton */}
        {loadingRules &&
          [0, 1, 2].map(i => (
            <div
              key={i}
              className="h-12 mx-4 my-2 rounded bg-white/5 animate-pulse"
            />
          ))}

        {/* Empty state */}
        {!loadingRules && rules.length === 0 && (
          <div className="py-16 text-center text-white/30">
            <Brain
              className="h-8 w-8 mx-auto mb-3 opacity-40"
              aria-hidden="true"
            />
            <p className="text-sm">No rules yet.</p>
            <p className="text-[12px] mt-1">Add your first design rule above.</p>
          </div>
        )}

        {/* Rows */}
        {!loadingRules &&
          rules.map(rule => (
            <div
              key={rule.id}
              onDoubleClick={() => setSelected(rule)}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px_80px_60px] border-t border-white/[0.05] px-4 py-3 gap-3 items-center cursor-pointer hover:bg-white/[0.04] transition-colors"
            >
              <span className="text-white/85 text-sm truncate">{rule.purpose}</span>
              <span className="text-white/60 text-[12px] truncate">{rule.vertical}</span>
              <span className="text-white/60 text-[12px]">{rule.drone_type ?? "—"}</span>
              <span className="text-white/60 text-[12px]">
                {rule.payload_min_kg !== null || rule.payload_max_kg !== null
                  ? `${rule.payload_min_kg ?? "?"} – ${rule.payload_max_kg ?? "?"} kg`
                  : "Any"}
              </span>
              <span className="text-white/70 text-[12px] truncate">{rule.engineer_name}</span>
              <span className={`text-[12px] font-mono ${starColor(rule.confidence_level)}`}>
                {stars(rule.confidence_level)}
              </span>
              <span className="text-white/40 text-[12px]">
                {new Date(rule.created_at).toLocaleDateString("en-IN")}
              </span>
              <span className="flex items-center">
                <span
                  className={`w-2 h-2 rounded-full ${rule.is_active ? "bg-emerald-400" : "bg-white/20"}`}
                />
              </span>
            </div>
          ))}

        {/* Double-click hint */}
        {!loadingRules && rules.length > 0 && (
          <div className="text-center py-2 text-[11px] text-white/20 border-t border-white/[0.05]">
            Double-click any row to view full details
          </div>
        )}
      </div>

      {/* Modal */}
      <RuleDetailModal
        rule={selected}
        onClose={() => setSelected(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPromote={handlePromote}
      />
    </div>
  );
}
