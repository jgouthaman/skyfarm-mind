# Sagush Python service

A **separate Vercel project** hosting real Python serverless functions for
the "Trigger Sagush" prototype on the main app's Bay 03 (Aircraft Design)
page. Deployed independently from the main `skyfarm-mind` app.

## Why a separate project

The main app's build (`nitro({ preset: "vercel" })`) always emits a complete,
self-contained Vercel deployment (`.vercel/output/`) before Vercel's own
platform would normally scan for an `/api` folder — so dropping `.py` files
into the main repo's `/api` would never get picked up as Python functions
there. A fresh project with no competing custom build gets Vercel's normal,
fully-automatic Python function detection for free, which is what actually
lets this run — verified by deploying and calling it directly, not assumed.

## What's here

- `api/sagush_hello.py` — step 1: proves the bridge is alive, echoes back the
  concept id/code it's given.
- `api/sagush_design.py` — step 2: returns a design spec for "Aircraft
  Sagush". **Fixed placeholder data today** — this file is exactly where the
  real physics/math generation code goes once it exists.
- `vercel.json` — sets `maxDuration: 60` for both functions (Hobby-plan
  ceiling). Raise this (or move to Pro/Fluid compute) once real computation
  needs more time.

## Trust model

Both functions require a shared-secret header, `X-Sagush-Key`, matching the
`SAGUSH_SERVICE_KEY` environment variable set on **this** project. They are
otherwise public HTTP endpoints — the secret is what stops a stranger from
calling them directly. The real authorization (is this user signed in, do
they own this concept) happens once, in the main app's own server route,
*before* it calls here — this service trusts that check already happened and
does no user/database logic of its own.

## Deploying

```
cd python-service
vercel --prod
```

Set `SAGUSH_SERVICE_KEY` on this project (same value as the main app's
`SAGUSH_SERVICE_KEY` + `SAGUSH_SERVICE_URL` pointing at this deployment) via
`vercel env add SAGUSH_SERVICE_KEY production`, or the Vercel dashboard.

This is deployed via the CLI, not Git integration — a push to the main repo
does **not** redeploy this service. Redeploy manually (`vercel --prod`) after
changing these files.
