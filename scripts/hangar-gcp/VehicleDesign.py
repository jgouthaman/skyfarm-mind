#!/usr/bin/env python3
"""Bay 03 Vehicle Design -- runs on the TorqWings GCP server (torqwings-serv1).

Lives in ~/Bay3/VehicleDesigner/ (which Apache never serves): the one script
shared by every concept. Called by hangar_runner.py when a user clicks
Generate Design in Bay 03:

    python3 ~/Bay3/VehicleDesigner/VehicleDesign.py <concept code> [concept uuid]

For now it creates the concept's folder, ~/Bay3/<concept code>/, and writes
run.json there. The design generation itself goes here next: write
final_aircraft_design.json and final_aircraft_design.md into the same folder
and Bay 03 shows them.

Prints exactly one JSON line on stdout; exits non-zero on failure.
"""
import json
import os
import re
import sys
from datetime import datetime, timezone

# Concept folders go in Bay3/, the parent of this script's VehicleDesigner/
# folder, unless HANGAR_BAY3_DIR says otherwise.
BAY3_DIR = os.environ.get("HANGAR_BAY3_DIR", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CODE_RE = re.compile(r"^[0-9A-F]{20}$")
UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")


def fail(message):
    print(json.dumps({"ok": False, "error": message}))
    sys.exit(1)


def main():
    if len(sys.argv) < 2:
        fail("usage: VehicleDesign.py <concept code> [concept uuid]")
    code = sys.argv[1].strip().upper()
    if not CODE_RE.match(code):
        fail(f"not a concept code (20 hex characters): {sys.argv[1]!r}")
    concept_id = sys.argv[2].strip().lower() if len(sys.argv) > 2 else None
    if concept_id and not UUID_RE.match(concept_id):
        fail(f"not a concept uuid: {sys.argv[2]!r}")

    folder = os.path.join(BAY3_DIR, code)
    existed = os.path.isdir(folder)
    os.makedirs(folder, exist_ok=True)
    os.chmod(folder, 0o755)  # Apache must be able to read it

    run_file = os.path.join(folder, "run.json")
    with open(run_file, "w", encoding="utf-8") as f:
        json.dump(
            {
                "conceptCode": code,
                "conceptId": concept_id,
                "ranAt": datetime.now(timezone.utc).isoformat(),
                "script": "VehicleDesign.py",
            },
            f,
            indent=2,
        )
    os.chmod(run_file, 0o644)

    print(
        json.dumps(
            {
                "ok": True,
                "conceptCode": code,
                "folder": folder,
                "created": not existed,
                "files": sorted(os.listdir(folder)),
            }
        )
    )


if __name__ == "__main__":
    main()
