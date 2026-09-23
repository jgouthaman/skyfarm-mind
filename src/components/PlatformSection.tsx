// Home page "Platforms" section, directly below the hero. Colour tokens and
// classes are adapted from the site's own --hp-* custom theme
// (hangarPublicTheme.ts, the same one _layout.index.tsx's hero uses) rather
// than Tailwind's default slate-*/amber-* utilities, so the amber accent
// and dark text match the hero exactly instead of drifting from a second,
// visually-different palette.
import type { ReactNode } from "react";

type Platform = {
  code: string;
  name: string;
  tagline: string;
  body: string;
  uses: string[];
  icon: ReactNode;
};

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const platforms: Platform[] = [
  {
    code: "FW",
    name: "Fixed-wing",
    tagline: "Endurance",
    body: "Long-range, long-endurance flight for missions that cover ground.",
    uses: ["Mapping & survey", "Border & corridor ISR", "Pipeline patrol"],
    icon: (
      <svg viewBox="0 0 64 64" className="h-10 w-10" aria-hidden="true">
        <path {...stroke} d="M32 8 L32 56 M8 28 L56 28 L32 24 Z M22 50 L42 50" />
        <circle {...stroke} cx="32" cy="10" r="2" />
      </svg>
    ),
  },
  {
    code: "VT",
    name: "VTOL hybrid",
    tagline: "No runway needed",
    body: "Takes off like a multirotor, cruises like a fixed-wing.",
    uses: ["Remote-site logistics", "Maritime patrol", "Large-area inspection"],
    icon: (
      <svg viewBox="0 0 64 64" className="h-10 w-10" aria-hidden="true">
        <path {...stroke} d="M32 10 L32 54 M8 30 L56 30 M20 14 L20 50 M44 14 L44 50" />
        <circle {...stroke} cx="20" cy="14" r="6" />
        <circle {...stroke} cx="44" cy="14" r="6" />
        <circle {...stroke} cx="20" cy="50" r="6" />
        <circle {...stroke} cx="44" cy="50" r="6" />
      </svg>
    ),
  },
  {
    code: "MR",
    name: "Multirotor",
    tagline: "Precision hover",
    body: "Stable, low-altitude control for close-in, detailed work.",
    uses: ["Crop spraying", "Asset inspection", "Last-mile delivery"],
    icon: (
      <svg viewBox="0 0 64 64" className="h-10 w-10" aria-hidden="true">
        {[0, 60, 120, 180, 240, 300].map((deg) => {
          const r = (deg * Math.PI) / 180;
          const x = 32 + 20 * Math.cos(r);
          const y = 32 + 20 * Math.sin(r);
          return (
            <g key={deg}>
              <line {...stroke} x1="32" y1="32" x2={x} y2={y} />
              <circle {...stroke} cx={x} cy={y} r="6" />
            </g>
          );
        })}
        <circle {...stroke} cx="32" cy="32" r="5" />
      </svg>
    ),
  },
  {
    code: "ST",
    name: "Stealth",
    tagline: "Low observable",
    body: "Blended flying-wing designs shaped to stay off radar and out of sight.",
    uses: ["Covert ISR", "Deep reconnaissance", "Contested airspace"],
    icon: (
      <svg viewBox="0 0 64 64" className="h-10 w-10" aria-hidden="true">
        <path {...stroke} d="M32 12 L60 40 L50 44 L41 38 L32 46 L23 38 L14 44 L4 40 Z" />
        <path {...stroke} d="M32 12 L32 46" strokeOpacity="0.4" />
      </svg>
    ),
  },
];

export default function PlatformSection() {
  return (
    <section id="platforms" className="hgr-pub-section">
      <div className="hgr-pub-wrap">
        <span className="hgr-pub-badge hgr-pub-badge-dark">PLATFORMS</span>
        <h2 className="hgr-pub-h2" style={{ marginTop: 20 }}>
          One mission. <span className="hgr-pub-amber">Every airframe.</span>
        </h2>
        <p className="hgr-pub-sub">
          Every aircraft starts with a mission, not a shape. Tell The Hangar what it needs to do,
          and it weighs every configuration against your payload, range and endurance before a
          single part is drawn.
        </p>

        <div className="hgr-pub-grid hgr-pub-grid-4" style={{ marginTop: 44 }}>
          {platforms.map((p) => (
            <article key={p.code} className="hgr-pub-platform-card">
              <div className="flex items-start justify-between">
                <div className="hgr-pub-platform-icon">{p.icon}</div>
                <span className="hgr-pub-platform-code">{p.code}</span>
              </div>
              <h3 className="hgr-pub-platform-name">{p.name}</h3>
              <p className="hgr-pub-platform-tagline">{p.tagline}</p>
              <p className="hgr-pub-platform-body">{p.body}</p>
              <ul className="hgr-pub-platform-uses">
                {p.uses.map((u) => (
                  <li key={u}>
                    <span className="hgr-pub-platform-dot" />
                    {u}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
