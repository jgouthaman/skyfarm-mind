// Single-row footer, matching the-hangar.index.tsx's own <footer> exactly
// (brand · links · location note) — one design, not two that look similar.
export function Footer() {
  return (
    <footer className="hgr-pub-footer">
      <div className="mx-auto max-w-6xl px-5 lg:px-8 hgr-pub-footer-row">
        <div className="hgr-pub-footer-brand">TORQWINGS</div>
        <div className="hgr-pub-footer-links">
          <a href="https://torqwings.com">torqwings.com</a>
          <a href="https://www.linkedin.com/company/torqwings" target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <a href="https://instagram.com/torqwings.official" target="_blank" rel="noopener noreferrer">Instagram</a>
        </div>
        <div className="hgr-pub-footer-note">CHENNAI, IN — AEROSPACE INTELLIGENCE</div>
      </div>
    </footer>
  );
}
