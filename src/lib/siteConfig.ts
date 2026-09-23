// Single source of truth for the public site's canonical host. Vercel's
// project domain settings already 301/308-redirect the apex
// (torqwings.com) to www (confirmed live: `curl -sIL https://torqwings.com/`
// -> 308 -> https://www.torqwings.com/) — so www is the real canonical
// host already, not the apex. Every absolute URL in <head> tags (canonical,
// og:url, og:image, JSON-LD) should point here, matching what's actually
// being served, instead of the apex URLs used inconsistently before this
// fix (which just meant search engines indexed a URL that immediately
// redirects, rather than the final one).
export const SITE_URL = "https://www.torqwings.com";
export const OG_IMAGE_URL = `${SITE_URL}/og-image.png`;

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
