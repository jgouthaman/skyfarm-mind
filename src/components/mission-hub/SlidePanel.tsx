import { type ReactNode, useEffect } from "react";
import { X } from "lucide-react";

export function SlidePanel({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[90] bg-black/40 transition-opacity ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />
      <aside
        className={[
          "fixed top-0 right-0 z-[100] h-full w-full sm:w-[380px] bg-[#141928] border-l border-white/[0.08]",
          "transition-transform duration-[250ms] overflow-y-auto",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <div className="flex items-start justify-between p-5 border-b border-white/[0.06]">
          <div className="flex-1 min-w-0">{title}</div>
          <button onClick={onClose} aria-label="Close" className="text-white/50 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </aside>
    </>
  );
}

export function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="py-2.5 border-b border-white/[0.05] last:border-b-0">
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div className="mt-1 text-sm text-white/90 break-words">{value || <span className="text-white/30">—</span>}</div>
    </div>
  );
}
