"""
Bay 16 — Raman Agent (UAV noise) — GCP handler.

Thin adapter between the th-gcp-service router and the deterministic engine in raman_engine.py.
Stateless: no database writes here. The Vercel API route persists results to Supabase
(same stateless pattern as the Bay 01 GCP port).

Request body (from the Vercel relay):
    {
      "agent": "raman",                      # or "bay16" - whatever the router uses
      "function": "noise_check" | "evaluate_design" | "lever_ranges" | "health",
      "payload": { ...inputs... },
      "request_id": "optional, echoed back"
    }

Response: the engine result dict plus "agent", "function", "request_id", "engine_version".
Errors are returned as {"status": "error", ...} with HTTP 200 from the router unless the router
convention says otherwise - adjust to match agents/mission/handler.py.
"""

from __future__ import annotations

import logging
import time

try:  # package import inside th-gcp-service/agents/raman/
    from . import raman_engine as engine
except ImportError:  # running the file directly
    import raman_engine as engine

log = logging.getLogger("bay16.raman")

AGENT_ID = "raman"
BAY = "B16"


def handle(request: dict) -> dict:
    t0 = time.perf_counter()
    request = request or {}
    function = request.get("function") or request.get("stage") or "noise_check"
    payload = request.get("payload") or {}
    request_id = request.get("request_id")

    if function == "health":
        result = {"status": "ok", "functions": sorted(engine.FUNCTIONS)}
    else:
        try:
            result = engine.handle(function, payload)
        except Exception as exc:  # never leak a stack trace to the browser; log it here
            log.exception("raman %s failed", function)
            result = {"status": "error", "error": "engine_failure", "message": str(exc)}

    result.update({
        "agent": AGENT_ID,
        "bay": BAY,
        "function": function,
        "request_id": request_id,
        "engine_version": engine.ENGINE_VERSION,
        "handler_ms": round((time.perf_counter() - t0) * 1000, 1),
    })
    log.info("raman function=%s status=%s ms=%s", function, result.get("status"), result["handler_ms"])
    return result


# Some routers call a stage-style entry point; keep both names available.
def run(request: dict) -> dict:
    return handle(request)


if __name__ == "__main__":  # quick manual check: python handler.py
    import json
    demo = {
        "function": "noise_check",
        "payload": {"take_off_mass_kg": 4.2, "rotor_count": 4, "prop_diameter": 13, "prop_diameter_unit": "in",
                    "blade_count": 2, "motor_kv": 600, "battery_cells": 6, "cruise_speed": 12,
                    "cruise_speed_unit": "m/s", "target_dba": 60, "environment": "urban"},
    }
    print(json.dumps(handle(demo), indent=2)[:2500])
