// Shared chrome for The Hangar's public marketing pages (Home, Agents, How
// it works, Stack) — the nav bar, the Flight Deck sign-in modal, the
// footer, and the theme CSS they all share. Was previously all inlined in
// the-hangar.index.tsx as one long scrolling page (Hero → Stats → Gate →
// Agents → How it works → Stack → Footer); split into real routes so
// Agents/How it works/Stack are their own pages instead of #anchor-scroll
// sections of one long one. Centralizing this here means the 4 pages stay
// visually and behaviorally identical instead of drifting from 4 pasted
// copies of the same nav/footer/modal.
import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { Plane } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type HangarNavKey = "home" | "agents" | "how" | "stack";

const NAV_ITEMS: { key: HangarNavKey; label: string; to: string }[] = [
  { key: "agents", label: "Agents",       to: "/the-hangar/agents" },
  { key: "how",    label: "How it works", to: "/the-hangar/how-it-works" },
  { key: "stack",  label: "Stack",        to: "/the-hangar/stack" },
];

type FlightDeckStatus = "form" | "submitting" | "denied" | "success";

// All of the Flight Deck sign-in modal's state and the real Supabase
// signInWithPassword() call, exactly as the-hangar.index.tsx originally had
// it — moved here so every page that shows the modal (all four) shares one
// implementation, not four copies that could quietly diverge.
export function useFlightDeck() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<FlightDeckStatus>("form");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  function openFlightDeck() {
    setModalOpen(true);
    setStatus("form");
    setErrorMessage(null);
    setEmail("");
    setPassword("");
    setTimeout(() => emailRef.current?.focus(), 150);
  }

  function closeFlightDeck() {
    setModalOpen(false);
    setStatus("form");
  }

  async function submitFlightDeck(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    setStatus("submitting");
    setErrorMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: normalizedPassword,
    });

    if (error) {
      setStatus("denied");
      setErrorMessage(error.message);
      return;
    }

    setStatus("success");
    sessionStorage.setItem("hangar_session", "granted");
    setTimeout(() => navigate({ to: "/the-hangar/welcome" }), 1100);
  }

  useEffect(() => {
    if (!modalOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeFlightDeck();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [modalOpen]);

  // Editing either field after a "denied" result clears the error back to
  // the plain form state — same as the original inline handlers had it.
  function updateEmail(value: string) {
    setEmail(value);
    setStatus("form");
    setErrorMessage(null);
  }
  function updatePassword(value: string) {
    setPassword(value);
    setStatus("form");
    setErrorMessage(null);
  }

  return {
    modalOpen, email, password, status, errorMessage, emailRef,
    setEmail: updateEmail, setPassword: updatePassword,
    openFlightDeck, closeFlightDeck, submitFlightDeck,
  };
}

// Brand on the left; nav links + Flight Deck button grouped together on the
// right (.hgr-nav-right) — same right-aligned pattern as the main site's
// Navbar.tsx (brand left, everything else right via justify-content:
// space-between across exactly two children), instead of the old 3-way
// split that put the links awkwardly in the middle. The three section
// links are now real page routes, not #anchor scrolls into one long page.
export function HangarNav({
  current, onOpenFlightDeck,
}: {
  current: HangarNavKey;
  onOpenFlightDeck: () => void;
}) {
  return (
    <nav>
      <div className="hgr-wrap">
        {/* Same round logo icon as the main site's Navbar.tsx brand, reused
            verbatim (bg-gradient-primary/shadow-glow are global Tailwind
            utilities, not scoped to .hgr-pub, so they work here too) so
            this header matches instead of being text-only. */}
        <Link to="/the-hangar" className="hgr-brand" style={{ textDecoration: "none" }}>
          <span className="grid place-items-center h-8 w-8 rounded-lg bg-gradient-primary shadow-glow">
            <Plane className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
          </span>
          <span className="hgr-torq">TORQWINGS</span><span className="hgr-sep">/</span><span className="hgr-hangar-word">The Hangar</span>
        </Link>
        <div className="hgr-nav-right">
          <div className="hgr-navlinks">
            <Link to="/">Home</Link>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                to={item.to}
                aria-current={current === item.key ? "page" : undefined}
                className={current === item.key ? "hgr-navlink-active" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </div>
          {/* Always the signed-out "Flight Deck" state on these marketing
              pages, regardless of whatever Supabase session already exists
              underneath (e.g. a return visit) — bay pages (welcome,
              mission, etc.) still read and honor that real session as
              usual; these pages just never reflect it in their own nav. */}
          <button
            type="button"
            className="hgr-btn hgr-btn-ghost"
            aria-label="Sign in to your TorqWings account"
            title="Sign in"
            onClick={onOpenFlightDeck}
          >
            Flight Deck
          </button>
        </div>
      </div>
    </nav>
  );
}

export function HangarFooter() {
  return (
    <footer>
      <div className="hgr-wrap">
        {/* Same three spans/classes as HangarNav's brand (.hgr-torq/.hgr-sep/
            .hgr-hangar-word) — one lockup, rendered identically in both
            places, not two separately-styled copies of the same text. */}
        <div className="hgr-f-brand">
          <span className="hgr-torq">TORQWINGS</span><span className="hgr-sep">/</span><span className="hgr-hangar-word">The Hangar</span>
        </div>
        <div className="hgr-f-links">
          <a href="https://torqwings.com">torqwings.com</a>
          <a href="https://linkedin.com/company/torqwings">LinkedIn</a>
          <a href="https://instagram.com/torqwings.official">Instagram</a>
        </div>
        <div className="hgr-f-note">CHENNAI, IN — AEROSPACE INTELLIGENCE</div>
      </div>
    </footer>
  );
}

export function FlightDeckModal({
  modalOpen, email, password, status, errorMessage, emailRef,
  setEmail, setPassword, closeFlightDeck, submitFlightDeck,
}: ReturnType<typeof useFlightDeck>) {
  return (
    <div
      className={`hgr-fd-overlay${modalOpen ? " open" : ""}`}
      aria-hidden={!modalOpen}
      onClick={(e) => { if (e.target === e.currentTarget) closeFlightDeck(); }}
    >
      <div className="hgr-fd-panel" role="dialog" aria-modal="true" aria-labelledby="fdTitle">
        <span className="hgr-corner hgr-corner-tl" /><span className="hgr-corner hgr-corner-tr" />
        <span className="hgr-corner hgr-corner-bl" /><span className="hgr-corner hgr-corner-br" />
        <button type="button" className="hgr-fd-close" onClick={closeFlightDeck} aria-label="Close">✕ CLOSE</button>

        {status !== "success" ? (
          <div>
            <div className="hgr-fd-eyebrow">Flight Deck</div>
            <h3 id="fdTitle">Enter the Hangar</h3>
            <p className="hgr-fd-sub">Sign in with your TorqWings clearance to reach your workspace.</p>

            <form onSubmit={submitFlightDeck}>
              <div className="hgr-fd-field">
                <label htmlFor="fdEmail">Email</label>
                <input
                  ref={emailRef}
                  type="email" id="fdEmail" required placeholder="you@torqwings.com" autoComplete="username"
                  value={email}
                  disabled={status === "submitting"}
                  onChange={(e) => { setEmail(e.target.value); }}
                />
              </div>
              <div className="hgr-fd-field">
                <label htmlFor="fdPass">Access code</label>
                <input
                  type="password" id="fdPass" required placeholder="••••••••" autoComplete="current-password"
                  value={password}
                  disabled={status === "submitting"}
                  onChange={(e) => { setPassword(e.target.value); }}
                />
              </div>
              {status === "denied" && (
                <div style={{ color: "var(--hgr-amber)", fontSize: 12.5, fontFamily: "'IBM Plex Mono',monospace", marginBottom: 14 }}>
                  ACCESS DENIED — {errorMessage ?? "check email and access code."}
                </div>
              )}
              <button
                type="submit"
                className="hgr-btn hgr-btn-amber hgr-fd-submit"
                disabled={status === "submitting"}
              >
                {status === "submitting" ? "Signing in…" : "Enter The Hangar →"}
              </button>
            </form>

            <div className="hgr-fd-foot">New here? <a href="#access" onClick={closeFlightDeck}>Request early access</a></div>
          </div>
        ) : (
          <div className="hgr-fd-success" style={{ display: "block" }}>
            <div className="hgr-fd-success-badge">✓</div>
            <h3>Access Granted</h3>
            <p>Taking you into the Hangar…</p>
          </div>
        )}
      </div>
    </div>
  );
}

// "Request Early Access" lead-capture modal (Hero CTA on the-hangar.index.tsx).
// Hangar_early_access isn't in the generated Supabase types (no Hangar_*
// table is — see conceptPersistence.ts/missionPersistence.ts, which cast
// around the same gap), so the insert shape is typed locally and the
// client cast narrowly to just the method this needs, same convention.
interface EarlyAccessInsert {
  name: string;
  email: string;
  mobile_number: string;
  profession: string | null;
  company: string | null;
  country: string | null;
}
const earlyAccessDb = supabase as unknown as {
  from: (table: "Hangar_early_access") => {
    insert: (row: EarlyAccessInsert) => Promise<{ error: { message: string } | null }>;
  };
};

type EarlyAccessStatus = "form" | "submitting" | "error" | "success";

export function useEarlyAccess() {
  const [modalOpen, setModalOpen] = useState(false);
  const [status, setStatus] = useState<EarlyAccessStatus>("form");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  function openEarlyAccess() {
    setModalOpen(true);
    setStatus("form");
    setErrorMessage(null);
    setTimeout(() => nameRef.current?.focus(), 150);
  }

  function closeEarlyAccess() {
    setModalOpen(false);
    setStatus("form");
  }

  async function submitEarlyAccess(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setErrorMessage(null);

    const fd = new FormData(e.currentTarget);
    // status is never collected from the form — the column's own DB
    // default ('Requested') is the only value this insert can produce.
    const payload: EarlyAccessInsert = {
      name: String(fd.get("name") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      mobile_number: String(fd.get("mobile") ?? "").trim(),
      profession: String(fd.get("profession") ?? "").trim() || null,
      company: String(fd.get("company") ?? "").trim() || null,
      country: String(fd.get("country") ?? "").trim() || null,
    };

    // try/catch: the client can reject outright (a 404 — e.g. this
    // migration not yet applied — a network failure) rather than resolve
    // with {error}, and without this the status would stay stuck on
    // "submitting" forever with no way to recover.
    try {
      const { error } = await earlyAccessDb.from("Hangar_early_access").insert(payload);
      if (error) throw error;
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "please try again.");
    }
  }

  useEffect(() => {
    if (!modalOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeEarlyAccess();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [modalOpen]);

  return { modalOpen, status, errorMessage, nameRef, openEarlyAccess, closeEarlyAccess, submitEarlyAccess };
}

// Same floating glassy panel as the Flight Deck modal (.hgr-fd-overlay's
// backdrop-blur + bordered navy panel) — reused directly rather than a
// second copy of the same chrome, just with this form's own fields.
export function EarlyAccessModal({
  modalOpen, status, errorMessage, nameRef, closeEarlyAccess, submitEarlyAccess,
}: ReturnType<typeof useEarlyAccess>) {
  return (
    <div
      className={`hgr-fd-overlay${modalOpen ? " open" : ""}`}
      aria-hidden={!modalOpen}
      onClick={(e) => { if (e.target === e.currentTarget) closeEarlyAccess(); }}
    >
      <div className="hgr-fd-panel hgr-ea-panel" role="dialog" aria-modal="true" aria-labelledby="eaTitle">
        <span className="hgr-corner hgr-corner-tl" /><span className="hgr-corner hgr-corner-tr" />
        <span className="hgr-corner hgr-corner-bl" /><span className="hgr-corner hgr-corner-br" />
        <button type="button" className="hgr-fd-close" onClick={closeEarlyAccess} aria-label="Close">✕ CLOSE</button>

        {status !== "success" ? (
          <div>
            <div className="hgr-fd-eyebrow">Early Access</div>
            <h3 id="eaTitle">Request access to The Hangar</h3>
            <p className="hgr-fd-sub">Tell us a bit about you — we'll reach out as spots open up.</p>

            <form onSubmit={submitEarlyAccess}>
              <div className="hgr-ea-grid">
                <div className="hgr-fd-field">
                  <label htmlFor="eaName">Name</label>
                  <input ref={nameRef} type="text" id="eaName" name="name" required placeholder="Your full name" disabled={status === "submitting"} />
                </div>
                <div className="hgr-fd-field">
                  <label htmlFor="eaEmail">Email</label>
                  <input type="email" id="eaEmail" name="email" required placeholder="you@company.com" disabled={status === "submitting"} />
                </div>
                <div className="hgr-fd-field">
                  <label htmlFor="eaMobile">Mobile number</label>
                  <input type="tel" id="eaMobile" name="mobile" required placeholder="+91 ..." disabled={status === "submitting"} />
                </div>
                <div className="hgr-fd-field">
                  <label htmlFor="eaProfession">Profession</label>
                  <input type="text" id="eaProfession" name="profession" placeholder="e.g. Aerospace Engineer" disabled={status === "submitting"} />
                </div>
                <div className="hgr-fd-field">
                  <label htmlFor="eaCompany">Company</label>
                  <input type="text" id="eaCompany" name="company" placeholder="Company / Institution" disabled={status === "submitting"} />
                </div>
                <div className="hgr-fd-field">
                  <label htmlFor="eaCountry">Country</label>
                  <input type="text" id="eaCountry" name="country" placeholder="Country" disabled={status === "submitting"} />
                </div>
              </div>
              {status === "error" && (
                <div style={{ color: "var(--hgr-amber)", fontSize: 12.5, fontFamily: "'IBM Plex Mono',monospace", marginBottom: 14 }}>
                  COULDN'T SUBMIT — {errorMessage ?? "please try again."}
                </div>
              )}
              <button type="submit" className="hgr-btn hgr-btn-amber hgr-fd-submit" disabled={status === "submitting"}>
                {status === "submitting" ? "Submitting…" : "Request Access →"}
              </button>
            </form>
          </div>
        ) : (
          <div className="hgr-fd-success" style={{ display: "block" }}>
            <div className="hgr-fd-success-badge">✓</div>
            <h3>Request received</h3>
            <p>We'll be in touch as early access opens up.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export const HGR_LANDING_CSS = `
.hgr-landing{
  /* Light theme: white page background, blue grid/hairlines. --hgr-navy-deep
     stays the name of the "page background" variable (white now) so every
     background:var(--hgr-navy-deep) below still means "page background"
     without touching each rule — but it's no longer safe to reuse for TEXT
     color, since that text would vanish on the now-white background. Where
     the old CSS used it that way (amber button text, selected-text color),
     it's replaced with the new --hgr-ink, a fixed dark color kept stable
     across themes for exactly that purpose. */
  --hgr-navy-deep:#FFFFFF;
  --hgr-navy-panel:#F2F7FB;
  --hgr-navy-panel-2:#E4EEF7;
  --hgr-blue-line:#3E7CA6;
  --hgr-blue-bright:#1C74B8;
  --hgr-amber:#E8A33D;
  --hgr-amber-bright:#F6C374;
  --hgr-paper:#12222F;
  --hgr-paper-dim:#4F6B80;
  --hgr-ink:#0A1826;
  --hgr-grid:rgba(62,124,166,0.14);
  --hgr-hairline:rgba(62,124,166,0.28);

  background:var(--hgr-navy-deep);
  color:var(--hgr-paper);
  font-family:'IBM Plex Sans', sans-serif;
  line-height:1.5;
  background-image:
    linear-gradient(var(--hgr-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--hgr-grid) 1px, transparent 1px);
  background-size: 48px 48px;
  min-height:100vh;
  display:flex; flex-direction:column;
}
.hgr-landing *{ box-sizing:border-box; }
.hgr-landing h1,.hgr-landing h2,.hgr-landing h3{ font-family:'Space Grotesk', sans-serif; font-weight:600; letter-spacing:-0.01em; margin:0; }
.hgr-mono{ font-family:'IBM Plex Mono', monospace; }
.hgr-landing a{ color:inherit; }
.hgr-wrap{ max-width:1180px; margin:0 auto; padding:0 32px; }
.hgr-landing ::selection{ background:var(--hgr-amber); color:var(--hgr-ink); }
.hgr-landing main{ flex:1; }

@media (prefers-reduced-motion: reduce){
  .hgr-landing *{ animation-duration:0.001ms !important; animation-iteration-count:1 !important; transition-duration:0.001ms !important; }
}

.hgr-landing nav{
  position:sticky; top:0; z-index:50;
  background:rgba(10,24,38,0.92);
  backdrop-filter:blur(10px);
  border-bottom:1px solid var(--hgr-hairline);
  /* Nav is a dark "island" on the otherwise white/light-theme page — reuses
     the exact values the whole page used before the white/blue theme
     change, since they were already tuned for readability against this
     dark navy. color:var(--hgr-paper) here is load-bearing: elements like
     .hgr-hangar-word/.hgr-f-brand set no color of their own, so they'd
     otherwise inherit the page's dark (on-white) text color straight
     through and vanish against this dark background. */
  color:var(--hgr-paper);
  --hgr-paper:#ECEFF3;
  --hgr-paper-dim:#8FA5BB;
  --hgr-blue-bright:#6FB4E0;
  --hgr-hairline:rgba(111,180,224,0.22);
}
.hgr-landing nav .hgr-wrap{ display:flex; align-items:center; justify-content:space-between; height:72px; }
.hgr-brand{ display:flex; align-items:center; gap:10px; font-size:15px; }
.hgr-torq{ color:var(--hgr-paper-dim); font-weight:500; }
.hgr-sep{ color:var(--hgr-blue-line); }
.hgr-hangar-word{ font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:18px; letter-spacing:0.01em; }
.hgr-nav-right{ display:flex; align-items:center; gap:28px; }
.hgr-navlinks{ display:flex; align-items:center; gap:32px; font-size:14px; color:var(--hgr-paper-dim); }
.hgr-navlinks a{ text-decoration:none; transition:color .15s; }
.hgr-navlinks a:hover{ color:var(--hgr-blue-bright); }
.hgr-navlink-active{ color:var(--hgr-blue-bright) !important; }
.hgr-btn{
  display:inline-flex; align-items:center; gap:8px;
  padding:10px 20px; border-radius:2px;
  font-family:'IBM Plex Mono', monospace; font-size:13px; font-weight:500;
  text-decoration:none; border:1px solid transparent; cursor:pointer;
  transition:all .15s;
}
.hgr-btn-amber{ background:var(--hgr-amber); color:var(--hgr-ink); }
.hgr-btn-amber:hover{ background:var(--hgr-amber-bright); }
.hgr-btn:disabled{ opacity:.55; cursor:not-allowed; }
.hgr-btn-ghost{ border-color:var(--hgr-hairline); color:var(--hgr-paper); background:transparent; }
.hgr-btn-ghost:hover{ border-color:var(--hgr-blue-bright); color:var(--hgr-blue-bright); }

.hgr-hero{ position:relative; overflow:hidden; padding-top:64px; }
.hgr-hero-inner{ position:relative; padding:96px 0 80px; text-align:center; }
.hgr-eyebrow{
  display:inline-flex; align-items:center; gap:10px;
  font-family:'IBM Plex Mono',monospace; font-size:12.5px; letter-spacing:0.14em;
  color:var(--hgr-amber); text-transform:uppercase; margin-bottom:28px;
  border:1px solid rgba(232,163,61,0.35); padding:6px 14px; border-radius:2px;
}
.hgr-eyebrow .hgr-dot{ width:6px; height:6px; border-radius:50%; background:var(--hgr-amber); }
.hgr-hero h1{
  font-size:clamp(40px, 6vw, 78px);
  line-height:1.03;
  max-width:920px; margin:0 auto 24px;
}
.hgr-hero h1 .hgr-accent{ color:var(--hgr-blue-bright); }
.hgr-sub{
  max-width:600px; margin:0 auto 40px; color:var(--hgr-paper-dim);
  font-size:18px; line-height:1.6;
}
.hgr-ctas{ display:flex; gap:16px; justify-content:center; flex-wrap:wrap; margin-bottom:64px;}

.hgr-doors{ position:absolute; inset:0; z-index:5; display:flex; pointer-events:none; }
.hgr-door{
  flex:1; background:
    repeating-linear-gradient(90deg, #0C1E30 0 78px, #0A1826 78px 80px);
  position:relative;
}
.hgr-door::after{
  content:""; position:absolute; top:0; bottom:0; width:2px; background:var(--hgr-blue-line); opacity:.5;
}
.hgr-door-left{ animation: hgr-openLeft 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
.hgr-door-right{ animation: hgr-openRight 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
.hgr-door-left::after{ right:0; }
.hgr-door-right::after{ left:0; }
@keyframes hgr-openLeft{ from{ transform:translateX(0);} to{ transform:translateX(-100%);} }
@keyframes hgr-openRight{ from{ transform:translateX(0);} to{ transform:translateX(100%);} }
@media (prefers-reduced-motion: reduce){ .hgr-doors{ display:none; } }

.hgr-bay-id{
  position:absolute; top:120px; right:6%; font-family:'IBM Plex Mono',monospace;
  font-size:12px; color:var(--hgr-paper-dim); text-align:right; line-height:1.7;
  display:none;
}
@media(min-width:900px){ .hgr-bay-id{ display:block; } }

.hgr-stats{ border-top:1px solid var(--hgr-hairline); border-bottom:1px solid var(--hgr-hairline); background:rgba(62,124,166,0.06); }
.hgr-stats .hgr-wrap{ display:grid; grid-template-columns:repeat(4,1fr); }
.hgr-stat{ padding:28px 24px; text-align:center; border-left:1px solid var(--hgr-hairline); }
.hgr-stat:first-child{ border-left:none; }
.hgr-stat .hgr-n{ font-family:'Space Grotesk',sans-serif; font-size:30px; font-weight:700; color:var(--hgr-blue-bright); }
.hgr-stat .hgr-l{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-paper-dim); margin-top:6px; }
@media(max-width:760px){ .hgr-stats .hgr-wrap{ grid-template-columns:1fr 1fr; } .hgr-stat{ border-left:none; border-top:1px solid var(--hgr-hairline); } }

.hgr-landing section{ padding:100px 0; }
.hgr-page-header{ padding:64px 0 0; }
.hgr-section-head{ max-width:640px; margin-bottom:56px; }
.hgr-kicker{ font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--hgr-amber); margin-bottom:14px; }
/* Dark badge-pill variant — the top-of-page kicker on Agents/How it works/
   Stack, matching the main site's .hgr-pub-badge-dark treatment. Not
   applied to .hgr-kicker generally (e.g. Home's "Why gate-then-score"),
   which stays plain amber text. */
.hgr-kicker-badge{
  display:inline-flex; align-items:center; padding:6px 13px; border-radius:2px;
  background:var(--hgr-ink); color:#ECEFF3; border:1px solid rgba(111,180,224,0.35);
}
/* Live badge (Agents page, above the "THE FLEET" tag) — same font/size as
   the section labels (.hgr-bay-group-label): 12px IBM Plex Mono, uppercase,
   .1em tracking. */
.hgr-live-badge{
  display:flex; align-items:center; gap:8px; margin-bottom:14px;
  font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:.1em; text-transform:uppercase;
  color:var(--hgr-paper-dim);
}
.hgr-live-dot{
  width:7px; height:7px; border-radius:50%; background:#22c55e; flex-shrink:0;
  box-shadow:0 0 0 0 rgba(34,197,94,.6); animation:hgr-live-pulse 2s ease-in-out infinite;
}
@keyframes hgr-live-pulse{
  0%{ box-shadow:0 0 0 0 rgba(34,197,94,.5); }
  70%{ box-shadow:0 0 0 6px rgba(34,197,94,0); }
  100%{ box-shadow:0 0 0 0 rgba(34,197,94,0); }
}
@media (prefers-reduced-motion: reduce){ .hgr-live-dot{ animation:none; } }

/* Flow connector — a short vertical rule ending in a chevron, between two
   consecutive workflow groups on the Agents page. */
.hgr-flow-connector{ display:flex; justify-content:center; padding:6px 0; }
.hgr-flow-connector-line{ width:1px; height:32px; background:var(--hgr-hairline); }
.hgr-flow-connector-chevron{
  width:9px; height:9px; margin-top:-5px; border-right:1px solid var(--hgr-hairline); border-bottom:1px solid var(--hgr-hairline);
  transform:rotate(45deg);
}
.hgr-flow-connector-wrap{ display:flex; flex-direction:column; align-items:center; }

/* Muted mono note under a group label (Agents page, Cross-cutting group). */
.hgr-group-note{
  font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.06em; text-transform:uppercase;
  color:var(--hgr-paper-dim); opacity:.75; margin:-12px 0 20px;
}

.hgr-section-head h2{ font-size:clamp(28px,3.4vw,42px); line-height:1.15; margin-bottom:16px; }
.hgr-section-head p{ color:var(--hgr-paper-dim); font-size:16.5px; }


.hgr-bay-group-label{
  font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:.1em; text-transform:uppercase;
  color:var(--hgr-paper-dim); margin:48px 0 20px; display:flex; align-items:center; gap:12px;
}
.hgr-bay-group-label:first-of-type{ margin-top:0; }
.hgr-bay-group-label::after{ content:""; flex:1; height:1px; background:var(--hgr-hairline); }
/* Column count comes from a per-group modifier class (.hgr-bays-N, N = that
   group's card count — see the-hangar.agents.tsx) instead of one fixed
   3-column grid for every group. A fixed grid left genuinely empty cells
   in any group whose count wasn't a multiple of 3 (5 cards, 4 cards, …),
   and since the grid container itself carried the fill colour (visible
   through the 1px gaps), an empty cell showed as a plain coloured block
   with nothing in it. The container no longer has a background or border
   at all — colour comes only from each .hgr-bay card, so a cell that has
   no card simply doesn't exist, empty or otherwise. */
.hgr-bays{ display:grid; grid-template-columns:1fr; gap:12px; }
@media(min-width:600px){ .hgr-bays{ grid-template-columns:repeat(2,1fr); } }
@media(min-width:900px){
  .hgr-bays-2{ grid-template-columns:repeat(2,1fr); }
  .hgr-bays-4{ grid-template-columns:repeat(4,1fr); }
  .hgr-bays-5{ grid-template-columns:repeat(5,1fr); }
}
.hgr-bays-1{ grid-template-columns:1fr !important; }
.hgr-bay{ background:var(--hgr-navy-panel); border:1px solid var(--hgr-hairline); padding:26px 24px; position:relative; transition:background .15s, border-color .15s; }
.hgr-bay:hover{ background:var(--hgr-navy-panel-2); }
.hgr-bay-num{ font-family:'IBM Plex Mono',monospace; color:var(--hgr-amber); font-size:12px; letter-spacing:.06em; margin-bottom:10px; }
.hgr-bay h3{ font-size:17px; margin-bottom:10px; }
.hgr-bay p{ color:var(--hgr-paper-dim); font-size:14px; line-height:1.55; margin:0; }
.hgr-corner{ position:absolute; width:10px; height:10px; border:1px solid var(--hgr-blue-line); opacity:.6; }
.hgr-corner-tl{ top:8px; left:8px; border-right:none; border-bottom:none; }
.hgr-corner-br{ bottom:8px; right:8px; border-left:none; border-top:none; }

.hgr-how{ background:var(--hgr-navy-panel); border-top:1px solid var(--hgr-hairline); border-bottom:1px solid var(--hgr-hairline); }
.hgr-flow-wrap{ overflow-x:auto; padding-bottom:12px; }
.hgr-flow{ display:flex; align-items:center; gap:0; min-width:760px; }
.hgr-flow-node{
  background:var(--hgr-navy-panel); border:1px solid var(--hgr-hairline); border-radius:2px;
  padding:14px 16px; font-size:13px; text-align:center; width:130px; flex-shrink:0;
}
.hgr-flow-n{ font-family:'IBM Plex Mono',monospace; color:var(--hgr-amber); font-size:11px; display:block; margin-bottom:4px; }
.hgr-flow-arrow{ flex:0 0 28px; text-align:center; color:var(--hgr-blue-line); font-size:18px; }

.hgr-stack-list{ display:flex; flex-wrap:wrap; gap:10px; }
.hgr-chip{
  font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-paper-dim);
  border:1px solid var(--hgr-hairline); padding:8px 14px; border-radius:2px;
}

.hgr-cta{ text-align:center; border-top:1px solid var(--hgr-hairline); }
.hgr-cta h2{ font-size:clamp(28px,4vw,44px); max-width:680px; margin:0 auto 16px; }
.hgr-cta p{ color:var(--hgr-paper-dim); margin-bottom:36px; }

.hgr-landing footer{
  border-top:1px solid var(--hgr-hairline); padding:40px 0;
  background:var(--hgr-ink);
  color:var(--hgr-paper);
  --hgr-paper:#ECEFF3;
  --hgr-paper-dim:#8FA5BB;
  --hgr-blue-bright:#6FB4E0;
  --hgr-hairline:rgba(111,180,224,0.22);
}
.hgr-landing footer .hgr-wrap{ display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; }
.hgr-f-brand{ display:flex; align-items:center; gap:10px; font-size:15px; }
.hgr-f-links{ display:flex; gap:24px; font-size:13px; color:var(--hgr-paper-dim); }
.hgr-f-links a{ text-decoration:none; }
.hgr-f-note{ font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--hgr-paper-dim); }

.hgr-fd-overlay{
  position:fixed; inset:0; z-index:200;
  background:rgba(5,13,22,0.72); backdrop-filter:blur(6px);
  display:flex; align-items:center; justify-content:center;
  padding:24px;
  opacity:0; pointer-events:none;
  transition:opacity .2s ease;
}
.hgr-fd-overlay.open{ opacity:1; pointer-events:auto; }
.hgr-fd-panel{
  width:100%; max-width:420px;
  background:var(--hgr-navy-panel);
  border:1px solid var(--hgr-hairline);
  position:relative;
  padding:36px 32px 32px;
  transform:translateY(8px) scale(.98);
  transition:transform .2s ease;
}
.hgr-fd-overlay.open .hgr-fd-panel{ transform:translateY(0) scale(1); }
.hgr-ea-panel{ max-width:520px; }
.hgr-ea-grid{ display:grid; grid-template-columns:1fr; gap:0 16px; }
@media(min-width:520px){ .hgr-ea-grid{ grid-template-columns:1fr 1fr; } }
.hgr-fd-panel .hgr-corner{ width:14px; height:14px; }
.hgr-fd-panel .hgr-corner-tl{ top:-1px; left:-1px; }
.hgr-fd-panel .hgr-corner-tr{ top:-1px; right:-1px; border-left:none; border-right:1px solid var(--hgr-blue-line); border-bottom:none; }
.hgr-fd-panel .hgr-corner-bl{ bottom:-1px; left:-1px; border-right:none; border-bottom:1px solid var(--hgr-blue-line); border-top:none; }
.hgr-fd-panel .hgr-corner-br{ bottom:-1px; right:-1px; border-left:none; border-bottom:1px solid var(--hgr-blue-line); border-top:none; }
.hgr-fd-close{
  position:absolute; top:16px; right:16px;
  background:none; border:none; color:var(--hgr-paper-dim);
  font-family:'IBM Plex Mono',monospace; font-size:13px; cursor:pointer;
  padding:6px; line-height:1;
}
.hgr-fd-close:hover{ color:var(--hgr-paper); }
.hgr-fd-eyebrow{
  font-family:'IBM Plex Mono',monospace; font-size:11.5px; letter-spacing:.12em; text-transform:uppercase;
  color:var(--hgr-amber); margin-bottom:10px;
}
.hgr-fd-panel h3{ font-size:22px; margin-bottom:6px; }
.hgr-fd-sub{ color:var(--hgr-paper-dim); font-size:13.5px; margin-bottom:26px; }
.hgr-fd-field{ margin-bottom:18px; }
.hgr-fd-field label{
  display:block; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em;
  text-transform:uppercase; color:var(--hgr-paper-dim); margin-bottom:8px;
}
.hgr-fd-field input{
  width:100%; background:var(--hgr-navy-deep); border:1px solid var(--hgr-hairline);
  color:var(--hgr-paper); font-family:'IBM Plex Sans',sans-serif; font-size:14.5px;
  padding:12px 14px; border-radius:2px; outline:none;
  transition:border-color .15s;
}
.hgr-fd-field input:focus{ border-color:var(--hgr-blue-bright); }
.hgr-fd-field input:disabled{ opacity:.5; }
.hgr-fd-submit{ width:100%; justify-content:center; margin-top:6px; font-size:13.5px; padding:13px 20px; }
.hgr-fd-foot{ margin-top:20px; text-align:center; font-size:13px; color:var(--hgr-paper-dim); }
.hgr-fd-foot a{ color:var(--hgr-blue-bright); text-decoration:none; }
.hgr-fd-foot a:hover{ text-decoration:underline; }

.hgr-fd-success{ text-align:center; padding:12px 0 4px; }
.hgr-fd-success-badge{
  width:44px; height:44px; border-radius:50%; border:1px solid var(--hgr-blue-line);
  display:flex; align-items:center; justify-content:center; margin:0 auto 18px;
  color:var(--hgr-blue-bright); font-size:20px;
}
.hgr-fd-success h3{ font-size:19px; margin-bottom:8px; }
.hgr-fd-success p{ color:var(--hgr-paper-dim); font-size:13.5px; margin:0; }
`;
