import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  Plus, Search, X, Eye, Copy, Loader2,
  CheckCircle2, Clock, XCircle, ChevronDown,
} from "lucide-react";
import { MissionHubShell } from "@/components/mission-hub/Shell";
import { useMissionHubAuth } from "@/lib/mission-hub/context";
import {
  useReferenceDesigns,
  type ReferenceDesign,
  type ReferenceDesignInsert,
} from "@/lib/mission-hub/useReferenceDesigns";

export const Route = createFileRoute("/mission-hub/twbc-drone-proven-designs")({
  component: ProvenDesignsPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type VerticalKey =
  | "Agriculture"
  | "Infrastructure"
  | "Mapping"
  | "Surveillance"
  | "Industrial"
  | "Defence";

// ─── Constants ─────────────────────────────────────────────────────────────────

const ALL_VERTICALS: VerticalKey[] = [
  "Agriculture", "Infrastructure", "Mapping", "Surveillance", "Industrial", "Defence",
];

const VERTICAL_COLOR: Record<string, { bg: string; text: string }> = {
  Agriculture:    { bg: "rgba(34,197,94,0.12)",  text: "#4ade80" },
  Infrastructure: { bg: "rgba(55,138,221,0.12)", text: "#378ADD" },
  Mapping:        { bg: "rgba(168,85,247,0.12)", text: "#c084fc" },
  Surveillance:   { bg: "rgba(245,158,11,0.12)", text: "#fbbf24" },
  Industrial:     { bg: "rgba(249,115,22,0.12)", text: "#fb923c" },
  Defence:        { bg: "rgba(239,68,68,0.12)",  text: "#f87171" },
};

const DRONE_TYPES = [
  "Quadcopter", "Hexacopter", "Octocopter", "Fixed-wing", "Fixed-wing VTOL", "Tethered", "Other",
];

const MOTOR_CLASSES = [
  "2204 2300KV", "2206 2400KV", "2207 1750KV", "2306 2400KV",
  "3515 400KV", "4012 400KV", "4014 330KV", "4108 380KV", "Other",
];

// ─── Page ──────────────────────────────────────────────────────────────────────

function ProvenDesignsPage() {
  return (
    <MissionHubShell title="Proven Designs">
      <ProvenDesignsContent />
    </MissionHubShell>
  );
}

function ProvenDesignsContent() {
  const { profile } = useMissionHubAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeVerticals, setActiveVerticals] = useState<VerticalKey[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<ReferenceDesign | null>(null);

  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  const { designs, loading, error, stats, insert, approveDesign, rejectDesign } = useReferenceDesigns(search, activeVerticals.map((v) => v.toLowerCase()), !isAdmin);
  const [pendingOnly, setPendingOnly] = useState(false);
  const displayedDesigns = pendingOnly ? designs.filter((d) => d.approval_status === "pending") : designs;

  const toggleVertical = (v: VerticalKey) =>
    setActiveVerticals((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v],
    );

  const handleAdd = async (form: Omit<ReferenceDesignInsert, "created_by">) => {
    await insert({ ...form, created_by: profile?.id ?? null });
    setModalOpen(false);
  };

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1
            className="text-white text-2xl"
            style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}
          >
            Proven Designs
          </h1>
          <p className="mt-1 text-[13px] text-white/50 max-w-lg">
            Validated drone configurations approved by the engineering team. Use
            these as starting points or reference baselines for new projects.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 shrink-0 rounded-lg px-4 py-2.5 text-[13px] text-white transition-colors hover:opacity-90"
            style={{ background: "#185FA5", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}
          >
            <Plus className="h-4 w-4" />
            Add proven design
          </button>
        )}
      </div>

      {/* ── Stats (admin only) ── */}
      {isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total designs"     value={stats.total} />
          <StatCard label="Approved"          value={stats.approved} accent="#4ade80" />
          <StatCard label="Pending review"    value={stats.pending} accent="#fbbf24" />
          <StatCard label="Verticals covered" value={stats.verticals} />
        </div>
      )}

      {/* ── Search + Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search designs, purpose, drone type…"
            className="w-full h-9 bg-[#141928] border rounded-lg pl-9 pr-3 text-sm text-white/80 placeholder-white/30 outline-none focus:border-[#378ADD]/50"
            style={{ borderColor: "rgba(255,255,255,0.1)" }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {ALL_VERTICALS.map((v) => {
            const active = activeVerticals.includes(v);
            const c = VERTICAL_COLOR[v];
            return (
              <button
                key={v}
                onClick={() => toggleVertical(v)}
                className="rounded-full px-3 py-1 text-[12px] border transition-all"
                style={
                  active
                    ? { background: c.bg, color: c.text, borderColor: c.text + "55" }
                    : { background: "transparent", color: "rgba(255,255,255,0.4)", borderColor: "rgba(255,255,255,0.12)" }
                }
              >
                {v}
              </button>
            );
          })}
          {activeVerticals.length > 0 && (
            <button
              onClick={() => setActiveVerticals([])}
              className="rounded-full px-3 py-1 text-[12px] text-white/30 hover:text-white/60 border transition-colors"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
            >
              Clear
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setPendingOnly((p) => !p)}
              className="rounded-full px-3 py-1 text-[12px] border transition-all inline-flex items-center gap-1"
              style={
                pendingOnly
                  ? { background: "rgba(245,158,11,0.12)", color: "#fbbf24", borderColor: "#fbbf2455" }
                  : { background: "transparent", color: "rgba(255,255,255,0.4)", borderColor: "rgba(255,255,255,0.12)" }
              }
            >
              <Clock className="h-3 w-3" />
              Pending review
            </button>
          )}
        </div>
      </div>

      {/* ── Card grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[14px] h-64 animate-pulse"
              style={{ background: "#141928", border: "0.5px solid rgba(255,255,255,0.08)" }}
            />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-[13px] text-[#f87171]">{error}</p>
        </div>
      ) : displayedDesigns.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <p className="text-sm">No designs match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {displayedDesigns.map((d) => (
            <DesignCard
              key={d.id}
              design={d}
              isAdmin={isAdmin}
              onView={() => setViewTarget(d)}
              onUseAsBase={() => {
                sessionStorage.setItem("torqwings-studio:base-design", d.id);
                navigate({ to: "/mission-hub/torqwings-design-studio/new" });
              }}
              onApprove={isAdmin ? async () => approveDesign(d.id, profile!.id) : undefined}
              onReject={isAdmin ? async () => rejectDesign(d.id, profile!.id) : undefined}
            />
          ))}
        </div>
      )}

      {/* ── Add modal ── */}
      {modalOpen && (
        <AddDesignModal onClose={() => setModalOpen(false)} onAdd={handleAdd} />
      )}

      {/* ── View modal ── */}
      {viewTarget && (
        <ViewDesignModal
          design={viewTarget}
          isAdmin={isAdmin}
          onClose={() => setViewTarget(null)}
          onUseAsBase={() => {
            sessionStorage.setItem("torqwings-studio:base-design", viewTarget.id);
            navigate({ to: "/mission-hub/torqwings-design-studio/new" });
          }}
          onApprove={isAdmin && viewTarget.approval_status === "pending"
            ? async () => { await approveDesign(viewTarget.id, profile!.id); setViewTarget(null); }
            : undefined}
          onReject={isAdmin && viewTarget.approval_status === "pending"
            ? async () => { await rejectDesign(viewTarget.id, profile!.id); setViewTarget(null); }
            : undefined}
        />
      )}
    </div>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div
      className="rounded-[14px] p-5"
      style={{ background: "#141928", border: "0.5px solid rgba(255,255,255,0.08)" }}
    >
      <div
        className="text-3xl"
        style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, color: accent ?? "white" }}
      >
        {value}
      </div>
      <div className="mt-1 text-[12px] text-white/50">{label}</div>
    </div>
  );
}

// ─── Design card ───────────────────────────────────────────────────────────────

function DesignCard({
  design, onView, onUseAsBase, isAdmin, onApprove, onReject,
}: {
  design: ReferenceDesign;
  onView: () => void;
  onUseAsBase: () => void;
  isAdmin?: boolean;
  onApprove?: () => Promise<void>;
  onReject?: () => Promise<void>;
}) {
  const [acting, setActing] = useState(false);
  const act = async (fn: () => Promise<void>) => {
    setActing(true);
    try { await fn(); } finally { setActing(false); }
  };

  const scoreColor =
    design.confidence_score >= 80 ? "#4ade80"
    : design.confidence_score >= 60 ? "#fbbf24"
    : "#f87171";

  return (
    <div
      className="rounded-[14px] flex flex-col gap-4 p-5 transition-colors hover:border-white/[0.14]"
      style={{ background: "#141928", border: "0.5px solid rgba(255,255,255,0.08)" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3
            className="text-white text-[15px] truncate"
            style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}
          >
            {design.name}
          </h3>
          <p className="mt-0.5 text-[12px] text-white/50 line-clamp-2">{design.description}</p>
        </div>
        <ApprovalBadge status={design.approval_status} />
      </div>

      {/* Vertical badge */}
      <div className="flex flex-wrap gap-1.5">
        {design.vertical && <VerticalBadge vertical={design.vertical} />}
      </div>

      {/* Specs */}
      <div className="grid grid-cols-2 gap-2">
        <SpecPill label="Type"        value={design.drone_type ?? "—"} />
        <SpecPill label="Payload"     value={design.payload_weight ?? "—"} />
        <SpecPill label="Flight time" value={design.estimated_flight_time != null ? `${design.estimated_flight_time} min` : "—"} />
        <SpecPill label="Frame"       value={design.frame_size ?? "—"} />
      </div>

      {/* Confidence bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] uppercase tracking-wider text-white/30">Confidence</span>
          <span className="text-[12px] font-medium" style={{ color: scoreColor }}>
            {design.confidence_score}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${design.confidence_score}%`, background: scoreColor }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onView}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border py-2 text-[12px] text-white/70 hover:text-white hover:border-white/25 transition-colors"
          style={{ borderColor: "rgba(255,255,255,0.12)" }}
        >
          <Eye className="h-3.5 w-3.5" /> View
        </button>
        <button
          onClick={onUseAsBase}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] transition-colors hover:opacity-90"
          style={{ background: "rgba(55,138,221,0.15)", color: "#378ADD" }}
        >
          <Copy className="h-3.5 w-3.5" /> Use as base
        </button>
      </div>

      {/* Admin approval actions — only for pending designs */}
      {isAdmin && design.approval_status === "pending" && onApprove && onReject && (
        <div className="flex gap-2">
          <button
            onClick={() => act(onApprove)}
            disabled={acting}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] transition-colors disabled:opacity-50"
            style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80" }}
          >
            {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Approve
          </button>
          <button
            onClick={() => act(onReject)}
            disabled={acting}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] transition-colors disabled:opacity-50"
            style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}
          >
            {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

// ─── View modal ────────────────────────────────────────────────────────────────

function ViewDesignModal({
  design, onClose, onUseAsBase, isAdmin, onApprove, onReject,
}: {
  design: ReferenceDesign;
  onClose: () => void;
  onUseAsBase: () => void;
  isAdmin?: boolean;
  onApprove?: () => Promise<void>;
  onReject?: () => Promise<void>;
}) {
  const [acting, setActing] = useState(false);
  const act = async (fn: () => Promise<void>) => {
    setActing(true);
    try { await fn(); } finally { setActing(false); }
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const scoreColor =
    design.confidence_score >= 80 ? "#4ade80"
    : design.confidence_score >= 60 ? "#fbbf24"
    : "#f87171";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-12 px-4"
      style={{ background: "rgba(0,0,0,0.65)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl p-8"
        style={{ background: "#141928", border: "0.5px solid rgba(255,255,255,0.12)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white text-xl leading-none">×</button>

        <div className="flex items-start gap-3 flex-wrap mb-2">
          <h2 className="text-white text-xl flex-1" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
            {design.name}
          </h2>
          <ApprovalBadge status={design.approval_status} />
        </div>
        <p className="text-[13px] text-white/55 mb-4">{design.description}</p>

        <div className="flex flex-wrap gap-1.5 mb-6">
          {design.vertical && <VerticalBadge vertical={design.vertical} />}
        </div>

        <SectionLabel>Purpose</SectionLabel>
        <p className="text-sm text-white/70 mb-5">{design.purpose}</p>

        <SectionLabel>Drone Specifications</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-5">
          <SpecCard label="Drone type"  value={design.drone_type ?? "—"} />
          <SpecCard label="Frame size"  value={design.frame_size ?? "—"} />
          <SpecCard label="Payload"     value={design.payload_weight ?? "—"} />
          <SpecCard label="Flight time" value={design.estimated_flight_time != null ? `${design.estimated_flight_time} min` : "—"} />
          <SpecCard label="Motor class" value={design.motor_class ?? "—"} />
          <SpecCard label="Battery"     value={design.battery ?? "—"} />
        </div>

        <SectionLabel>Confidence Score</SectionLabel>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-2 rounded-full bg-white/[0.08] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${design.confidence_score}%`, background: scoreColor }} />
          </div>
          <span className="text-sm font-medium shrink-0" style={{ color: scoreColor }}>{design.confidence_score}%</span>
        </div>

        {design.engineer_notes && (
          <>
            <SectionLabel>Engineer Notes</SectionLabel>
            <p className="text-sm text-white/60 rounded-xl p-4 mb-6" style={{ background: "rgba(255,255,255,0.04)" }}>
              {design.engineer_notes}
            </p>
          </>
        )}

        {isAdmin && design.approval_status === "pending" && onApprove && onReject && (
          <div className="flex gap-3 mb-5">
            <button
              onClick={() => act(onApprove)}
              disabled={acting}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] transition-colors disabled:opacity-50"
              style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "0.5px solid rgba(74,222,128,0.2)" }}
            >
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Approve design
            </button>
            <button
              onClick={() => act(onReject)}
              disabled={acting}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] transition-colors disabled:opacity-50"
              style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "0.5px solid rgba(248,113,113,0.2)" }}
            >
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Reject design
            </button>
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <span className="text-[12px] text-white/30">Added {design.created_at?.split("T")[0] ?? ""}</span>
          <button
            onClick={onUseAsBase}
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2 text-[13px] text-white hover:opacity-90 transition-opacity"
            style={{ background: "#185FA5" }}
          >
            <Copy className="h-4 w-4" /> Use as base
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add design modal ──────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: "",
  description: "",
  purpose: "",
  vertical: "",
  drone_type: "",
  frame_size: "",
  payload_weight: "",
  estimated_flight_time: 20,
  motor_class: "",
  battery: "",
  confidence_score: 70,
  engineer_notes: "",
  approval_status: "pending" as string,
};

function AddDesignModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (d: Omit<ReferenceDesignInsert, "created_by">) => Promise<void>;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    firstRef.current?.focus();
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const set = <K extends keyof typeof EMPTY_FORM>(k: K, v: (typeof EMPTY_FORM)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const selectVertical = (v: VerticalKey) =>
    set("vertical", form.vertical === v.toLowerCase() ? "" : v.toLowerCase());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || saving) return;
    setSaving(true);
    try {
      await onAdd(form);
    } finally {
      setSaving(false);
    }
  };

  const scoreColor =
    form.confidence_score >= 80 ? "#4ade80"
    : form.confidence_score >= 60 ? "#fbbf24"
    : "#f87171";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-10 px-4"
      style={{ background: "rgba(0,0,0,0.65)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl p-8 my-auto"
        style={{ background: "#141928", border: "0.5px solid rgba(255,255,255,0.12)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white text-xl leading-none">×</button>

        <h2 className="text-white text-xl mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
          Add Proven Design
        </h2>
        <p className="text-[13px] text-white/45 mb-6">Submit a validated configuration to the proven designs library.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Design Name" required>
            <input ref={firstRef} type="text" value={form.name} onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. AgroScan X4" required className="mh-input" />
          </Field>

          <Field label="Description">
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
              rows={2} placeholder="Short summary of what this drone is designed for…" className="mh-input resize-none" />
          </Field>

          <Field label="Purpose">
            <input type="text" value={form.purpose} onChange={(e) => set("purpose", e.target.value)}
              placeholder="e.g. Crop health monitoring & spray routing" className="mh-input" />
          </Field>

          <Field label="Vertical">
            <div className="flex flex-wrap gap-2 pt-1">
              {ALL_VERTICALS.map((v) => {
                const active = form.vertical === v.toLowerCase();
                const c = VERTICAL_COLOR[v];
                return (
                  <button key={v} type="button" onClick={() => selectVertical(v)}
                    className="rounded-full px-3 py-1 text-[12px] border transition-all"
                    style={active
                      ? { background: c.bg, color: c.text, borderColor: c.text + "55" }
                      : { background: "transparent", color: "rgba(255,255,255,0.4)", borderColor: "rgba(255,255,255,0.12)" }}>
                    {v}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Drone Type">
              <div className="relative">
                <select value={form.drone_type} onChange={(e) => set("drone_type", e.target.value)} className="mh-input appearance-none pr-8">
                  <option value="">Select…</option>
                  {DRONE_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
              </div>
            </Field>
            <Field label="Frame Size">
              <input type="text" value={form.frame_size} onChange={(e) => set("frame_size", e.target.value)}
                placeholder="e.g. 450 mm" className="mh-input" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Payload Weight">
              <input type="text" value={form.payload_weight} onChange={(e) => set("payload_weight", e.target.value)}
                placeholder="e.g. 1.2 kg" className="mh-input" />
            </Field>
            <Field label="Est. Flight Time (min)">
              <input type="number" min={1} max={300} value={form.estimated_flight_time}
                onChange={(e) => set("estimated_flight_time", Number(e.target.value))} className="mh-input" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Motor Class">
              <div className="relative">
                <select value={form.motor_class} onChange={(e) => set("motor_class", e.target.value)} className="mh-input appearance-none pr-8">
                  <option value="">Select…</option>
                  {MOTOR_CLASSES.map((m) => <option key={m}>{m}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
              </div>
            </Field>
            <Field label="Battery">
              <input type="text" value={form.battery} onChange={(e) => set("battery", e.target.value)}
                placeholder="e.g. 6S 5000 mAh LiPo" className="mh-input" />
            </Field>
          </div>

          <Field label={`Confidence Score — ${form.confidence_score}%`}>
            <div className="flex items-center gap-3 pt-1">
              <input type="range" min={0} max={100} value={form.confidence_score}
                onChange={(e) => set("confidence_score", Number(e.target.value))}
                className="flex-1 accent-[#378ADD]" />
              <span className="text-[13px] font-medium shrink-0 w-10 text-right" style={{ color: scoreColor }}>
                {form.confidence_score}
              </span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${form.confidence_score}%`, background: scoreColor }} />
            </div>
          </Field>

          <Field label="Engineer Notes">
            <textarea value={form.engineer_notes} onChange={(e) => set("engineer_notes", e.target.value)}
              rows={3} placeholder="Deployment conditions, caveats, certifications required…" className="mh-input resize-none" />
          </Field>

          <Field label="Approval Status">
            <div className="relative">
              <select value={form.approval_status} onChange={(e) => set("approval_status", e.target.value)} className="mh-input appearance-none pr-8">
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
            </div>
          </Field>

          <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <button type="button" onClick={onClose} disabled={saving}
              className="rounded-lg border px-5 py-2 text-[13px] text-white/60 hover:text-white transition-colors disabled:opacity-50"
              style={{ borderColor: "rgba(255,255,255,0.12)" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="rounded-lg px-6 py-2 text-[13px] text-white hover:opacity-90 transition-opacity disabled:opacity-70 inline-flex items-center gap-2"
              style={{ background: "#185FA5", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save design
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .mh-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 0.5px solid rgba(255,255,255,0.10);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13px;
          color: rgba(255,255,255,0.85);
          outline: none;
          transition: border-color 0.15s;
        }
        .mh-input::placeholder { color: rgba(255,255,255,0.25); }
        .mh-input:focus { border-color: rgba(55,138,221,0.50); }
        .mh-input option { background: #141928; }
      `}</style>
    </div>
  );
}

// ─── Small reusables ───────────────────────────────────────────────────────────

function ApprovalBadge({ status }: { status: string }) {
  const cfg = ({
    approved: { icon: CheckCircle2, bg: "rgba(34,197,94,0.12)",  text: "#4ade80", label: "Approved" },
    pending:  { icon: Clock,         bg: "rgba(245,158,11,0.12)", text: "#fbbf24", label: "Pending"  },
    rejected: { icon: XCircle,       bg: "rgba(239,68,68,0.12)",  text: "#f87171", label: "Rejected" },
  } as Record<string, { icon: React.ElementType; bg: string; text: string; label: string }>)[status]
    ?? { icon: Clock, bg: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.4)", label: status };
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] shrink-0"
      style={{ background: cfg.bg, color: cfg.text }}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function VerticalBadge({ vertical }: { vertical: string }) {
  const c = VERTICAL_COLOR[vertical] ?? { bg: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.5)" };
  return (
    <span className="rounded-full px-2.5 py-0.5 text-[11px]" style={{ background: c.bg, color: c.text }}>
      {vertical}
    </span>
  );
}

function SpecPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.04)" }}>
      <div className="text-[10px] uppercase tracking-wide text-white/30">{label}</div>
      <div className="text-[12px] text-white/75 mt-0.5 truncate">{value}</div>
    </div>
  );
}

function SpecCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.04)" }}>
      <div className="text-[10px] uppercase tracking-wide text-white/30">{label}</div>
      <div className="text-sm text-white/80 mt-0.5">{value}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] uppercase tracking-widest text-white/30 font-medium mb-3">{children}</p>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1.5">
        {label}{required && <span className="text-[#378ADD] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
