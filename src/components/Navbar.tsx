import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plane, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NAV_LINKS } from "@/constants/nav.constants";

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/60">
      <div className="mx-auto max-w-7xl px-5 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display font-semibold text-lg">
          <span className="grid place-items-center h-8 w-8 rounded-lg bg-gradient-primary shadow-glow">
            <Plane className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
          </span>
          <span>TorqWings</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          {NAV_LINKS.map((n) => (
            <Link key={n.to} to={n.to} className="hover:text-foreground transition-colors">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90">
            <Link to="/contact">Partner with us</Link>
          </Button>
        </div>

        <button
          className="md:hidden p-2 rounded-md hover:bg-muted"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open
            ? <X className="h-5 w-5" aria-hidden="true" />
            : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur">
          <div className="px-5 py-4 flex flex-col gap-3">
            {NAV_LINKS.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {n.label}
              </Link>
            ))}
            <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground">
              <Link to="/contact" onClick={() => setOpen(false)}>Partner with us</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
