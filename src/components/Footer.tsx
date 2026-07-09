import { Link } from "@tanstack/react-router";
import { Plane, Linkedin, Instagram, MessageCircle } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary">

      {/* ── Row 1 — Main body ───────────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-5 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-8">

          {/* Left — logo + taglines */}
          <div>
            <div className="flex items-center gap-2 font-display font-semibold text-lg">
              <span className="grid place-items-center h-8 w-8 rounded-lg bg-gradient-primary shadow-glow">
                <Plane className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
              </span>
              TorqWings
            </div>
            <p className="mt-2 text-muted-foreground leading-[1.5]" style={{ fontSize: 12 }}>
              Engineering the future of aerial intelligence.
            </p>
            <p className="mt-1 text-muted-foreground leading-[1.5]" style={{ fontSize: 11, opacity: 0.7 }}>
              Design Studio - flagship platform powered by Autonomous Aerial Intelligence.
            </p>
          </div>

          {/* Right — contact + social */}
          <ul className="space-y-1.5 text-xs text-muted-foreground leading-[1.5]">
            <li>Hello : +919940263589</li>
            <li>support@torqwings.com</li>
         
            <li>
              <a
                href="https://www.linkedin.com/company/torqwings"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <Linkedin width={14} height={14} aria-hidden="true" />
                TorqWings on LinkedIn
              </a>
            </li>
            <li>
              <a
                href="https://instagram.com/torqwings.official"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <Instagram width={14} height={14} aria-hidden="true" />
                @torqwings.official
              </a>
            </li>
          </ul>

        </div>
      </div>

      {/* ── Row 2 — Bottom bar ──────────────────────────────────────────── */}
      <div className="border-t border-border">
        <div
          className="mx-auto max-w-6xl px-5 lg:px-8 py-2 sm:py-3 text-muted-foreground"
          style={{ fontSize: 11 }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-y-1 gap-x-4">
            <span>© {new Date().getFullYear()} TorqWings. All rights reserved.</span>
            <span className="sm:text-center">
              Aerospace · Autonomous Aerial Platforms · AI {" "}

            </span>
            <a
              href="https://wa.me/919940263589"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors sm:justify-end"
            >
              <MessageCircle width={14} height={14} aria-hidden="true" />
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>

    </footer>
  );
}
