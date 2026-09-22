// Manual verification script for marketDataFetch.ts. No real network: the fetch
// and the DNS lookup are injected, so the hostile cases (internal addresses,
// redirect tricks, oversized or wrong-type pages) can be exercised safely.
// Run directly:
//
//   node src/lib/the-hangar/marketDataFetch.manualtest.ts
import {
  MARKET_FETCH_LIMITS,
  fetchMarketDataText,
  htmlToText,
  isPrivateIp,
  truncateText,
  validateMarketUrl,
} from "./marketDataFetch.ts";

let passCount = 0;
let failCount = 0;

function check(name: string, actual: unknown, expected: unknown): void {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
  if (!pass) {
    console.log(`      expected: ${JSON.stringify(expected)}`);
    console.log(`      actual:   ${JSON.stringify(actual)}`);
  }
  if (pass) passCount++;
  else failCount++;
}

console.log("--- isPrivateIp: only plain public addresses pass ---");
for (const ip of [
  "10.0.0.1", "127.0.0.1", "169.254.169.254", "172.16.0.1", "172.31.255.255", "192.168.1.1",
  "100.64.0.1", "0.0.0.0", "224.0.0.1", "255.255.255.255", "192.0.0.1", "198.18.0.1",
  "::1", "::", "fc00::1", "fd12:3456::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:10.0.0.5",
  "not-an-ip", "",
]) {
  check(`private/blocked: ${ip || "(empty)"}`, isPrivateIp(ip), true);
}
for (const ip of ["8.8.8.8", "93.184.216.34", "172.32.0.1", "100.128.0.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"]) {
  check(`public: ${ip}`, isPrivateIp(ip), false);
}

console.log("\n--- validateMarketUrl ---");
check("a normal https link is accepted", validateMarketUrl("https://example.com/data/rates.html").ok, true);
check("...with a path, query and the default port", validateMarketUrl("https://data.example.org:443/a?b=1").ok, true);
const bad: [string, string][] = [
  ["http://example.com/x", "http is refused"],
  ["ftp://example.com/x", "ftp is refused"],
  ["javascript:alert(1)", "javascript: is refused"],
  ["file:///etc/passwd", "file: is refused"],
  ["https://user:pass@example.com/", "credentials are refused"],
  ["https://example.com:8443/", "a non-standard port is refused"],
  ["https://127.0.0.1/", "an IPv4 literal is refused"],
  ["https://169.254.169.254/latest/meta-data/", "the cloud-metadata address is refused"],
  ["https://[::1]/", "an IPv6 literal is refused"],
  ["https://localhost/", "localhost is refused"],
  ["https://app.localhost/", "*.localhost is refused"],
  ["https://db.internal/", "*.internal is refused"],
  ["https://printer.local/", "*.local is refused"],
  ["https://intranet/", "a single-label host is refused"],
  ["not a url", "garbage is refused"],
  ["", "empty is refused"],
];
for (const [url, name] of bad) check(name, validateMarketUrl(url).ok, false);

console.log("\n--- text extraction ---");
check(
  "html: scripts, styles, comments and tags are removed; entities decoded; whitespace collapsed",
  htmlToText("<html><head><style>p{color:red}</style><script>evil()</script></head><body><!-- c --><h1>Rates &amp; costs</h1>\n<p>Rs&nbsp;5   per acre</p></body></html>"),
  "Rates & costs Rs 5 per acre",
);
check("truncateText leaves short text alone", truncateText("abc", 10), { text: "abc", truncated: false });
check("truncateText cuts long text and says so", truncateText("abcdef", 3), { text: "abc", truncated: true });

console.log("\n--- fetchMarketDataText (injected network) ---");

const PUBLIC = async () => [{ address: "93.184.216.34" }];
type Call = { url: string; init: RequestInit };
function server(routes: Record<string, () => Response>) {
  const calls: Call[] = [];
  return {
    calls,
    fetch: async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      const route = routes[url];
      if (!route) return new Response("not found", { status: 404 });
      return route();
    },
  };
}
const html = (body: string, type = "text/html; charset=utf-8") => () => new Response(body, { status: 200, headers: { "content-type": type } });
const redirect = (to: string, status = 302) => () => new Response(null, { status, headers: { location: to } });

let s = server({ "https://example.com/rates": html("<body><script>x()</script><p>Spraying: Rs 300 per acre</p></body>") });
let r = await fetchMarketDataText("https://example.com/rates", { fetch: s.fetch, lookupAll: PUBLIC });
check("a normal page is read as plain text", [r.status, r.text, r.truncated], ["ok", "Spraying: Rs 300 per acre", false]);
check("the request sends no cookies or auth, doesn't follow redirects itself, and has a timeout", [
  s.calls[0].init.redirect,
  s.calls[0].init.signal instanceof AbortSignal,
  Object.keys(s.calls[0].init.headers as Record<string, string>).map((k) => k.toLowerCase()).sort(),
], ["manual", true, ["accept", "user-agent"]]);

s = server({ "https://example.com/data.json": html('{"rate": 300}', "application/json") });
r = await fetchMarketDataText("https://example.com/data.json", { fetch: s.fetch, lookupAll: PUBLIC });
check("json is read as-is", [r.status, r.text], ["ok", '{"rate": 300}']);

s = server({});
r = await fetchMarketDataText("http://example.com/x", { fetch: s.fetch, lookupAll: PUBLIC });
check("an http link is refused before any request is made", [r.status, s.calls.length], ["failed", 0]);

r = await fetchMarketDataText("https://example.com/x", { fetch: s.fetch, lookupAll: async () => [{ address: "10.0.0.7" }] });
check("a host that resolves to a private address is refused, with no request made", [r.status, r.reason, s.calls.length], ["failed", "the host does not resolve to a public address", 0]);

r = await fetchMarketDataText("https://example.com/x", { fetch: s.fetch, lookupAll: async () => [{ address: "93.184.216.34" }, { address: "169.254.169.254" }] });
check("a host with ANY private address among its answers is refused", [r.status, s.calls.length], ["failed", 0]);

r = await fetchMarketDataText("https://example.com/x", { fetch: s.fetch, lookupAll: async () => [] });
check("a host that resolves to nothing is refused", r.status, "failed");

s = server({
  "https://example.com/old": redirect("https://www.example.com/new"),
  "https://www.example.com/new": html("<p>moved here</p>"),
});
r = await fetchMarketDataText("https://example.com/old", { fetch: s.fetch, lookupAll: PUBLIC });
check("a redirect to another public https page is followed", [r.status, r.text], ["ok", "moved here"]);

s = server({ "https://example.com/old": redirect("http://example.com/plain") });
r = await fetchMarketDataText("https://example.com/old", { fetch: s.fetch, lookupAll: PUBLIC });
check("a redirect down to http is refused", [r.status, r.reason], ["failed", "redirect refused: only https links are allowed"]);

s = server({ "https://example.com/old": redirect("https://169.254.169.254/latest/meta-data/") });
r = await fetchMarketDataText("https://example.com/old", { fetch: s.fetch, lookupAll: PUBLIC });
check("a redirect to the cloud-metadata address is refused (and never requested)", [r.status, s.calls.length], ["failed", 1]);

s = server({ "https://example.com/old": redirect("https://internal.example.com/secret") });
r = await fetchMarketDataText("https://example.com/old", {
  fetch: s.fetch,
  lookupAll: async (host) => (host === "internal.example.com" ? [{ address: "10.1.2.3" }] : [{ address: "93.184.216.34" }]),
});
check("a redirect to a host that resolves privately is refused (and never requested)", [r.status, s.calls.map((c) => c.url)], ["failed", ["https://example.com/old"]]);

s = server({
  "https://example.com/a": redirect("https://example.com/b"),
  "https://example.com/b": redirect("https://example.com/c"),
  "https://example.com/c": redirect("https://example.com/d"),
  "https://example.com/d": redirect("https://example.com/e"),
  "https://example.com/e": html("too far"),
});
r = await fetchMarketDataText("https://example.com/a", { fetch: s.fetch, lookupAll: PUBLIC });
check(`more than ${MARKET_FETCH_LIMITS.maxRedirects} redirects is refused`, [r.status, r.reason], ["failed", "too many redirects"]);

s = server({ "https://example.com/gone": () => new Response("nope", { status: 404 }) });
r = await fetchMarketDataText("https://example.com/gone", { fetch: s.fetch, lookupAll: PUBLIC });
check("an error status fails cleanly", [r.status, r.reason], ["failed", "HTTP 404"]);

s = server({ "https://example.com/pic": html("binary", "image/png") });
r = await fetchMarketDataText("https://example.com/pic", { fetch: s.fetch, lookupAll: PUBLIC });
check("a wrong content type (image) is refused", [r.status, r.reason], ["failed", "unsupported content type (image/png)"]);

s = server({ "https://example.com/pdf": html("%PDF", "application/pdf") });
r = await fetchMarketDataText("https://example.com/pdf", { fetch: s.fetch, lookupAll: PUBLIC });
check("a pdf is refused (not supported yet)", r.status, "failed");

s = server({ "https://example.com/empty": html("<script>only()</script>") });
r = await fetchMarketDataText("https://example.com/empty", { fetch: s.fetch, lookupAll: PUBLIC });
check("a page with no readable text fails cleanly", [r.status, r.reason], ["failed", "the page had no readable text"]);

s = server({ "https://example.com/big": html("word ".repeat(80_000)) }); // ~400 KB
r = await fetchMarketDataText("https://example.com/big", { fetch: s.fetch, lookupAll: PUBLIC });
check(`a huge page is cut to ${MARKET_FETCH_LIMITS.maxChars} characters and flagged truncated`, [r.status, r.text.length, r.truncated], ["ok", MARKET_FETCH_LIMITS.maxChars, true]);

r = await fetchMarketDataText("https://example.com/x", {
  fetch: async () => { throw Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" }); },
  lookupAll: PUBLIC,
});
check("a timeout fails cleanly as 'timed out'", [r.status, r.reason], ["failed", "timed out"]);

r = await fetchMarketDataText("https://example.com/x", {
  fetch: async () => { throw new Error("connect ECONNREFUSED 10.0.0.9:443 (internal detail)"); },
  lookupAll: PUBLIC,
});
check("any other network error is reported generically, without internal detail", [r.status, r.reason], ["failed", "could not be fetched"]);

r = await fetchMarketDataText("https://example.com/x", { fetch: s.fetch, lookupAll: async () => { throw new Error("ENOTFOUND"); } });
check("a DNS failure never throws", [r.status, r.reason], ["failed", "could not be fetched"]);

console.log(`\n${passCount} passed, ${failCount} failed`);
if (failCount > 0) process.exit(1);
