"""
Test Harness Vercel function -- single entrypoint, one route per agent at
POST /api/th/<agent-slug>, all 15 following the identical logic path below
(only AGENT_SLUGS and the URL differ per agent, not the code).

Originally built as 15 separate files (one per agent, each its own
`handler(BaseHTTPRequestHandler)`), which is the classic/legacy Vercel
Python convention -- but this project's actual Vercel deployment rejected
that with "No python entrypoint found in default locations... found
potential entrypoints" once there was more than one file defining a
`handler`. This account's Python runtime expects exactly one entrypoint
(an ASGI app here), not 15 auto-routed files, so this file replaces all 15
-- same 15 URLs and same request/response shape as before, just one
deployable app with internal routing instead of 15 separate files.

Receives {"function_name": str, "payload": any} as a JSON POST body from
the browser (the only caller this is meant for), forwards it server-to-
server to that agent's own Google Cloud URL (TH_GCP_BASE_URL +
"/bay<NN>-<slug>/") as {"agent_name": ..., "function_name": ...,
"payload": ...}, and returns that response's status/body back to the
browser unchanged. The browser never sees TH_GCP_BASE_URL or
TH_GCP_SHARED_SECRET -- this file is the only place they're read.

One GCP URL per bay, not one shared endpoint with agent_name routing in
the body: the actual Google Cloud side is a per-bay directory structure
(http://<host>/Torqwings/bay01-mission/, bay02-concept/, ... one Apache
path per bay, matching the C:\Torqwings\BayN\ layout on the local side),
not the single-endpoint FastAPI service originally planned.
"""
import json
import logging
import os
import time

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# The 15 agents, exactly as in src/lib/test-harness/agents.ts (`slug`) --
# keep the two in sync if either changes. The dict value is the bay's path
# segment under TH_GCP_BASE_URL, e.g. "bay01-mission" ->
# "<TH_GCP_BASE_URL>/bay01-mission/".
AGENT_BAY_PATHS = {
    "mission": "bay01-mission",
    "concept": "bay02-concept",
    "aircraft-design": "bay03-aircraft-design",
    "cad": "bay04-cad",
    "simulation-orchestrator": "bay05-simulation-orchestrator",
    "cfd": "bay06-cfd",
    "structural": "bay07-structural",
    "optimization": "bay08-optimization",
    "validation": "bay09-validation",
    "materials": "bay10-materials",
    "manufacturing": "bay11-manufacturing",
    "certification": "bay12-certification",
    "documentation": "bay13-documentation",
    "bernoulli": "bay14-bernoulli",
    "knowledge": "bay15-knowledge",
}
AGENT_SLUGS = set(AGENT_BAY_PATHS)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("th-vercel-functions")

GCP_BASE_URL = os.environ.get("TH_GCP_BASE_URL")
GCP_SHARED_SECRET = os.environ.get("TH_GCP_SHARED_SECRET")
# Comma-separated list of origins allowed to call this app -- the main
# TorqWings production origin plus the local dev server, so testing the
# /t-h frontend against this live deployment from localhost works without
# a browser CORS error ("Failed to fetch", since the browser blocks the
# response before JS ever sees the real status/body). Set
# TH_ALLOWED_ORIGIN to override/extend this list, comma-separated.
DEFAULT_ALLOWED_ORIGINS = "https://www.torqwings.com,http://localhost:8080"
ALLOWED_ORIGINS = [
    o.strip() for o in os.environ.get("TH_ALLOWED_ORIGIN", DEFAULT_ALLOWED_ORIGINS).split(",") if o.strip()
]

app = FastAPI(title="TorqWings Test Harness - Agent Functions")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.get("/api/healthz")
def healthz():
    return {"status": "ok"}


@app.post("/api/th/{agent_name}")
async def invoke_agent(agent_name: str, request: Request):
    started = time.time()

    if agent_name not in AGENT_SLUGS:
        logger.warning("agent=%s rejected: unknown agent slug", agent_name)
        return JSONResponse(status_code=404, content={"error": f"Unknown agent '{agent_name}'"})

    try:
        body = await request.json()
    except Exception as exc:
        logger.warning("agent=%s bad_request=%s", agent_name, exc)
        return JSONResponse(status_code=400, content={"error": "Invalid JSON body"})

    function_name = body.get("function_name")
    payload = body.get("payload")
    logger.info("agent=%s function=%s request received", agent_name, function_name)

    if not GCP_BASE_URL:
        logger.error("agent=%s TH_GCP_BASE_URL is not configured", agent_name)
        return JSONResponse(status_code=500, content={"error": "TH_GCP_BASE_URL is not configured"})

    agent_url = f"{GCP_BASE_URL.rstrip('/')}/{AGENT_BAY_PATHS[agent_name]}/"

    gcp_request_body = {
        "agent_name": agent_name,
        "function_name": function_name,
        "payload": payload,
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                agent_url,
                json=gcp_request_body,
                headers={"X-TH-Shared-Secret": GCP_SHARED_SECRET or ""},
            )
    except Exception as exc:
        elapsed = round((time.time() - started) * 1000)
        logger.error(
            "agent=%s function=%s gcp_call_failed=%s elapsed_ms=%s",
            agent_name, function_name, exc, elapsed,
        )
        return JSONResponse(
            status_code=502,
            content={"error": f"Could not reach Google Cloud endpoint: {exc}"},
        )

    elapsed = round((time.time() - started) * 1000)
    logger.info(
        "agent=%s function=%s gcp_status=%s elapsed_ms=%s",
        agent_name, function_name, resp.status_code, elapsed,
    )

    try:
        content = resp.json()
    except json.JSONDecodeError:
        content = {"raw": resp.text}

    return JSONResponse(status_code=resp.status_code, content=content)
