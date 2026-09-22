"""Vercel Python Serverless Function — Sagush prototype, step 1 of 2.

This is a SEPARATE Vercel project from the main TorqWings app (see
python-service/README.md for why: the main app's Nitro build already emits a
complete, self-contained Vercel deployment, which bypasses Vercel's normal
"/api/*.py auto-detected as a Python function" behaviour — a fresh project
with no competing build gets that behaviour for free, which is what makes
this a real, verifiable Python interpreter rather than a hand-built guess).

Called over HTTPS by the main app's server route (api.hangar.sagush-hello.ts),
which has ALREADY verified the caller's identity and that they own the
concept — this function itself only checks the shared secret below, proving
the request came from that trusted route and not directly from a browser.
"""
import json
import os
from http.server import BaseHTTPRequestHandler


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        expected_key = os.environ.get("SAGUSH_SERVICE_KEY")
        got_key = self.headers.get("X-Sagush-Key")
        if not expected_key or got_key != expected_key:
            self._respond(401, {"error": "unauthorized"})
            return

        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b""
        try:
            data = json.loads(raw) if raw else {}
        except (json.JSONDecodeError, ValueError):
            data = {}

        self._respond(200, {
            "message": "Hello, World! The Node -> Python bridge is working (on Vercel).",
            "conceptId": data.get("conceptId"),
            "conceptCode": data.get("conceptCode"),
            "source": "vercel-python",
        })

    def _respond(self, status: int, body: dict) -> None:
        payload = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)
