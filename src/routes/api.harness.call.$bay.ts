import { createFileRoute } from "@tanstack/react-router";

// Same-origin proxy for the Test Harness frontend (/t-h) -- the browser
// calls THIS route (same origin, so no CORS is possible), and this route
// makes the actual cross-origin call to the separate th-vercel-functions
// Vercel project, server-to-server. Keeps the Python functions' URL
// entirely server-side (TH_VERCEL_FUNCTIONS_URL, not VITE_-prefixed) and
// matches the original spec's "never called directly from the browser"
// more precisely than the first version of this feature did (which had
// the browser calling th-vercel-functions directly, cross-origin -- CORS-
// prone by construction, not just an origin-list configuration bug).
//
// Path is /api/harness/call/$bay, NOT /api/t-h/... -- confirmed by a clean
// (no-HMR) repro that ANY dynamic-segment route under /api/t-h/* 404s in
// this app, regardless of extra static segments or the param's name,
// while the identical shape under any other prefix works fine. The only
// thing /api/t-h/* has that other prefixes don't is the sibling page
// route group at /t-h (t-h.index.tsx, t-h.login.tsx) -- a dynamic API
// route apparently can't coexist with a page route group sharing its
// first path segment. Using an unrelated prefix avoids it entirely.
export const Route = createFileRoute("/api/harness/call/$bay")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const baseUrl = process.env.TH_VERCEL_FUNCTIONS_URL;
        if (!baseUrl) {
          return Response.json({ error: "TH_VERCEL_FUNCTIONS_URL is not configured" }, { status: 500 });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        let upstream: Response;
        try {
          upstream = await fetch(`${baseUrl.replace(/\/$/, "")}/api/th/${params.bay}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        } catch (err) {
          return Response.json({ error: `Could not reach th-vercel-functions: ${String(err)}` }, { status: 502 });
        }

        const text = await upstream.text();
        return new Response(text, {
          status: upstream.status,
          headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
        });
      },
    },
  },
});
