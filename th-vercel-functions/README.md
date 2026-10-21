# th-vercel-functions

A single Vercel Python function (`api/index.py`, a FastAPI ASGI app) that
exposes one route per Hangar agent — `POST /api/th/<agent-slug>` for all
15 agents — and backs the Test Harness frontend at `/t-h` in the main app.
For every agent route:

1. Receives `{"function_name": str, "payload": any}` as a JSON POST body
   from the browser.
2. Calls that agent's own Google Cloud URL (`TH_GCP_BASE_URL` +
   `/bay<NN>-<slug>/`, e.g. `http://34.100.231.177/Torqwings/bay01-mission/`
   — see `AGENT_BAY_PATHS` in `api/index.py` for all 15) server-to-server
   with `{"agent_name": ..., "function_name": ..., "payload": ...}`,
   authenticated with a shared-secret header.
3. Returns that response back to the browser unchanged.

All 15 agents share the identical code path in `api/index.py` — the
`agent_name` URL path parameter (and the `AGENT_BAY_PATHS` lookup it
drives) is what varies, not a per-agent file. (This was originally built
as 15 separate files, one per agent, following the classic Vercel Python
convention where each `/api/*.py` file is its own auto-routed function —
but this Vercel account's Python runtime rejected that with "No python
entrypoint found... found potential entrypoints" once there was more than
one file defining a `handler`. It expects exactly one entrypoint per
deployment, so this single FastAPI app replaces all 15 files.) It was also
originally one shared GCP endpoint with `agent_name` routed in the request
body, before the actual Google Cloud side turned out to be a per-bay
directory structure (one Apache path per bay) instead — see
`AGENT_BAY_PATHS`. The browser only ever talks to this function; it never
sees `TH_GCP_BASE_URL` or `TH_GCP_SHARED_SECRET`.

This is a **separate Vercel project** from the main TorqWings app, not
mixed into it — the main app's Vercel deployment uses a prebuilt Nitro
Build Output API v3 output, which doesn't auto-detect `/api/*.py` files
alongside it. Deploying this as its own project is the standard,
Vercel-supported way to run Python functions.

**The browser never calls this project directly.** The `/t-h` frontend
calls the main app's own same-origin route (`/api/t-h/$agent`, see
`src/routes/api.t-h.$agent.ts` in the main repo), which proxies
server-to-server to this project. This avoids browser CORS entirely
(there's no cross-origin request to allow in the first place) and matches
the original spec's "never called directly from the browser" more
precisely than an earlier version of this project, which had the browser
calling this project's URL directly.

## Deploy

1. `vercel link` (or import this directory as a new project in the Vercel
   dashboard) — point it at this `th-vercel-functions/` directory as the
   project root, not the repo root.
2. Set the environment variables below in that Vercel project's settings.
3. Deploy. Each function will be live at
   `https://<this-project>.vercel.app/api/th/<agent-slug>` — e.g.
   `/api/th/mission`, `/api/th/aircraft-design`, `/api/th/simulation-orchestrator`.
4. Set `TH_VERCEL_FUNCTIONS_URL` (server-only, **not** `VITE_`-prefixed) in
   the **main app's** Vercel project to this project's base URL (e.g.
   `https://th-vercel-functions.vercel.app`), so `/api/t-h/$agent` knows
   where to proxy to.

## Environment variables (set in this project's Vercel dashboard)

| Variable | Required | Description |
|---|---|---|
| `TH_GCP_BASE_URL` | Yes | Base URL of the Google Cloud host, e.g. `http://34.100.231.177/Torqwings`. Each agent's own path is appended automatically (see `AGENT_BAY_PATHS`). |
| `TH_GCP_SHARED_SECRET` | Yes | Shared secret sent as `X-TH-Shared-Secret` on every outgoing call. Must exactly match the same variable on the Google Cloud side. |
| `TH_ALLOWED_ORIGIN` | No | CORS origin allowed to call these functions, e.g. `https://www.torqwings.com`. Defaults to `*` if unset. |

## Logging

Each function logs (via Python's standard `logging` module, picked up by
Vercel's function logs) the agent name, function name, and timing on every
incoming request and every Google Cloud response/failure. No payload
contents are logged, to avoid writing arbitrary user input into logs.
