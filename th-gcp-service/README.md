# th-gcp-service

FastAPI service with a single `POST /invoke` endpoint that routes by
`agent_name` to a per-agent stub handler (`agents/<name>/handler.py`).
Called server-to-server only, by the 15 Vercel Python functions in
`th-vercel-functions/` — never directly by a browser.

Every agent's handler is currently a **stub**: it does no real
computation, just validates the request shape and returns a
hardcoded/dummy JSON response. This proves the full chain (browser →
Vercel function → this service → back) works before any real agent logic
exists. Replace a handler's `handle()` body later; `main.py`'s routing and
the request/response shape stay the same.

## Request shape

```
POST /invoke
Header: X-TH-Shared-Secret: <shared secret>
Body:   { "agent_name": "mission", "function_name": "input_processing", "payload": ... }
```

Returns the matching agent handler's dict as JSON (currently always a
dummy `{"status": "ok", "mock": true, ...}` shape — see any file under
`agents/*/handler.py`).

## Deploy (Cloud Run)

```
gcloud run deploy th-gcp-service \
  --source . \
  --region <your-region> \
  --allow-unauthenticated \
  --set-env-vars TH_GCP_SHARED_SECRET=<same value as the Vercel side>
```

(`--allow-unauthenticated` is fine here because the shared-secret header
is the actual access control — same pattern as an API-key-gated public
endpoint. Swap to Cloud Run's IAM-based auth instead if you'd rather gate
at the infrastructure level; that would mean the Vercel functions also
need to send a Google-signed ID token, which they don't today.)

After deploying, take the printed service URL, append `/invoke`, and set
that as `TH_GCP_ENDPOINT_URL` in the `th-vercel-functions` Vercel project.

## Local run

```
pip install -r requirements.txt
export TH_GCP_SHARED_SECRET=dev-secret
uvicorn main:app --reload --port 8080
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `TH_GCP_SHARED_SECRET` | Yes | Shared secret checked against every incoming request's `X-TH-Shared-Secret` header. Must exactly match `TH_GCP_SHARED_SECRET` on the Vercel side. |

## Logging

Every request logs `agent_name`, `function_name`, the calling client's
host, and response timing (via Python's standard `logging`, picked up by
Cloud Run's own log viewer). Rejected requests (bad secret, unknown agent,
missing function_name) are logged as warnings. No payload contents are
logged, to avoid writing arbitrary user input into logs.

## Adding a real agent later

1. Edit `agents/<name>/handler.py`'s `handle(function_name, payload)` to
   do real work instead of returning the dummy response.
2. Nothing in `main.py` needs to change — routing is already wired.
