"""Vercel Python Serverless Function — Sagush prototype, step 2 of 2.

Same trust model as sagush_hello.py (shared-secret header, called only by the
main app's already-authenticated server route). Returns a design spec for
"Aircraft Sagush" — a FIXED PLACEHOLDER, not a real computed design, until the
real physics/math generation code replaces this body.
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

        design_spec = {
            "aircraftName": "Sagush",
            "vehicleClass": "Fixed-wing UAV",
            "wingspanM": 2.4,
            "lengthM": 1.6,
            "grossWeightKg": 8.5,
            "wingAreaM2": 0.62,
            "cruiseSpeedKmh": 65,
            "propulsion": "Electric pusher propeller",
            "notes": "Placeholder design spec from sagush_design.py (Vercel) — not a real computed result.",
        }
        self._respond(200, {
            "conceptId": data.get("conceptId"),
            "conceptCode": data.get("conceptCode"),
            "designSpec": design_spec,
            "source": "vercel-python",
        })

    def _respond(self, status: int, body: dict) -> None:
        payload = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)
