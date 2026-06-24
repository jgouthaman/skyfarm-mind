import { Link, useRouterState } from "@tanstack/react-router";

const tabs = [
  { label: "Design Result",   href: "/control-center/torqwings-design-studio/design" },
  { label: "Component List",  href: "/control-center/torqwings-design-studio/components" },
  { label: "Simulation Lab",  href: "/control-center/torqwings-design-studio/simulation" },
  { label: "AI Advisor",      href: "/control-center/torqwings-design-studio/advisor" },
  { label: "Reports",         href: "/control-center/torqwings-design-studio/report" },
  { label: "Project History", href: "/control-center/torqwings-design-studio/history" },
];

export function StudioTabNav() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  return (
    <div className="flex items-center gap-1 border-b border-border/40 mb-6 overflow-x-auto">
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            to={t.href as never}
            className={
              active
                ? "px-4 py-2 text-sm font-medium text-foreground border-b-2 border-primary -mb-px whitespace-nowrap"
                : "px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-t-lg transition-colors whitespace-nowrap"
            }
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
