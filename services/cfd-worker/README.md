# Bay 06 CFD worker (stub)

A GCP Cloud Run **Job** that processes one `public."Hangar_CFD_runs"` row per
execution. Vercel (`src/lib/the-hangar/cfdDispatch.ts`, with
`CFD_DISPATCH_MODE=cloud_run_job`) starts it with `RUN_ID` as an env override.
The worker walks the row through `meshing -> solving -> postprocessing ->
completed`, writing `progress_pct`, `mesh_stats`, `residuals` and `results` as it
goes. The Bay 06 page follows along over Supabase Realtime.

This is a **stub**: mesh stats, residuals and coefficients are made up (plausible,
but fake). It sets `is_stub = true` on the row and `results.stub = true`. Only
`mesh()`, `solve()` and `postprocess()` in `main.py` change when the real OpenFOAM
worker replaces it; env vars, status order, progress milestones, column shapes,
failure handling and logs stay the same.

Separate from `th-gcp-service/` and `python-service/`; nothing here touches them.

## Contract

| Env | |
|---|---|
| `RUN_ID` | `Hangar_CFD_runs.id` to process (required) |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` (required) |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key, from Secret Manager (required) |
| `STUB_FAIL_AT` | optional `meshing` \| `solving` \| `postprocessing`: fail on entering that stage |
| `STUB_STEP_SECONDS` | seconds per simulated step, default `10` (about 2.5 min per run) |

- Only starts a row that is `queued` or `dispatched`, claimed with a conditional
  update, so re-running the job (or two executions racing) is harmless: anything
  else logs and exits 0.
- Sets `started_at`, `is_stub`; then `meshing` (progress 5, then 20 with
  `mesh_stats`), `solving` (10 residual points, progress 20 -> 85), `postprocessing`
  (progress 85 -> 95), `completed` (progress 100, `results`, `completed_at`).
- `mesh_stats`: `{cells, max_skewness, max_non_ortho, check_mesh_ok}`.
- `residuals`: `[{iteration, Ux, Uy, Uz, p, k, omega}]`, decaying toward 1e-5 by
  `case_setup.max_iterations`.
- `results`: `{cl, cd, cm, lift_n, drag_n, converged, stub}`; forces use
  `case_setup` velocity, density and reference area.
- Any error (or `STUB_FAIL_AT`): `status = failed`,
  `error_message = "CFD worker failed during <stage>: <reason>"`, `completed_at`,
  exit 1. Bad configuration exits 2 without touching the row.
- Logs are one JSON object per line with `severity`, `message` and `run_id`.

## Local test (no GCP)

Needs a queued row: start one from Bay 06, or POST `/api/hangar/cfd-runs` with
`CFD_DISPATCH_MODE=off` so Vercel leaves it `queued`.

```bash
cd services/cfd-worker
cp .env.example .env        # fill in RUN_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
```

With Docker:

```bash
docker build -t hangar-cfd-worker .
docker run --rm --env-file .env hangar-cfd-worker
```

Without Docker (Python 3.12+):

```bash
python -m venv .venv
. .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
set -a; . ./.env; set +a    # Windows PowerShell: set each var with $env:NAME = "..."
python main.py
```

## Deploy to GCP

Run these from the repo root. Set the variables first:

```bash
PROJECT_ID=<your-gcp-project-id>
REGION=asia-northeast1
REPO=hangar
IMAGE=$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/cfd-worker:stub-1
SUPABASE_URL=https://<project-ref>.supabase.co

gcloud config set project $PROJECT_ID
```

### 1. Enable APIs

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com
```

(`cloudbuild` is only for building the image in step 2.)

### 2. Artifact Registry repo and image

```bash
gcloud artifacts repositories create $REPO \
  --repository-format=docker \
  --location=$REGION \
  --description="TorqWings Hangar images"

gcloud builds submit services/cfd-worker --tag $IMAGE
```

For later builds, bump the tag (`stub-2`, ...) and run
`gcloud run jobs update hangar-cfd-worker --region $REGION --image <new tag>`.

### 3. Supabase service role key in Secret Manager

```bash
read -s SUPABASE_SERVICE_ROLE_KEY     # paste the key, press Enter (not echoed)
printf '%s' "$SUPABASE_SERVICE_ROLE_KEY" | \
  gcloud secrets create supabase-service-role-key \
    --replication-policy=automatic --data-file=-
unset SUPABASE_SERVICE_ROLE_KEY
```

### 4. Runtime service account: `cfd-worker-sa`

Can read that one secret and nothing else.

```bash
gcloud iam service-accounts create cfd-worker-sa \
  --display-name="Hangar CFD worker (runtime)"

gcloud secrets add-iam-policy-binding supabase-service-role-key \
  --member="serviceAccount:cfd-worker-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role=roles/secretmanager.secretAccessor
```

### 5. Create the job: `hangar-cfd-worker`

```bash
gcloud run jobs create hangar-cfd-worker \
  --region=$REGION \
  --image=$IMAGE \
  --service-account="cfd-worker-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --tasks=1 \
  --max-retries=0 \
  --task-timeout=3600s \
  --cpu=1 \
  --memory=512Mi \
  --set-secrets=SUPABASE_SERVICE_ROLE_KEY=supabase-service-role-key:latest \
  --set-env-vars=SUPABASE_URL=$SUPABASE_URL,STUB_STEP_SECONDS=10
```

### 6. Dispatcher service account for Vercel: `vercel-cfd-dispatcher`

Allowed to run this one job with overrides (`roles/run.developer` includes
`run.jobs.runWithOverrides`, which passing `RUN_ID` needs), on the job only, not
project-wide.

```bash
gcloud iam service-accounts create vercel-cfd-dispatcher \
  --display-name="Vercel -> Hangar CFD job dispatcher"

gcloud run jobs add-iam-policy-binding hangar-cfd-worker \
  --region=$REGION \
  --member="serviceAccount:vercel-cfd-dispatcher@$PROJECT_ID.iam.gserviceaccount.com" \
  --role=roles/run.developer
```

Create its JSON key and base64-encode it for `GCP_SA_KEY_JSON`:

```bash
gcloud iam service-accounts keys create vercel-cfd-dispatcher.json \
  --iam-account="vercel-cfd-dispatcher@$PROJECT_ID.iam.gserviceaccount.com"

base64 -w0 vercel-cfd-dispatcher.json > vercel-cfd-dispatcher.b64   # Linux / Cloud Shell
# macOS:       base64 -i vercel-cfd-dispatcher.json | tr -d '\n' > vercel-cfd-dispatcher.b64
# PowerShell:  [Convert]::ToBase64String([IO.File]::ReadAllBytes("vercel-cfd-dispatcher.json")) | Set-Content -NoNewline vercel-cfd-dispatcher.b64
```

Paste the `.b64` contents into Vercel as `GCP_SA_KEY_JSON`, then delete both
files. If key creation is refused, the org policy
`iam.disableServiceAccountKeyCreation` is on for the project.

Vercel env (the project that serves the Hangar):

```
CFD_DISPATCH_MODE=cloud_run_job
GCP_PROJECT_ID=<your-gcp-project-id>
GCP_REGION=asia-northeast1
CFD_JOB_NAME=hangar-cfd-worker
GCP_SA_KEY_JSON=<contents of vercel-cfd-dispatcher.b64>
```

### 7. Manual test on GCP

Use the id of a `queued` row:

```bash
gcloud run jobs execute hangar-cfd-worker \
  --region=$REGION \
  --update-env-vars=RUN_ID=<run-id> \
  --wait
```

Failure path (marks the row `failed` during solving, execution exits 1):

```bash
gcloud run jobs execute hangar-cfd-worker \
  --region=$REGION \
  --update-env-vars=RUN_ID=<another-queued-run-id>,STUB_FAIL_AT=solving \
  --wait
```

Logs for one run:

```bash
gcloud logging read \
  'resource.type="cloud_run_job" AND resource.labels.job_name="hangar-cfd-worker" AND jsonPayload.run_id="<run-id>"' \
  --limit=50 --format='value(jsonPayload.message, jsonPayload.stage, jsonPayload.progress_pct)'
```

`--update-env-vars` on `execute` applies to that execution only; the job's own
env is unchanged.
