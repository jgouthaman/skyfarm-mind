import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Package, Plus, X, Search } from "lucide-react";
import { MissionHubShell } from "@/components/mission-hub/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useMissionHubAuth } from "@/lib/mission-hub/context";

export const Route = createFileRoute("/mission-hub/twbc-drone-components-library")({
  component: ComponentsLibraryPage,
});

interface DroneComponent {
  id: string;
  name: string;
  manufacturer: string;
  part_number: string | null;
  category: string;
  specs: Record<string, unknown> | null;
  status: string;
  compatible_verticals: string[] | null;
  tags: string[] | null;
  in_stock: boolean;
  created_at: string;
}

const DARK_VARS = {
  '--foreground':       'oklch(0.95 0.01 250)',
  '--muted-foreground': 'oklch(0.58 0.04 250)',
  '--border':           'oklch(0.95 0.01 250 / 15%)',
  '--card':             'oklch(0.14 0.04 250)',
} as React.CSSProperties;

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  frame:             { label: 'Frame',             color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  motor:             { label: 'Motor',             color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  esc:               { label: 'ESC',               color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  battery:           { label: 'Battery',           color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  propeller:         { label: 'Propeller',         color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  flight_controller: { label: 'Flight Controller', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  gps:               { label: 'GPS',               color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
  payload:           { label: 'Payload',           color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
  accessory:         { label: 'Accessory',         color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
};

const SKIP_SPEC_KEYS = new Set(['notes', 'compatible_motors', 'compatible_liquids']);

function formatSpecKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

function SpecRow({ label, value }: { label: string; value: unknown }) {
  const display = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return (
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <span className="text-white/35">{label}</span>
      <span className="text-white/65 text-right">{display}</span>
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const cfg = CATEGORY_CONFIG[category] ?? { label: category, color: 'bg-white/10 text-white/50 border-white/10' };
  return (
    <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function ComponentCard({ component }: { component: DroneComponent }) {
  const specEntries = Object.entries(component.specs ?? {})
    .filter(([k]) => !SKIP_SPEC_KEYS.has(k))
    .slice(0, 3);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0d1b2e]/70 p-5 flex flex-col gap-3 hover:border-white/[0.15] transition-colors">
      <div className="flex items-start justify-between gap-2">
        <CategoryBadge category={component.category} />
        <span className={`flex items-center gap-1.5 text-[11px] ${component.in_stock ? 'text-emerald-400' : 'text-red-400'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${component.in_stock ? 'bg-emerald-400' : 'bg-red-400'}`} />
          {component.in_stock ? 'In stock' : 'Out of stock'}
        </span>
      </div>

      <div>
        <h3 className="text-white font-semibold text-sm leading-snug">{component.name}</h3>
        <p className="text-white/40 text-[11px] mt-0.5">
          {component.manufacturer}
          {component.part_number && <span className="ml-1.5 text-white/25">· {component.part_number}</span>}
        </p>
      </div>

      {specEntries.length > 0 && (
        <div className="space-y-1.5 border-t border-white/[0.06] pt-3">
          {specEntries.map(([k, v]) => (
            <SpecRow key={k} label={formatSpecKey(k)} value={v} />
          ))}
        </div>
      )}

      {(component.compatible_verticals ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {component.compatible_verticals!.slice(0, 3).map(v => (
            <span key={v} className="text-[10px] px-1.5 py-0.5 rounded bg-[#378ADD]/10 text-[#378ADD] border border-[#378ADD]/20">
              {v}
            </span>
          ))}
          {component.compatible_verticals!.length > 3 && (
            <span className="text-[10px] text-white/25">+{component.compatible_verticals!.length - 3}</span>
          )}
        </div>
      )}

      {(component.tags ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {component.tags!.slice(0, 3).map(t => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/40">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM = {
  name: '', manufacturer: '', part_number: '', category: 'frame',
  status: 'active', compatible_verticals: '', tags: '', specs: '', in_stock: true,
};

function AddComponentModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (k: keyof typeof EMPTY_FORM, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let specs: Record<string, unknown> | null = null;
    if (form.specs.trim()) {
      try { specs = JSON.parse(form.specs); }
      catch { setError('Specs must be valid JSON — e.g. {"kv_rating": 320}'); return; }
    }
    const payload = {
      name:                 form.name.trim(),
      manufacturer:         form.manufacturer.trim(),
      part_number:          form.part_number.trim() || null,
      category:             form.category,
      status:               form.status,
      compatible_verticals: form.compatible_verticals.trim()
        ? form.compatible_verticals.split(',').map(s => s.trim()).filter(Boolean)
        : null,
      tags: form.tags.trim()
        ? form.tags.split(',').map(s => s.trim()).filter(Boolean)
        : null,
      specs,
      in_stock: form.in_stock,
    };
    setSaving(true);
    try {
      const { error: dbErr } = await supabase.from('drone_components' as any).insert(payload as any);
      if (dbErr) throw new Error(dbErr.message);
      onAdded();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Insert failed');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full bg-[#0a0f1c] text-white placeholder:text-white/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#378ADD]/50 transition-colors";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[#141928] border border-white/10 rounded-2xl p-7 my-8"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-white/40 hover:text-white">
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-white font-semibold text-lg mb-5">Add Component</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">Name *</label>
              <input required className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. T-Motor MN5008" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">Manufacturer *</label>
              <input required className={inputCls} value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} placeholder="e.g. T-Motor" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">Part Number</label>
              <input className={inputCls} value={form.part_number} onChange={e => set('part_number', e.target.value)} placeholder="e.g. MN5008-KV340" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">Category *</label>
              <select required className={inputCls} value={form.category} onChange={e => set('category', e.target.value)}>
                {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">Status</label>
              <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="discontinued">Discontinued</option>
                <option value="under_review">Under Review</option>
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.in_stock}
                  onChange={e => set('in_stock', e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 accent-[#378ADD]"
                />
                <span className="text-sm text-white/70">In stock</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">Compatible Verticals</label>
            <input className={inputCls} value={form.compatible_verticals} onChange={e => set('compatible_verticals', e.target.value)} placeholder="AgriSky, InfraSky (comma-separated)" />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">Tags</label>
            <input className={inputCls} value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="heavy-lift, waterproof (comma-separated)" />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">
              Specs <span className="normal-case text-white/25 tracking-normal ml-1">(valid JSON)</span>
            </label>
            <textarea
              rows={3}
              className={inputCls}
              value={form.specs}
              onChange={e => set('specs', e.target.value)}
              placeholder='{"kv_rating": 320, "max_thrust_kg": 4.2}'
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-lg border border-white/10 text-white/60 hover:text-white text-sm transition-colors">
              Cancel
            </button>
            <button
              type="submit" disabled={saving}
              className="flex-1 h-10 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-opacity"
              style={{ background: '#378ADD' }}
            >
              {saving ? 'Saving…' : 'Add Component'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ComponentsLibraryPage() {
  const { profile } = useMissionHubAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const [components, setComponents] = useState<DroneComponent[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showAdd, setShowAdd]       = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('drone_components' as any)
      .select('*')
      .order('category')
      .order('name');
    setComponents((data ?? []) as DroneComponent[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const categories = Array.from(new Set(components.map(c => c.category))).sort();

  const filtered = components.filter(c => {
    const matchesSearch = !search.trim() ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.manufacturer.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !activeCategory || c.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const inStockCount = components.filter(c => c.in_stock).length;

  return (
    <MissionHubShell title="Components Library">
      <div style={DARK_VARS}>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-7">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-5 w-5 text-[#378ADD]" />
              <h1 className="text-2xl font-semibold text-white">Component Library</h1>
            </div>
            <p className="text-sm text-white/50">
              Drone component repository — {components.length} component{components.length !== 1 ? 's' : ''} across {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium text-white shrink-0"
              style={{ background: '#378ADD' }}
            >
              <Plus className="h-4 w-4" />
              Add Component
            </button>
          )}
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-7">
          {[
            { label: 'Total Components', value: components.length },
            { label: 'In Stock',         value: inStockCount },
            { label: 'Categories',       value: categories.length },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-white/[0.08] bg-[#0d1b2e]/60 px-5 py-4">
              <p className="text-2xl font-semibold text-white">{s.value}</p>
              <p className="text-[12px] text-white/45 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or manufacturer…"
              className="w-full bg-[#0d1b2e]/80 border border-white/[0.08] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#378ADD]/40 transition-colors"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1.5 rounded-lg text-[12px] transition-colors border ${
                activeCategory === null
                  ? 'bg-[#378ADD]/20 border-[#378ADD]/40 text-[#378ADD]'
                  : 'border-white/[0.08] text-white/50 hover:text-white hover:border-white/20'
              }`}
            >
              All Categories
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                className={`px-3 py-1.5 rounded-lg text-[12px] transition-colors border ${
                  activeCategory === cat
                    ? 'bg-[#378ADD]/20 border-[#378ADD]/40 text-[#378ADD]'
                    : 'border-white/[0.08] text-white/50 hover:text-white hover:border-white/20'
                }`}
              >
                {CATEGORY_CONFIG[cat]?.label ?? cat}
              </button>
            ))}
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-44 rounded-xl bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="py-20 text-center">
            <Package className="h-10 w-10 mx-auto text-white/15 mb-4" />
            <p className="text-white/40 text-sm">No components found for this filter</p>
            {(search || activeCategory) && (
              <button
                onClick={() => { setSearch(''); setActiveCategory(null); }}
                className="mt-3 text-[12px] text-[#378ADD] hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Component grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(c => <ComponentCard key={c.id} component={c} />)}
          </div>
        )}

        {showAdd && (
          <AddComponentModal onClose={() => setShowAdd(false)} onAdded={load} />
        )}
      </div>
    </MissionHubShell>
  );
}
