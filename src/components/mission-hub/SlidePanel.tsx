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
          "fixed top-0 right-0 z-[100] h-full w-full sm:w-[380px] border-l",
          "transition-transform duration-[250ms] overflow-y-auto",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
        style={{ background: "var(--mh-bg)", borderColor: "var(--mh-hairline)" }}
      >
        <div className="flex items-start justify-between p-5 border-b" style={{ borderColor: "var(--mh-hairline)" }}>
          <div className="flex-1 min-w-0">{title}</div>
          <button onClick={onClose} aria-label="Close" style={{ color: "var(--mh-dim)" }}>
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
    <div className="py-2.5 border-b last:border-b-0" style={{ borderColor: "var(--mh-hairline)" }}>
      <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--mh-dim)" }}>{label}</div>
      <div className="mt-1 text-sm break-words" style={{ color: "var(--mh-paper)" }}>{value || <span style={{ color: "var(--mh-dim)" }}>—</span>}</div>
    </div>
  );
}
