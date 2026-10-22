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
// Static path, with `bay` in the request body -- NOT /api/harness/call/$bay.
// A dynamic path segment on this route 404s live on Vercel's production
// target specifically (confirmed working on Preview, confirmed correct in
// the compiled build output, confirmed correct via direct invocation of
// the compiled function locally with NODE_ENV=production -- yet still
// 404s on the live production edge). Every other working API route in
// this codebase is a static path with no dynamic segment; every dynamic
// segment in the app is on a page route, never a server route. This
// follows that proven-working pattern instead of fighting the platform.
export const Route = createFileRoute("/api/harness/call")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const baseUrl = process.env.TH_VERCEL_FUNCTIONS_URL;
        if (!baseUrl) {
          return Response.json({ error: "TH_VERCEL_FUNCTIONS_URL is not configured" }, { status: 500 });
        }

        let body: { bay?: string; function_name?: string; payload?: unknown };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        if (!body.bay) {
          return Response.json({ error: "Request must include `bay`" }, { status: 400 });
        }

        let upstream: Response;
        try {
          upstream = await fetch(`${baseUrl.replace(/\/$/, "")}/api/th/${body.bay}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ function_name: body.function_name, payload: body.payload }),
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
