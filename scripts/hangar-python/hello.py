#!/usr/bin/env python3
"""Hangar Bay 03 prototype -- "Trigger Sagush", step 1 of 2.

Proves the Node -> Python bridge works before the real step (aircraftdesign.py)
runs. Called by pythonRunner.ts with the selected concept's id and code as
plain command-line arguments -- this script does no I/O of its own (no file,
network or database access), so it stays trivially safe to invoke.

Contract: print exactly ONE line of JSON to stdout and nothing else there.
Anything for a human to read (debug output, etc.) belongs on stderr instead --
pythonRunner.ts only parses stdout.
"""
import json
import sys


def main() -> int:
    concept_id = sys.argv[1] if len(sys.argv) > 1 else None
    concept_code = sys.argv[2] if len(sys.argv) > 2 else None
    print(json.dumps({
        "message": "Hello, World! The Node -> Python bridge is working.",
        "conceptId": concept_id,
        "conceptCode": concept_code,
    }))
    return 0


if __name__ == "__main__":
    sys.exit(main())
