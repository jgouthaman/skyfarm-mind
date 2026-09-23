import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plane, Menu, X } from "lucide-react";
import { NAV_LINKS } from "@/constants/nav.constants";

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="hgr-pub-navbar fixed top-0 inset-x-0 z-50">
      <div className="mx-auto max-w-7xl px-5 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="hgr-pub-navbar-brand">
          <span className="grid place-items-center h-8 w-8 rounded-lg bg-gradient-primary shadow-glow">
            <Plane className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
          </span>
          <span>TorqWings</span>
        </Link>

        <nav className="hgr-pub-navbar-links hidden md:flex">
          {NAV_LINKS.map((n) => (
            <Link key={n.to} to={n.to}>
              {n.label}
            </Link>
          ))}
        </nav>

        <button
          className="hgr-pub-navbar-toggle md:hidden p-2 rounded-md hover:bg-white/5"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open
            ? <X className="h-5 w-5" aria-hidden="true" />
            : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>

      {open && (
        <div className="hgr-pub-navbar-mobile md:hidden">
          <div className="px-5 py-4 flex flex-col gap-3">
            {NAV_LINKS.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
              >
                {n.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
