// Shared navy/amber aerospace theme for the public marketing pages that were
// restyled to match The Hangar's look (the-hangar.concept.tsx's page CSS and
// the-hangar.index.tsx's own top nav) — same palette, same fonts (Space
// Grotesk headings, IBM Plex Sans body, IBM Plex Mono labels/mono). One copy
// so Home, About, Contact, and the shared Navbar/Footer that wraps every
// public page stay visually identical instead of drifting from pasted
// copies. Injected once, in _layout.tsx, so it covers the shared chrome and
// every page nested under it; scoped under .hgr-pub so it never reaches
// unrelated routes like the Hangar app itself or the mission-hub tools.
// Plain literal (not typed against TanStack's route `head()` return type,
// which isn't cleanly nameable from outside a route file) — each page
// spreads this into its own `links: [...HANGAR_PUBLIC_HEAD_LINKS, ...]`
// array, where it's checked against that route's actual expected shape.
export const HANGAR_PUBLIC_HEAD_LINKS = [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;700&display=swap",
  },
] as const;

export const HANGAR_PUBLIC_CSS = `
.hgr-pub{
  /* Light theme, matching The Hangar's: white page background, blue grid/
     hairlines, dark text. --hp-navy-deep stays the name of the "page
     background" variable (white now) so every background:var(--hp-navy-deep)
     below still means "page background" — but it's no longer safe to reuse
     for TEXT color (that text would vanish on white). Where the old CSS did
     that (amber button text), it now uses --hp-ink, a fixed dark color kept
     stable across themes for exactly that purpose. The Navbar/Footer stay
     dark "islands" instead of following this light theme — see their own
     rules below, which locally re-override --hp-paper/--hp-paper-dim/
     --hp-blue-bright/--hp-hairline back to their pre-flip (light-on-dark)
     values, the same way the-hangar's own nav/footer do it. */
  --hp-navy-deep:#FFFFFF; --hp-navy-panel:#F2F7FB;
  --hp-blue-line:#3E7CA6; --hp-blue-bright:#1C74B8;
  --hp-amber:#E8A33D; --hp-amber-bright:#F6C374;
  --hp-paper:#12222F; --hp-paper-dim:#4F6B80;
  --hp-ink:#08131F;
  --hp-hairline:rgba(62,124,166,0.28); --hp-grid:rgba(62,124,166,0.14);

  position:relative;
  background:var(--hp-navy-deep); color:var(--hp-paper); font-family:'IBM Plex Sans', sans-serif;
  background-image:linear-gradient(var(--hp-grid) 1px, transparent 1px), linear-gradient(90deg, var(--hp-grid) 1px, transparent 1px);
  background-size:44px 44px;
}
.hgr-pub *{ box-sizing:border-box; }
.hgr-pub h1,.hgr-pub h2,.hgr-pub h3{ font-family:'Space Grotesk', sans-serif; font-weight:600; letter-spacing:-0.01em; margin:0; }
.hgr-pub a{ color:inherit; }
.hgr-pub-wrap{ max-width:1180px; margin:0 auto; padding:0 20px; position:relative; }
@media(min-width:1024px){ .hgr-pub-wrap{ padding:0 32px; } }

.hgr-pub-section{ padding:76px 0; border-bottom:1px solid var(--hp-hairline); }
.hgr-pub-section:last-child{ border-bottom:none; }
.hgr-pub-section-muted{ background:var(--hp-navy-panel); }
@media(max-width:640px){ .hgr-pub-section{ padding:56px 0; } }

.hgr-pub-badge{
  font-family:'IBM Plex Mono',monospace; font-size:11.5px; letter-spacing:.1em; text-transform:uppercase;
  padding:6px 13px; border-radius:2px; display:inline-flex; align-items:center; gap:8px;
  color:var(--hp-paper-dim); border:1px solid var(--hp-hairline); margin-bottom:18px;
}
/* Dark variant — just the Home hero's "Aerospace · Autonomous Aerial
   Platforms · AI" badge, not the plain .hgr-pub-badge used elsewhere
   (About's "Our Story", Contact's "Get In Touch"). */
.hgr-pub-badge-dark{
  background:var(--hp-ink); color:#ECEFF3; border-color:rgba(111,180,224,0.35);
}
.hgr-pub-kicker{ font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--hp-amber); margin-bottom:12px; }
.hgr-pub-amber{ color:var(--hp-amber-bright); }
.hgr-pub-h1{ font-size:clamp(34px,5.2vw,58px); line-height:1.08; }
.hgr-pub-h2{ font-size:clamp(26px,3.4vw,38px); line-height:1.15; }
.hgr-pub-lead{ margin-top:20px; color:var(--hp-paper-dim); font-size:16px; line-height:1.65; max-width:560px; }
.hgr-pub-sub{ color:var(--hp-paper-dim); font-size:14.5px; max-width:680px; margin-top:14px; line-height:1.6; }

.hgr-pub-cta{ margin-top:32px; display:flex; gap:14px; flex-wrap:wrap; }
.hgr-pub-btn{
  font-family:'IBM Plex Mono',monospace; font-size:13.5px; padding:13px 24px; border-radius:2px;
  display:inline-flex; align-items:center; gap:8px; text-decoration:none; border:1px solid transparent; cursor:pointer;
}
.hgr-pub-btn-amber{ background:var(--hp-amber); color:var(--hp-ink); font-weight:600; }
.hgr-pub-btn-amber:hover{ background:var(--hp-amber-bright); }
.hgr-pub-btn-ghost{ border:1px solid var(--hp-hairline); color:var(--hp-paper-dim); background:none; }
.hgr-pub-btn-ghost:hover{ color:var(--hp-paper); border-color:var(--hp-blue-bright); }
.hgr-pub-btn:disabled{ opacity:.4; cursor:not-allowed; }

.hgr-pub-stats{ display:flex; gap:34px; flex-wrap:wrap; }
.hgr-pub-stat-k{ font-family:'Space Grotesk',sans-serif; font-size:24px; font-weight:600; color:var(--hp-paper); }
.hgr-pub-stat-v{ margin-top:2px; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--hp-paper-dim); }

.hgr-pub-grid{ display:grid; gap:18px; }
.hgr-pub-grid-2{ grid-template-columns:1fr; }
.hgr-pub-grid-3{ grid-template-columns:1fr; }
.hgr-pub-grid-4{ grid-template-columns:1fr; }
@media(min-width:640px){ .hgr-pub-grid-2{ grid-template-columns:1fr 1fr; } .hgr-pub-grid-4{ grid-template-columns:1fr 1fr; } }
@media(min-width:900px){ .hgr-pub-grid-3{ grid-template-columns:repeat(3,1fr); } .hgr-pub-grid-4{ grid-template-columns:repeat(4,1fr); } }

.hgr-pub-card{
  border:1px solid var(--hp-hairline); background:var(--hp-navy-panel); border-radius:2px; padding:22px;
  transition:border-color .15s, transform .15s;
}
.hgr-pub-card:hover{ border-color:var(--hp-blue-bright); transform:translateY(-2px); }
.hgr-pub-card h3{ font-size:16px; }
.hgr-pub-card p{ margin-top:8px; color:var(--hp-paper-dim); font-size:13.5px; line-height:1.6; }

/* Platform cards (PlatformSection) — a separate hover treatment from the
   base .hgr-pub-card above (amber border + amber icon, not blue-bright),
   so it doesn't change that card's hover on About/Contact. */
.hgr-pub-platform-card{
  border:1px solid var(--hp-hairline); background:var(--hp-navy-deep); border-radius:2px; padding:24px;
  display:flex; flex-direction:column;
  transition:border-color .15s, transform .15s, box-shadow .15s;
}
.hgr-pub-platform-card:hover{
  border-color:var(--hp-amber); transform:translateY(-4px); box-shadow:0 16px 30px -18px rgba(18,34,47,.35);
}
.hgr-pub-platform-icon{ color:var(--hp-paper); transition:color .15s; }
.hgr-pub-platform-card:hover .hgr-pub-platform-icon{ color:var(--hp-amber); }
.hgr-pub-platform-code{ font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.1em; color:var(--hp-paper-dim); }
.hgr-pub-platform-name{ margin-top:20px; font-size:19px; }
.hgr-pub-platform-tagline{
  margin-top:4px; font-family:'IBM Plex Mono',monospace; font-size:11px; text-transform:uppercase;
  letter-spacing:.1em; color:var(--hp-amber);
}
.hgr-pub-platform-body{ margin-top:14px; font-size:13.5px; line-height:1.6; color:var(--hp-paper-dim); }
.hgr-pub-platform-uses{ margin-top:18px; padding-top:14px; border-top:1px solid var(--hp-hairline); list-style:none; }
.hgr-pub-platform-uses li{
  display:flex; align-items:center; gap:8px; font-family:'IBM Plex Mono',monospace; font-size:11.5px;
  color:var(--hp-paper-dim); margin-top:8px;
}
.hgr-pub-platform-uses li:first-child{ margin-top:0; }
.hgr-pub-platform-dot{ width:4px; height:4px; background:var(--hp-amber); flex-shrink:0; }

.hgr-pub-pill{
  display:inline-block; font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.08em; text-transform:uppercase;
  padding:4px 10px; border-radius:99px; border:1px solid var(--hp-hairline); color:var(--hp-blue-bright);
}

.hgr-pub-quote{
  margin-top:28px; padding:22px 24px; border-left:3px solid var(--hp-amber); background:rgba(232,163,61,.06);
  border-radius:2px;
}
.hgr-pub-quote p{ font-family:'Space Grotesk',sans-serif; font-size:18px; font-style:italic; line-height:1.4; color:var(--hp-paper); }
.hgr-pub-quote footer{ margin-top:10px; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--hp-amber-bright); }

.hgr-pub-timeline{ display:grid; gap:12px; margin-top:36px; }
@media(min-width:900px){ .hgr-pub-timeline{ grid-template-columns:repeat(5,1fr); } }
.hgr-pub-milestone{ border:1px solid var(--hp-hairline); background:var(--hp-navy-panel); border-radius:2px; padding:18px; text-align:center; }
.hgr-pub-milestone-active{ border-color:rgba(232,163,61,.5); background:rgba(232,163,61,.06); }
.hgr-pub-milestone-dot{ width:10px; height:10px; border-radius:50%; margin:0 auto 12px; background:var(--hp-paper-dim); }
.hgr-pub-milestone-active .hgr-pub-milestone-dot{ background:var(--hp-amber); box-shadow:0 0 8px rgba(232,163,61,.7); }
.hgr-pub-milestone-year{ font-family:'IBM Plex Mono',monospace; font-size:13px; font-weight:700; color:var(--hp-paper-dim); }
.hgr-pub-milestone-active .hgr-pub-milestone-year{ color:var(--hp-amber-bright); }
.hgr-pub-milestone-text{ margin-top:8px; font-size:12.5px; color:var(--hp-paper-dim); line-height:1.5; }
.hgr-pub-milestone-active .hgr-pub-milestone-text{ color:var(--hp-paper); }

.hgr-pub-media{ position:relative; }
.hgr-pub-frame{ position:relative; border-radius:4px; overflow:hidden; border:1px solid var(--hp-hairline); box-shadow:0 30px 60px -20px rgba(0,0,0,.55); }
.hgr-pub-frame img{ display:block; width:100%; height:auto; }
.hgr-pub-frame::after{ content:""; position:absolute; inset:0; background:linear-gradient(180deg, rgba(8,19,31,0) 55%, rgba(8,19,31,.7) 100%); pointer-events:none; }
/* Suppresses that gradient — for a hero image that's already a dark,
   detailed illustration in its own right (icons/labels reach close to the
   bottom edge), the extra darkening was tuned for a lighter photo and
   would just obscure them. */
.hgr-pub-frame-flat::after{ display:none; }
/* Diagram frame — same border/shadow as .hgr-pub-frame, but no dark photo
   gradient (that overlay was tuned to deepen a photo's shadows; over the
   light blueprint-style SVG hero graphic it would just muddy the bottom
   edge) and a light panel background behind the SVG. */
.hgr-pub-diagram-frame{
  position:relative; border-radius:4px; overflow:hidden; border:1px solid var(--hp-hairline);
  box-shadow:0 30px 60px -20px rgba(0,0,0,.25); background:var(--hp-navy-panel);
}
.hgr-pub-diagram-frame svg{ display:block; width:100%; height:auto; }
.hgr-pub-float{
  position:absolute; background:var(--hp-navy-panel); border:1px solid var(--hp-hairline); border-radius:2px;
  padding:10px 14px; backdrop-filter:blur(6px); box-shadow:0 12px 30px -10px rgba(0,0,0,.5);
}
.hgr-pub-float-label{ display:flex; align-items:center; gap:6px; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.05em; text-transform:uppercase; color:var(--hp-paper-dim); }
.hgr-pub-float-value{ margin-top:3px; font-family:'Space Grotesk',sans-serif; font-size:14.5px; font-weight:600; }
.hgr-pub-float-value-blue{ color:var(--hp-blue-bright); }
.hgr-pub-float-value-amber{ color:var(--hp-amber-bright); }
@media(max-width:640px){ .hgr-pub-float{ display:none; } }

.hgr-pub-info-row{ display:flex; align-items:center; gap:10px; font-size:13.5px; color:var(--hp-paper-dim); margin-top:12px; }
.hgr-pub-info-row svg{ color:var(--hp-blue-bright); flex-shrink:0; }

/* Contact form panel + a light touch-up of the shadcn inputs inside it so
   they read as part of this theme instead of the site's default light form
   chrome. Select's portal-rendered dropdown content isn't reachable by this
   scoped selector (Radix renders it to document.body), so its popup keeps
   the site's default styling — a known, minor inconsistency there only. */
.hgr-pub-form-panel{ border:1px solid var(--hp-hairline); background:var(--hp-navy-panel); border-radius:2px; padding:28px; }
.hgr-pub-form-panel label{ color:var(--hp-paper-dim) !important; }
.hgr-pub-form-panel input, .hgr-pub-form-panel textarea, .hgr-pub-form-panel button[data-slot="select-trigger"]{
  background:var(--hp-navy-deep) !important; border-color:var(--hp-hairline) !important; color:var(--hp-paper) !important;
}
.hgr-pub-form-panel input::placeholder, .hgr-pub-form-panel textarea::placeholder{ color:var(--hp-paper-dim) !important; opacity:.7; }
.hgr-pub-form-panel button[type="submit"]{
  background:var(--hp-amber) !important; color:var(--hp-ink) !important; font-family:'IBM Plex Mono',monospace;
}
.hgr-pub-form-panel button[type="submit"]:hover{ background:var(--hp-amber-bright) !important; }

/* ── Shared top nav + footer (matches the-hangar.index.tsx's own nav bar) ──
   Both are dark "islands" on the otherwise white/light-theme page, so the
   white content in between reads clearly against them — locally
   re-override --hp-paper/--hp-paper-dim/--hp-blue-bright/--hp-hairline back
   to their pre-flip (light-on-dark) values (same values the whole theme
   used before going light) instead of the light-theme ones .hgr-pub sets
   at the root. color:var(--hp-paper) on each is load-bearing: children like
   .hgr-pub-navbar-brand/.hgr-pub-footer-brand set their own color already,
   but anything that doesn't would otherwise inherit the page's dark
   (on-white) text color straight through and vanish here. */
.hgr-pub-navbar{
  background:rgba(10,24,38,0.88); backdrop-filter:blur(10px); border-bottom:1px solid var(--hp-hairline);
  color:var(--hp-paper);
  --hp-paper:#ECEFF3; --hp-paper-dim:#8FA5BB; --hp-blue-bright:#6FB4E0; --hp-hairline:rgba(111,180,224,0.20);
}
.hgr-pub-navbar-brand{ display:flex; align-items:center; gap:8px; font-family:'Space Grotesk',sans-serif; font-weight:600; font-size:17px; color:var(--hp-paper); text-decoration:none; }
.hgr-pub-navbar-links{ display:flex; align-items:center; gap:26px; font-family:'IBM Plex Mono',monospace; font-size:12.5px; letter-spacing:.04em; color:var(--hp-paper-dim); }
.hgr-pub-navbar-links a{ text-decoration:none; transition:color .15s; }
.hgr-pub-navbar-links a:hover{ color:var(--hp-blue-bright); }
.hgr-pub-navbar-toggle{ color:var(--hp-paper); }
.hgr-pub-navbar-mobile{
  border-top:1px solid var(--hp-hairline); background:rgba(10,24,38,0.96); backdrop-filter:blur(10px);
  color:var(--hp-paper);
  --hp-paper:#ECEFF3; --hp-paper-dim:#8FA5BB; --hp-blue-bright:#6FB4E0; --hp-hairline:rgba(111,180,224,0.20);
}
.hgr-pub-navbar-mobile a{ font-family:'IBM Plex Mono',monospace; font-size:13px; color:var(--hp-paper-dim); text-decoration:none; }
.hgr-pub-navbar-mobile a:hover{ color:var(--hp-blue-bright); }

/* Single-row footer — exact match of the-hangar.index.tsx's own <footer>
   (.hgr-f-brand/.hgr-f-links/.hgr-f-note), reused here so the public site's
   footer and the Hangar app's footer are the same element, not two designs
   that happen to look similar. */
.hgr-pub-footer{
  background:var(--hp-ink);
  border-top:1px solid var(--hp-hairline); color:var(--hp-paper-dim);
  padding:40px 0;
  --hp-paper:#ECEFF3; --hp-paper-dim:#8FA5BB; --hp-blue-bright:#6FB4E0; --hp-hairline:rgba(111,180,224,0.20);
}
.hgr-pub-footer-row{ display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; }
.hgr-pub-footer-brand{ font-family:'Space Grotesk',sans-serif; font-weight:600; font-size:17px; color:var(--hp-paper); }
.hgr-pub-footer-links{ display:flex; gap:24px; font-size:13px; }
.hgr-pub-footer a{ color:var(--hp-paper-dim); text-decoration:none; }
.hgr-pub-footer a:hover{ color:var(--hp-blue-bright); }
.hgr-pub-footer-note{ font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.03em; }
`;
