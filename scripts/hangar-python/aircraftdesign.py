#!/usr/bin/env python3
"""Hangar Bay 03 prototype -- "Trigger Sagush", step 2 of 2.

Takes the concept id/code confirmed in step 1 (hello.py) and returns a design
spec for "Aircraft Sagush". The numbers below are a FIXED PLACEHOLDER, not a
real computed design -- same "specified now, built when needed" pattern this
codebase already uses for other stubbed pieces (see exportAndEventStubs.ts).
The point of this script is proving the Node -> Python -> page pipeline works
end to end for a real design-generation script to replace later, not
producing an actual engineering result.

Contract: print exactly ONE line of JSON to stdout and nothing else there.
"""
import json
import sys


def main() -> int:
    concept_id = sys.argv[1] if len(sys.argv) > 1 else None
    concept_code = sys.argv[2] if len(sys.argv) > 2 else None
    design_spec = {
        "aircraftName": "Sagush",
        "vehicleClass": "Fixed-wing UAV",
        "wingspanM": 2.4,
        "lengthM": 1.6,
        "grossWeightKg": 8.5,
        "wingAreaM2": 0.62,
        "cruiseSpeedKmh": 65,
        "propulsion": "Electric pusher propeller",
        "notes": "Placeholder design spec from aircraftdesign.py -- not a real computed result.",
    }
    print(json.dumps({
        "conceptId": concept_id,
        "conceptCode": concept_code,
        "designSpec": design_spec,
    }))
    return 0


if __name__ == "__main__":
    sys.exit(main())
