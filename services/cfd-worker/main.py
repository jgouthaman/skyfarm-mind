"""Bay 06 (CFD Agent) solver worker -- STUB.

Runs as a GCP Cloud Run Job, one execution per public."Hangar_CFD_runs"
row. Vercel's cfdDispatch.ts starts the job with RUN_ID as an env
override; this process reads the row's case setup, walks the run through
meshing -> solving -> postprocessing -> completed, and writes progress,
mesh stats, residuals and results back to the row with the service role.
The Bay 06 page follows the row over Supabase Realtime.

Everything except mesh() / solve() / postprocess() is the contract the
real OpenFOAM worker keeps: env vars, the queued/dispatched guard, status
order, progress_pct milestones, column shapes, failure handling and logs.
The stub's numbers are plausible but fake, and every row it touches gets
is_stub = true and results.stub = true.

Env:
  RUN_ID                     Hangar_CFD_runs.id to process (required)
  SUPABASE_URL               https://<ref>.supabase.co (required)
  SUPABASE_SERVICE_ROLE_KEY  service role key; bypasses RLS (required)
  STUB_FAIL_AT               optional: meshing | solving | postprocessing,
                             fail on entering that stage (to test failures)
  STUB_STEP_SECONDS          seconds per simulated step (default 10)

Exit codes: 0 completed, or nothing to do (row not queued/dispatched, so a
re-run of the job is harmless); 1 the run failed and was marked failed;
2 bad configuration (the row is not touched).
"""

from __future__ import annotations

import json
import math
import os
import sys
import time
from datetime import datetime, timezone
from typing import Any, Callable

import httpx

TABLE = "Hangar_CFD_runs"
STAGES = ("meshing", "solving", "postprocessing")
STARTABLE = ("queued", "dispatched")
RESIDUAL_FIELDS = ("Ux", "Uy", "Uz", "p", "k", "omega")
RESIDUAL_FLOOR = 1e-5
SOLVE_UPDATES = 10

RUN_ID = os.environ.get("RUN_ID", "").strip()


def log(severity: str, message: str, **fields: Any) -> None:
    """One JSON object per line; Cloud Logging reads severity and message."""
    entry = {"severity": severity, "message": message, "run_id": RUN_ID or None, **fields}
    print(json.dumps(entry, default=str), flush=True)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class StageFailure(Exception):
    def __init__(self, stage: str, reason: str) -> None:
        super().__init__(f"{stage}: {reason}")
        self.stage = stage
        self.reason = reason


# --------------------------------------------------------------------------
# Supabase (PostgREST) access
# --------------------------------------------------------------------------


class RunsTable:
    def __init__(self, supabase_url: str, service_role_key: str) -> None:
        self._http = httpx.Client(
            base_url=f"{supabase_url.rstrip('/')}/rest/v1",
            headers={
                "apikey": service_role_key,
                "Authorization": f"Bearer {service_role_key}",
                "Content-Type": "application/json",
            },
            timeout=20.0,
        )

    def get(self, run_id: str) -> dict[str, Any] | None:
        res = self._http.get(f"/{TABLE}", params={"id": f"eq.{run_id}", "select": "*"})
        res.raise_for_status()
        rows = res.json()
        return rows[0] if rows else None

    def claim(self, run_id: str, patch: dict[str, Any]) -> bool:
        """Patch only if the row is still queued/dispatched. False when another
        execution got there first (or the status moved on)."""
        res = self._http.patch(
            f"/{TABLE}",
            params={"id": f"eq.{run_id}", "status": f"in.({','.join(STARTABLE)})"},
            headers={"Prefer": "return=representation"},
            json=patch,
        )
        res.raise_for_status()
        return len(res.json()) == 1

    def update(self, run_id: str, patch: dict[str, Any]) -> None:
        res = self._http.patch(
            f"/{TABLE}",
            params={"id": f"eq.{run_id}"},
            headers={"Prefer": "return=minimal"},
            json=patch,
        )
        res.raise_for_status()


# --------------------------------------------------------------------------
# Case setup (written by Vercel's cfdCaseSetup.ts)
# --------------------------------------------------------------------------


def case_number(case: dict[str, Any], key: str, default: float) -> float:
    value = case.get(key)
    if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value):
        return float(value)
    return default


# --------------------------------------------------------------------------
# STUB stages -- the only part the real OpenFOAM worker replaces.
# --------------------------------------------------------------------------

MESH_CELLS = {"coarse": 240_000, "medium": 820_000, "fine": 2_600_000}


def mesh(case: dict[str, Any]) -> dict[str, Any]:
    cells = MESH_CELLS.get(str(case.get("mesh_level")), MESH_CELLS["medium"])
    return {"cells": cells, "max_skewness": 2.31, "max_non_ortho": 47.8, "check_mesh_ok": True}


def solve(
    case: dict[str, Any],
    on_residual: Callable[[dict[str, Any], int, int], None],
    step_seconds: float,
) -> None:
    """Emits SOLVE_UPDATES residual points, each field decaying roughly
    exponentially from its start value to ~1e-5 at max_iterations."""
    max_iter = max(1, int(case_number(case, "max_iterations", 1000)))
    start = {"Ux": 1.0, "Uy": 0.6, "Uz": 0.45, "p": 0.9, "k": 0.3, "omega": 0.2}
    for n in range(1, SOLVE_UPDATES + 1):
        time.sleep(step_seconds)
        frac = n / SOLVE_UPDATES
        point: dict[str, Any] = {"iteration": max(1, round(max_iter * frac))}
        for i, field in enumerate(RESIDUAL_FIELDS):
            decayed = start[field] * (RESIDUAL_FLOOR / start[field]) ** frac
            wobble = 1.0 + 0.15 * math.sin(3.1 * n + i)  # not perfectly smooth
            point[field] = float(f"{max(RESIDUAL_FLOOR, decayed * wobble):.3e}")
        on_residual(point, n, SOLVE_UPDATES)


def postprocess(case: dict[str, Any]) -> dict[str, Any]:
    """Thin-airfoil-ish cl/cd/cm from angle of attack, then forces from the
    case's velocity, density and reference area."""
    aoa = case_number(case, "angle_of_attack_deg", 2.0)
    velocity = case_number(case, "freestream_velocity_ms", 20.0)
    density = case_number(case, "air_density_kgm3", 1.225)
    area = case_number(case, "reference_area_m2", 0.5)

    cl = max(-0.8, min(1.4, 0.25 + 0.09 * aoa))
    cd = 0.028 + 0.045 * cl * cl
    cm = -0.05 - 0.008 * aoa
    q_s = 0.5 * density * velocity * velocity * area
    return {
        "cl": round(cl, 4),
        "cd": round(cd, 4),
        "cm": round(cm, 4),
        "lift_n": round(q_s * cl, 3),
        "drag_n": round(q_s * cd, 3),
        "converged": True,
        "stub": True,
    }


# --------------------------------------------------------------------------
# Run lifecycle (the contract)
# --------------------------------------------------------------------------


def run(db: RunsTable, fail_at: str | None, step_seconds: float) -> int:
    row = db.get(RUN_ID)
    if row is None:
        log("ERROR", "Run not found")
        return 1
    if row.get("status") not in STARTABLE:
        log("INFO", "Run is not queued or dispatched; nothing to do", status=row.get("status"))
        return 0
    case = row.get("case_setup") or {}

    if not db.claim(RUN_ID, {"started_at": now_iso(), "is_stub": True, "error_message": None}):
        log("INFO", "Run was claimed by another execution; nothing to do")
        return 0
    log("INFO", "Run started", case_setup=case, step_seconds=step_seconds, fail_at=fail_at)

    stage = "starting"
    try:
        stage = "meshing"
        enter_stage(db, stage, fail_at, progress=5)
        time.sleep(step_seconds)
        mesh_stats = mesh(case)
        db.update(RUN_ID, {"mesh_stats": mesh_stats, "progress_pct": 20})
        log("INFO", "Mesh ready", stage=stage, mesh_stats=mesh_stats)

        stage = "solving"
        enter_stage(db, stage, fail_at, progress=20)
        residuals: list[dict[str, Any]] = []

        def on_residual(point: dict[str, Any], n: int, total: int) -> None:
            residuals.append(point)
            progress = 20 + round(65 * n / total)
            db.update(RUN_ID, {"residuals": residuals, "progress_pct": progress})
            log("INFO", "Residuals", stage="solving", progress_pct=progress, **point)

        solve(case, on_residual, step_seconds)

        stage = "postprocessing"
        enter_stage(db, stage, fail_at, progress=85)
        time.sleep(step_seconds)
        results = postprocess(case)
        db.update(RUN_ID, {"progress_pct": 95})

        stage = "completed"
        db.update(
            RUN_ID,
            {"status": "completed", "results": results, "progress_pct": 100, "completed_at": now_iso()},
        )
        log("INFO", "Run completed", stage=stage, results=results)
        return 0
    except Exception as err:  # noqa: BLE001 -- every failure must reach the row
        reason = err.reason if isinstance(err, StageFailure) else f"{type(err).__name__}: {err}"
        message = f"CFD worker failed during {stage}: {reason}"
        log("ERROR", message, stage=stage)
        try:
            db.update(
                RUN_ID,
                {"status": "failed", "error_message": message, "completed_at": now_iso()},
            )
        except Exception as mark_err:  # noqa: BLE001
            log("ERROR", "Could not mark the run failed", error=str(mark_err))
        return 1


def enter_stage(db: RunsTable, stage: str, fail_at: str | None, progress: int) -> None:
    db.update(RUN_ID, {"status": stage, "progress_pct": progress})
    log("INFO", "Stage started", stage=stage, progress_pct=progress)
    if fail_at == stage:
        raise StageFailure(stage, f"STUB_FAIL_AT={stage} (simulated failure)")


def main() -> int:
    missing = [k for k in ("RUN_ID", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY") if not os.environ.get(k, "").strip()]
    if missing:
        log("ERROR", "Missing required env vars", missing=missing)
        return 2

    fail_at = os.environ.get("STUB_FAIL_AT", "").strip() or None
    if fail_at is not None and fail_at not in STAGES:
        log("ERROR", "STUB_FAIL_AT must be one of meshing, solving, postprocessing", value=fail_at)
        return 2
    try:
        step_seconds = float(os.environ.get("STUB_STEP_SECONDS", "10"))
        if step_seconds < 0 or not math.isfinite(step_seconds):
            raise ValueError
    except ValueError:
        log("ERROR", "STUB_STEP_SECONDS must be a non-negative number", value=os.environ.get("STUB_STEP_SECONDS"))
        return 2

    db = RunsTable(os.environ["SUPABASE_URL"].strip(), os.environ["SUPABASE_SERVICE_ROLE_KEY"].strip())
    try:
        return run(db, fail_at, step_seconds)
    except Exception as err:  # noqa: BLE001 -- e.g. the first read failed
        log("ERROR", "Worker error before the run started", error=f"{type(err).__name__}: {err}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
