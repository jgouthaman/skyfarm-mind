"""
Stub handler for Bay 06 -- CFD.

Placeholder only: validates the incoming request structure and returns a
hardcoded/dummy response, so connectivity (browser -> Vercel function ->
this service -> back) can be proven before any real agent logic exists.
Replace `handle()`'s body with real logic later; main.py's routing and
request/response shape stay the same.
"""
from datetime import datetime, timezone

AGENT_NAME = "cfd"


def handle(function_name: str, payload: object) -> dict:
    return {
        "agent_name": AGENT_NAME,
        "function_name": function_name,
        "status": "ok",
        "mock": True,
        "message": f"Stub response from {AGENT_NAME} -- no real computation has run yet.",
        "echo_payload": payload,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
