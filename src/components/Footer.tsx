import { Link } from "@tanstack/react-router";
import { Plane } from "lucide-react";
import { NAV_LINKS } from "@/constants/nav.constants";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-5 lg:px-8 py-12 grid md:grid-cols-5 gap-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 font-display font-semibold text-lg">
            <span className="grid place-items-center h-8 w-8 rounded-lg bg-gradient-primary shadow-glow">
              <Plane className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
            </span>
            TorqWings
          </div>
          <p className="mt-3 text-sm text-muted-foreground max-w-sm">
            Engineering the future of aerial intelligence.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            AgriSky is a flagship service vertical of TorqWings.
          </p>
        </div>

        <div>
          <h4 className="font-display font-semibold text-sm">Explore</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {NAV_LINKS.map((n) => (
              <li key={n.to}>
                <Link to={n.to} className="hover:text-foreground">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-[11px] uppercase tracking-[0.07em] text-muted-foreground font-semibold">
            Platform
          </h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/mission-hub/login" className="hover:text-foreground">
                Mission Hub
              </Link>
            </li>
            <li>
              <Link to="/design-studio" className="hover:text-foreground">
                Design Studio Waitlist
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-display font-semibold text-sm">Contact</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Hello : 9940263589</li>
            <li>torqwings@gmail.com</li>
            <li>India</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 py-6 text-xs text-muted-foreground flex flex-wrap justify-between gap-3">
          <span>© {new Date().getFullYear()} TorqWings. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <span>Aerospace · Drones · AI</span>
            <Link
              to="/mission-hub/login"
              className="hover:text-foreground hover:underline transition-colors"
              style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px" }}
            >
              Mission Hub
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
