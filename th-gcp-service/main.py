"""
Test Harness Google Cloud service -- single FastAPI endpoint, routes by
agent_name to a per-agent stub handler (agents/<name>/handler.py).

Called server-to-server only, by the 15 Vercel Python functions in
th-vercel-functions/ -- never directly by a browser. Requests are
authenticated with a shared-secret header (TH_GCP_SHARED_SECRET) so this
service can verify a call actually came from those functions.

Each agent's handler is currently a stub: it validates the request shape
and returns a hardcoded/dummy JSON response, proving connectivity before
any real agent logic exists. See each agents/<name>/handler.py.
"""
import logging
import os
import time
from typing import Any, Optional

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from agents.aircraft_design.handler import handle as handle_aircraft_design
from agents.bernoulli.handler import handle as handle_bernoulli
from agents.cad.handler import handle as handle_cad
from agents.certification.handler import handle as handle_certification
from agents.cfd.handler import handle as handle_cfd
from agents.concept.handler import handle as handle_concept
from agents.documentation.handler import handle as handle_documentation
from agents.knowledge.handler import handle as handle_knowledge
from agents.manufacturing.handler import handle as handle_manufacturing
from agents.materials.handler import handle as handle_materials
from agents.mission.handler import handle as handle_mission
from agents.optimization.handler import handle as handle_optimization
from agents.simulation_orchestrator.handler import handle as handle_simulation_orchestrator
from agents.structural.handler import handle as handle_structural
from agents.validation.handler import handle as handle_validation

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("th-gcp-service")

app = FastAPI(title="TorqWings Test Harness - Agent Gateway")

# agent_name (as sent by the Vercel functions, hyphenated to match each
# function's own AGENT_NAME) -> that agent's stub handle() function.
AGENT_ROUTES = {
    "mission": handle_mission,
    "concept": handle_concept,
    "aircraft-design": handle_aircraft_design,
    "cad": handle_cad,
    "simulation-orchestrator": handle_simulation_orchestrator,
    "cfd": handle_cfd,
    "structural": handle_structural,
    "optimization": handle_optimization,
    "validation": handle_validation,
    "materials": handle_materials,
    "manufacturing": handle_manufacturing,
    "certification": handle_certification,
    "documentation": handle_documentation,
    "bernoulli": handle_bernoulli,
    "knowledge": handle_knowledge,
}

SHARED_SECRET = os.environ.get("TH_GCP_SHARED_SECRET")


class InvokeRequest(BaseModel):
    agent_name: str
    function_name: str
    payload: Optional[Any] = None


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@app.post("/invoke")
async def invoke(req: InvokeRequest, request: Request, x_th_shared_secret: str = Header(default="")):
    started = time.time()

    if not SHARED_SECRET:
        logger.error("TH_GCP_SHARED_SECRET is not configured on this service")
        raise HTTPException(status_code=500, detail="TH_GCP_SHARED_SECRET is not configured")
    if x_th_shared_secret != SHARED_SECRET:
        logger.warning("agent=%s rejected: bad or missing shared secret", req.agent_name)
        raise HTTPException(status_code=401, detail="Invalid or missing shared secret")

    logger.info(
        "received agent=%s function=%s client=%s",
        req.agent_name, req.function_name, request.client.host if request.client else "unknown",
    )

    route = AGENT_ROUTES.get(req.agent_name)
    if route is None:
        logger.warning("agent=%s rejected: unknown agent_name", req.agent_name)
        raise HTTPException(
            status_code=400,
            detail=f"Unknown agent_name '{req.agent_name}'. Expected one of: {sorted(AGENT_ROUTES)}",
        )
    if not req.function_name:
        logger.warning("agent=%s rejected: missing function_name", req.agent_name)
        raise HTTPException(status_code=400, detail="function_name is required")

    result = route(req.function_name, req.payload)

    elapsed = round((time.time() - started) * 1000)
    logger.info("responded agent=%s function=%s elapsed_ms=%s", req.agent_name, req.function_name, elapsed)

    return JSONResponse(content=result)
