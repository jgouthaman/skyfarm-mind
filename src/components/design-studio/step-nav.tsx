import { Link, useRouterState } from "@tanstack/react-router";
import { Cpu, ListChecks, FlaskConical, Sparkles, FileText, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  { to: "/control-center/torqwings-design-studio/design", label: "Design", icon: Cpu },
  { to: "/control-center/torqwings-design-studio/components", label: "Components", icon: ListChecks },
  { to: "/control-center/torqwings-design-studio/simulation", label: "Simulation", icon: FlaskConical },
  { to: "/control-center/torqwings-design-studio/advisor", label: "Advisor", icon: Sparkles },
  { to: "/control-center/torqwings-design-studio/compliance", label: "Compliance", icon: ShieldAlert },
  { to: "/control-center/torqwings-design-studio/report", label: "Report", icon: FileText },
] as const;

export function StudioStepNav() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <nav className="mt-6 flex flex-wrap gap-2 border-t border-border/60 pt-4">
      <span className="text-xs uppercase tracking-wider text-muted-foreground self-center mr-2">Jump to:</span>
      {steps.map(({ to, label, icon: Icon }) => {
        const active = path === to;
        return (
          <Link
            key={to}
            to={to as never}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
              active
                ? "bg-primary/15 text-primary border-primary/40"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/40",
            )}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
