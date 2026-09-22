import { isIP } from "node:net";
import { lookup as dnsLookup } from "node:dns/promises";

// Reads the page behind a market-data catalog link so its text can be given to
// the Stage 1 model as background context (MissionAgent.md Section 4.1.1,
// source 6). Server-only.
//
// The address comes from the CATALOG (Hangar_market_data_catalog.source_url,
// written only by whoever curates it), never from a user — a user just ticks a
// row. That is the main protection against the server being tricked into
// fetching something it shouldn't. The rest is defence in depth for a fetch
// that still leaves our network: HTTPS only, no credentials or IP-literal
// hosts, every address (and every redirect hop) checked as public, a hard
// timeout, a hard size cap, and a content-type allow-list. Nothing sensitive is
// sent (no cookies, no auth headers).
//
// The fetched text is UNTRUSTED. It goes to the model labelled as reference data
// (see intentExtraction.ts) and is capped in length; it is not stored beyond a
// summary in the Stage 1 run log.
//
// Known limit: the DNS check and the fetch are two separate lookups, so a host
// that changes its DNS answer between them could slip through. That needs the
// catalog curator to have pointed a row at a hostile domain, so it is accepted
// for curated links; it would need a pinned-address fetch before this accepted
// arbitrary user URLs.

export const MARKET_FETCH_LIMITS = {
  timeoutMs: 8_000,
  maxBytes: 256 * 1024,
  maxChars: 6_000,
  maxRedirects: 3,
} as const;

const ALLOWED_CONTENT_TYPES = [
  /^text\//i,
  /^application\/json/i,
  /^application\/(xml|xhtml\+xml)/i,
  /^application\/csv/i,
];

// ── Address checks (pure) ────────────────────────────────────────────────

function isPrivateV4(ip: string): boolean {
  const [a, b, c] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    a === 127 ||
    (a === 169 && b === 254) || // link-local, incl. cloud metadata 169.254.169.254
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // multicast and reserved
  );
}

// True for anything that is not a plain public unicast address — and for
// anything that isn't an IP at all, so a bad value can never pass as "public".
export function isPrivateIp(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return isPrivateV4(ip);
  if (kind === 6) {
    const l = ip.toLowerCase();
    if (l === "::" || l === "::1") return true;
    const dotted = l.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (dotted) return isPrivateV4(dotted[1]);
    const hex = l.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hex) {
      const hi = parseInt(hex[1], 16);
      const lo = parseInt(hex[2], 16);
      return isPrivateV4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
    }
    const first = parseInt(l.split(":")[0] || "0", 16);
    return (first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80; // fc00::/7, fe80::/10
  }
  return true;
}

export type UrlCheck = { ok: true; url: URL } | { ok: false; reason: string };

export function validateMarketUrl(raw: string): UrlCheck {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "not a valid URL" };
  }
  if (url.protocol !== "https:") return { ok: false, reason: "only https links are allowed" };
  if (url.username || url.password) return { ok: false, reason: "credentials in a link are not allowed" };
  if (url.port && url.port !== "443") return { ok: false, reason: "only the standard https port is allowed" };
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) return { ok: false, reason: "missing host" };
  if (isIP(host) !== 0) return { ok: false, reason: "an IP address is not allowed as the host" };
  if (host === "localhost" || /\.(localhost|local|internal|lan|home)$/.test(host) || !host.includes(".")) {
    return { ok: false, reason: "not a public hostname" };
  }
  return { ok: true, url };
}

// ── Text extraction (pure) ───────────────────────────────────────────────

export function htmlToText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateText(text: string, max: number): { text: string; truncated: boolean } {
  return text.length <= max ? { text, truncated: false } : { text: text.slice(0, max), truncated: true };
}

// ── The fetch ────────────────────────────────────────────────────────────

export interface MarketFetchResult {
  status: "ok" | "failed";
  /** Why it failed, in a form safe to show/log (never internal detail). */
  reason?: string;
  text: string;
  truncated: boolean;
}

export interface FetchDeps {
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  lookupAll: (host: string) => Promise<{ address: string }[]>;
}

const realDeps: FetchDeps = {
  fetch: (url, init) => fetch(url, init),
  lookupAll: (host) => dnsLookup(host, { all: true }),
};

const failed = (reason: string): MarketFetchResult => ({ status: "failed", reason, text: "", truncated: false });

async function readCapped(res: Response, maxBytes: number): Promise<{ text: string; capped: boolean }> {
  const reader = res.body?.getReader();
  if (!reader) {
    const whole = await res.text();
    return { text: whole.slice(0, maxBytes), capped: whole.length > maxBytes };
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  let capped = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > maxBytes) {
      chunks.push(value.slice(0, value.length - (total - maxBytes)));
      capped = true;
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  return { text: new TextDecoder("utf-8", { fatal: false }).decode(bytes), capped };
}

// Never throws: a link that can't be read must not fail the mission, it just
// contributes nothing beyond the row's own name and description.
export async function fetchMarketDataText(
  rawUrl: string,
  deps: Partial<FetchDeps> = {},
): Promise<MarketFetchResult> {
  const { fetch: doFetch, lookupAll } = { ...realDeps, ...deps };
  const first = validateMarketUrl(rawUrl);
  if (!first.ok) return failed(first.reason);

  try {
    let current = first.url;
    for (let hop = 0; hop <= MARKET_FETCH_LIMITS.maxRedirects; hop++) {
      const addresses = await lookupAll(current.hostname);
      if (addresses.length === 0 || addresses.some((a) => isPrivateIp(a.address))) {
        return failed("the host does not resolve to a public address");
      }
      const res = await doFetch(current.toString(), {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(MARKET_FETCH_LIMITS.timeoutMs),
        headers: {
          "User-Agent": "TorqWings-Hangar-MissionAgent/1.0",
          Accept: "text/html,text/plain,application/json,text/csv;q=0.9,*/*;q=0.1",
        },
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) return failed("redirect without a target");
        const next = validateMarketUrl(new URL(location, current).toString());
        if (!next.ok) return failed(`redirect refused: ${next.reason}`);
        current = next.url;
        continue;
      }
      if (!res.ok) return failed(`HTTP ${res.status}`);

      const type = res.headers.get("content-type") ?? "";
      if (!ALLOWED_CONTENT_TYPES.some((p) => p.test(type))) {
        return failed(`unsupported content type (${type.split(";")[0] || "unknown"})`);
      }
      const { text: body, capped } = await readCapped(res, MARKET_FETCH_LIMITS.maxBytes);
      const plain = /html/i.test(type) ? htmlToText(body) : body.replace(/\s+/g, " ").trim();
      if (!plain) return failed("the page had no readable text");
      const { text, truncated } = truncateText(plain, MARKET_FETCH_LIMITS.maxChars);
      return { status: "ok", text, truncated: truncated || capped };
    }
    return failed("too many redirects");
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    return failed(name === "TimeoutError" || name === "AbortError" ? "timed out" : "could not be fetched");
  }
}
