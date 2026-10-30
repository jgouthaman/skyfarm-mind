#!/usr/bin/env python3
"""TorqWings Hangar runner -- a tiny HTTP service on the GCP server that lets
Vercel (server to server, never the browser) run the Bay scripts.

Listens on 127.0.0.1:8001 only; Apache proxies /torqwings/api/ to it. Every
request must carry the shared key in X-Hangar-Key (HANGAR_KEY in runner.env).

    POST /run/vehicle-design  {"conceptCode": "...", "conceptId": "..."}
        -> runs VehicleDesign.py, returns its JSON
    POST /run/raman           {"function": "noise_check" | "evaluate_design" | "lever_ranges" | "health",
                               "payload": {...}, "request_id": "..."}
        -> Bay 16 Raman engine, run in-process (fast: sliders call it many times), returns its JSON
    GET  /health              -> {"ok": true}

Standard library only. Run by systemd (hangar-runner.service).
"""
import hmac
import json
import os
import re
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
BAY3_DIR = os.environ.get("HANGAR_BAY3_DIR", os.path.expanduser("~/Bay3"))
KEY = os.environ.get("HANGAR_KEY", "")
PORT = int(os.environ.get("HANGAR_RUNNER_PORT", "8001"))
SCRIPT_TIMEOUT_S = int(os.environ.get("HANGAR_SCRIPT_TIMEOUT_S", "110"))
CODE_RE = re.compile(r"^[0-9A-F]{20}$")
UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")

# Each Bay's shared script lives in a private folder inside that Bay's folder
# (Apache denies it; see torqwings.conf).
SCRIPTS = {"/run/vehicle-design": os.path.join(BAY3_DIR, "VehicleDesigner", "VehicleDesign.py")}

# Bay 16 Raman: deterministic standard-library engine, imported once and called in-process.
# After updating the Raman files, restart the service: sudo systemctl restart hangar-runner
RAMAN_DIR = os.environ.get("HANGAR_RAMAN_DIR", os.path.expanduser("~/Bay16/raman"))
RAMAN_FUNCTIONS = {"noise_check", "evaluate_design", "lever_ranges", "health"}
RAMAN_MAX_BODY = 64_000
_raman_handler = None


def _load_raman():
    """Import ~/Bay16/raman/handler.py once (it imports raman_engine.py from the same folder)."""
    global _raman_handler
    if _raman_handler is None:
        import importlib.util
        if RAMAN_DIR not in sys.path:
            sys.path.insert(0, RAMAN_DIR)
        spec = importlib.util.spec_from_file_location("raman_handler", os.path.join(RAMAN_DIR, "handler.py"))
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        _raman_handler = module
    return _raman_handler


class Handler(BaseHTTPRequestHandler):
    server_version = "HangarRunner/1"

    def _send(self, status, body):
        data = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _authorized(self):
        given = self.headers.get("X-Hangar-Key", "")
        return bool(KEY) and hmac.compare_digest(given.encode(), KEY.encode())

    def do_GET(self):
        if self.path == "/health":
            return self._send(200, {"ok": True})
        self._send(404, {"ok": False, "error": "not found"})

    def do_POST(self):
        if not self._authorized():
            return self._send(401, {"ok": False, "error": "missing or wrong X-Hangar-Key"})
        if self.path == "/run/raman":
            return self._run_raman()
        script = SCRIPTS.get(self.path)
        if not script:
            return self._send(404, {"ok": False, "error": "not found"})
        try:
            length = min(int(self.headers.get("Content-Length", "0")), 10_000)
            body = json.loads(self.rfile.read(length) or b"{}")
        except (ValueError, json.JSONDecodeError):
            return self._send(400, {"ok": False, "error": "body must be JSON"})

        code = str(body.get("conceptCode", "")).strip().upper()
        concept_id = str(body.get("conceptId", "")).strip().lower()
        if not CODE_RE.match(code):
            return self._send(400, {"ok": False, "error": "conceptCode must be 20 hex characters"})
        if not os.path.isfile(script):
            return self._send(500, {"ok": False, "error": f"{script} not found on the server"})
        args = [sys.executable, script, code]
        if concept_id:
            if not UUID_RE.match(concept_id):
                return self._send(400, {"ok": False, "error": "conceptId must be a uuid"})
            args.append(concept_id)

        try:
            proc = subprocess.run(args, capture_output=True, text=True, timeout=SCRIPT_TIMEOUT_S, cwd=os.path.dirname(script))
        except subprocess.TimeoutExpired:
            return self._send(504, {"ok": False, "error": f"{os.path.basename(script)} took longer than {SCRIPT_TIMEOUT_S}s"})

        lines = [l for l in proc.stdout.strip().splitlines() if l.strip()]
        try:
            result = json.loads(lines[-1]) if lines else None
        except json.JSONDecodeError:
            result = None
        if proc.returncode != 0 or not isinstance(result, dict):
            error = (result or {}).get("error") if isinstance(result, dict) else None
            return self._send(
                500,
                {"ok": False, "error": error or f"{os.path.basename(script)} failed (exit {proc.returncode})", "stderr": proc.stderr[-2000:]},
            )
        self._send(200, result)

    def _run_raman(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length > RAMAN_MAX_BODY:
                return self._send(413, {"ok": False, "error": "request body too large"})
            body = json.loads(self.rfile.read(length) or b"{}")
        except (ValueError, json.JSONDecodeError):
            return self._send(400, {"ok": False, "error": "body must be JSON"})
        if not isinstance(body, dict):
            return self._send(400, {"ok": False, "error": "body must be a JSON object"})
        function = str(body.get("function", "")).strip()
        if function not in RAMAN_FUNCTIONS:
            return self._send(400, {"ok": False, "error": f"function must be one of {sorted(RAMAN_FUNCTIONS)}"})
        payload = body.get("payload") or {}
        if not isinstance(payload, dict):
            return self._send(400, {"ok": False, "error": "payload must be a JSON object"})
        try:
            handler = _load_raman()
        except Exception as exc:  # missing files or import error
            return self._send(500, {"ok": False, "error": f"Raman engine not available: {exc}"})
        result = handler.handle({"function": function, "payload": payload, "request_id": body.get("request_id")})
        # Input errors are the caller's fault (400); anything else that failed is ours (500).
        if result.get("status") == "error":
            status = 400 if result.get("error") in ("invalid_input", "unknown_function") else 500
            result["ok"] = False
            return self._send(status, result)
        result["ok"] = True
        self._send(200, result)

    def log_message(self, fmt, *args):
        sys.stderr.write("%s %s\n" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    if not KEY:
        sys.exit("HANGAR_KEY is not set (see runner.env)")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
