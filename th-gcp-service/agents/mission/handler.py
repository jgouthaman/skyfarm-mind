"""
Real agentic handler for Bay 1 -- Mission Agent.

Ports the four stages of The Hangar's production Mission Agent
(src/lib/the-hangar/{intentExtraction,missionDecomposition,
constraintIdentification,domainRules,tradeoffPrioritization}.ts,
spec: reference/the-hangar/MissionAgent.md) to a single stateless Python
module -- same prompts, same domain-rule table, same deterministic
trade-off/confidence-score logic, but with no Supabase persistence, no
mission ownership, no multi-user state. Each call is self-contained: the
caller supplies whatever the stage needs in `payload` (typically the
previous stage's own output, merged with any new fields that stage needs),
and gets that stage's result back. Chaining stages is the caller's job
(exactly how the Test Harness's /t-h UI is used -- run input_processing,
paste its output into the next call's payload, run reasoning_planning,
and so on), not this module's.

Four function_name values, matching src/lib/test-harness/agents.ts's Bay 01
function ids exactly:
  - input_processing   -> ParsedMissionInput-shaped result
  - reasoning_planning  -> MissionReasoningResult-shaped result
  - output_generation  -> MissionSpec-shaped result (mission_specs,
                           constraints, kpis, summary, confidence_score)
  - output_interface   -> wraps output_generation's result as a handoff
                           package for Bay 02 (no real event bus/DB here,
                           so this stage is a thin, honestly-labeled mock)

Needs ANTHROPIC_API_KEY in the environment. Without it, every LLM-backed
step falls back to a clearly-marked mock value (mock: true in the
response) rather than failing the request -- same fallback contract as
llmGateway.ts.

This is the working copy used by the th-gcp-service FastAPI app (see
C:\\Workshop\\Glacier\\skyfarm-mind\\th-gcp-service\\agents\\mission\\handler.py,
which is what's actually imported/deployed) -- keep the two in sync if you
edit one.
"""
import json
import os
import re
from datetime import datetime, timezone
from typing import Any, Optional

AGENT_NAME = "mission"

# ── Anthropic client (lazy import so this module still loads, and the
# other three non-LLM functions still work, even if the package isn't
# installed in a given environment) ─────────────────────────────────────

_MODEL = "claude-sonnet-5"


def _call_llm(system_prompt: str, user_content: str) -> tuple[Optional[str], Optional[dict]]:
    """Returns (text, usage) or (None, None) on any failure/missing key --
    callers fall back to their own mock, same contract as llmGateway.ts's
    callLlmGateway."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None, None
    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model=_MODEL,
            max_tokens=4096,
            system=system_prompt,
            messages=[{"role": "user", "content": user_content}],
        )
        text = next((b.text for b in response.content if b.type == "text"), None)
        usage = {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
        }
        return text, usage
    except Exception:
        return None, None


def _strip_json_fences(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"```\s*$", "", text, flags=re.IGNORECASE)
    return text.strip()


def _parse_json(text: str) -> Optional[dict]:
    try:
        return json.loads(_strip_json_fences(text))
    except (json.JSONDecodeError, TypeError):
        return None


# ── Intent categories (missionIntentCategories.ts) ──────────────────────

INTENT_CATEGORIES = {
    "agriculture": "crop monitoring, spraying, field or farm survey",
    "security_surveillance": "perimeter patrol, monitoring, persistent observation",
    "infrastructure_inspection": "pipelines, power lines, towers, bridges, structures",
    "mapping_survey": "terrain or land mapping, photogrammetry, geospatial survey",
    "emergency_response": "firefighting, water or supply drop, search and rescue, disaster relief",
    "delivery_logistics": "moving parcels, medical supplies or cargo between points",
    "aerial_media": "photography, videography, filming",
    "environmental_monitoring": "wildlife, forestry, water or air quality, coastal observation",
    "other": "none of the above clearly fits",
}
INTENT_CATEGORY_VERTICAL = {
    "agriculture": "AgriSky",
    "security_surveillance": "GuardSky",
    "infrastructure_inspection": "InfraSky",
    "mapping_survey": "GeoSky",
}
FALLBACK_INTENT_CATEGORY = "other"


def _intent_category_prompt_list() -> str:
    return "\n".join(f"- {cid}: {desc}" for cid, desc in INTENT_CATEGORIES.items())


def _normalize_intent_category(raw: Any) -> str:
    if not isinstance(raw, str):
        return FALLBACK_INTENT_CATEGORY
    cid = re.sub(r"[\s&-]+", "_", raw.strip().lower())
    return cid if cid in INTENT_CATEGORIES else FALLBACK_INTENT_CATEGORY


# ── Stage 1 -- Input Processing (MissionAgent.md Section 4.1) ───────────

_INPUT_PROCESSING_SYSTEM = (
    "You are Mission Agent's intent-understanding and entity-extraction step "
    "for TorqWings' aerospace design platform. Given a mission's raw text and "
    "any already-structured requirement fields, identify the mission's intent "
    "(a short free-text description of what the mission is for) and classify "
    "it into exactly one intent_category from the fixed list below, then "
    "extract payload, range, and endurance hints plus any additional "
    "constraint hints. intent_category must be one of these ids exactly -- "
    "if none clearly fits, use \"other\", never invent a new category:\n"
    f"{_intent_category_prompt_list()}\n"
    " Explicit structured field values always win -- if a field is already "
    "stated explicitly, do not re-guess it; only fill in what's genuinely "
    "missing. Return JSON only."
)


def _compute_validation_flags(
    extraction: dict, structured_fields: dict
) -> list[str]:
    """Rules engine (Section 4.1's validateRange/flagMissingRequired),
    simplified: catches obviously-hallucinated numeric hints and flags
    core fields that are still missing after extraction."""
    flags: list[str] = []
    bounds = {
        "payload_hint": (0.1, 150, "kg"),
        "range_hint": (1, 500, "km"),
        "endurance_hint": (5, 480, "min"),
    }
    for field, (lo, hi, unit) in bounds.items():
        hint = extraction.get(field)
        if not hint:
            continue
        match = re.search(r"-?\d+(\.\d+)?", str(hint))
        if not match:
            continue
        value = float(match.group(0))
        if value < lo or value > hi:
            flags.append(
                f"{field} value {value}{unit} is outside the realistic bound "
                f"[{lo}, {hi}]{unit} -- possible hallucination"
            )
    if not extraction.get("payload_hint") and "payload_kg" not in structured_fields:
        flags.append("payload is missing -- not stated and not inferred")
    if not extraction.get("range_hint") and "range_km" not in structured_fields:
        flags.append("range is missing -- not stated and not inferred")
    if not extraction.get("endurance_hint") and "endurance_min" not in structured_fields:
        flags.append("endurance is missing -- not stated and not inferred")
    return flags


def _run_input_processing(payload: dict) -> dict:
    raw_text = str(payload.get("raw_text") or payload.get("raw_text_combined") or "").strip()
    structured_fields = payload.get("structured_fields") or {}
    attached_regulations = payload.get("attached_regulations") or []

    if not raw_text and not structured_fields:
        return {
            "error": "Sources contain no usable content -- provide `raw_text` and/or `structured_fields`.",
        }

    user_content = (
        f"Raw mission text: {raw_text}\n"
        f"Structured fields already provided (do not re-derive these): "
        f"{json.dumps(structured_fields, indent=2)}\n\n"
        'Return:\n{ "intent": "string", "intent_category": "one id from the list", '
        '"payload_hint": "string | null", "range_hint": "string | null", '
        '"endurance_hint": "string | null", "constraint_hints": ["string"] }'
    )

    text, usage = _call_llm(_INPUT_PROCESSING_SYSTEM, user_content)
    parsed = _parse_json(text) if text else None
    mock = parsed is None or not isinstance(parsed.get("intent"), str)

    if mock:
        extraction = {
            "intent": f'Mock intent derived from: "{raw_text[:80]}"',
            "intent_category": FALLBACK_INTENT_CATEGORY,
            "payload_hint": None,
            "range_hint": None,
            "endurance_hint": None,
            "constraint_hints": [],
        }
        usage = None
    else:
        extraction = {
            "intent": parsed["intent"],
            "intent_category": _normalize_intent_category(parsed.get("intent_category")),
            "payload_hint": parsed.get("payload_hint") if isinstance(parsed.get("payload_hint"), str) else None,
            "range_hint": parsed.get("range_hint") if isinstance(parsed.get("range_hint"), str) else None,
            "endurance_hint": parsed.get("endurance_hint") if isinstance(parsed.get("endurance_hint"), str) else None,
            "constraint_hints": [c for c in (parsed.get("constraint_hints") or []) if isinstance(c, str)],
        }

    validation_flags = _compute_validation_flags(extraction, structured_fields)

    return {
        "raw_text_combined": raw_text,
        "structured_fields": structured_fields,
        "detected_intent": extraction["intent"],
        "intent_category": extraction["intent_category"],
        "extracted_entities": {
            "payload_hint": extraction["payload_hint"],
            "range_hint": extraction["range_hint"],
            "endurance_hint": extraction["endurance_hint"],
            "constraint_hints": extraction["constraint_hints"],
        },
        "attached_regulations": attached_regulations,
        "validation_flags": validation_flags,
        "mock": mock,
        "usage": usage,
    }


# ── Stage 2 -- Reasoning & Planning (MissionAgent.md Section 4.2) ───────

_DECOMPOSITION_SYSTEM = (
    "You are Mission Agent's decomposition step for TorqWings' aerospace "
    "design platform. Break the mission into discrete functional elements. "
    "Each element should be a short phrase capturing one distinct aspect of "
    "the mission -- domain/vertical, platform class, operational profile, "
    "regulatory category. Do not invent requirements not implied by the "
    "input. Return JSON only."
)

_CONSTRAINT_KPI_SYSTEM = (
    "You identify constraints a mission implies but the user never stated "
    "explicitly, and derive performance, cost, and safety KPIs for the "
    "mission, in one response. Only infer a constraint if it's a reasonable, "
    "defensible consequence of the mission elements below -- do not "
    "speculate broadly. Tag every constraint you return with source "
    '"inferred". For any KPI already implied directly by a listed '
    "constraint, copy that value -- do not re-derive it. Only infer new KPI "
    "values where no constraint already states one. Stay within realistic "
    "bounds for a small UAS. If you derive a KPI covering payload capacity, "
    "operational range, or flight endurance, name it exactly \"Payload\", "
    '"Range", or "Endurance" respectively -- no other wording or qualifiers '
    "for these three. Every other KPI you derive can be named freely. "
    "Return JSON only."
)

# domainRules.ts, ported verbatim (rule id -> trigger/constraints/source).
_DOMAIN_RULES = [
    {
        "id": "REG-001",
        "matches": lambda ctx: "FAR_107" in ctx["attached_regulations"],
        "constraints": [{"name": "Max altitude", "value": "122m AGL (400ft)"}, {"name": "VLOS required", "value": "true"}],
        "source": "regulation",
    },
    {
        "id": "REG-002",
        "matches": lambda ctx: "EASA_SORA" in ctx["attached_regulations"],
        "constraints": [{"name": "Formal risk assessment", "value": "required"}, {"name": "Operational category", "value": "must be declared"}],
        "source": "regulation",
    },
    {
        "id": "REG-003",
        "matches": lambda ctx: "DGCA_CAR_S3" in ctx["attached_regulations"] or "DGCA_CAR_SECTION_3" in ctx["attached_regulations"],
        "constraints": [
            {"name": "Weight category", "value": "Nano <250g / Micro <2kg / Small <25kg / Medium <150kg"},
            {"name": "Registration", "value": "required"},
        ],
        "source": "regulation",
    },
    {
        "id": "REG-004",
        "matches": lambda ctx: "MIL_STD_810" in ctx["attached_regulations"],
        "constraints": [{"name": "Environmental hardening", "value": "required (temperature, vibration, humidity resistance)"}],
        "source": "regulation",
    },
    {
        "id": "FORM-001",
        "matches": lambda ctx: ctx["payload_kg"] is not None and ctx["payload_kg"] > 25,
        "constraints": [{"name": "Payload category", "value": "exceeds small-UAS category -- additional certification constraint"}],
        "source": "user",
    },
    {
        "id": "FORM-002",
        "matches": lambda ctx: ctx["altitude_ceiling_m"] is not None and ctx["altitude_ceiling_m"] > 120,
        "constraints": [{"name": "Altitude ceiling", "value": "beyond standard VLOS ceiling -- special permission constraint"}],
        "source": "user",
    },
    {
        "id": "FORM-003",
        "matches": lambda ctx: (ctx["operating_environment"] or "").lower() == "urban",
        "constraints": [{"name": "Noise", "value": "constraint applies"}, {"name": "Population density", "value": "safety constraint applies"}],
        "source": "user",
    },
    {
        "id": "FORM-004",
        "matches": lambda ctx: (ctx["operating_environment"] or "").lower() == "coastal / maritime",
        "constraints": [{"name": "Corrosion resistance", "value": "waterproofing required"}],
        "source": "user",
    },
    {
        "id": "FORM-005",
        "matches": lambda ctx: ctx["budget_band"] == "Under ₹5L",
        "constraints": [{"name": "Component sourcing", "value": "cost-conscious -- COTS preference"}],
        "source": "user",
    },
    {
        "id": "DOM-001",
        "matches": lambda ctx: _contains_any(ctx["decomposed_elements"], ["crop", "agricultur", "farm"]),
        "constraints": [{"name": "Spray-drift avoidance", "value": "low-altitude flight path required"}],
        "source": "inferred",
    },
    {
        "id": "DOM-002",
        "matches": lambda ctx: _contains_any(ctx["decomposed_elements"], ["perimeter", "security", "surveillance"]),
        "constraints": [{"name": "Loiter endurance", "value": "persistent-loiter endurance constraint"}],
        "source": "inferred",
    },
    {
        "id": "DOM-003",
        "matches": lambda ctx: _contains_any(ctx["decomposed_elements"], ["pipeline", "infrastructure", "inspection"]),
        "constraints": [{"name": "BVLOS", "value": "beyond visual line of sight constraint"}],
        "source": "inferred",
    },
    {
        "id": "DOM-004",
        "matches": lambda ctx: _contains_any(ctx["decomposed_elements"], ["mapping", "survey", "terrain"]),
        "constraints": [{"name": "Imaging payload", "value": "high-resolution imaging payload constraint"}],
        "source": "inferred",
    },
]


def _contains_any(elements: list[str], keywords: list[str]) -> bool:
    text = " ".join(elements).lower()
    return any(k in text for k in keywords)


def _evaluate_domain_rules(ctx: dict) -> list[dict]:
    results = []
    for rule in _DOMAIN_RULES:
        if not rule["matches"](ctx):
            continue
        for c in rule["constraints"]:
            results.append({**c, "source": rule["source"], "source_label": rule["id"]})
    return results


def _parse_leading_number(text: Optional[str]) -> Optional[float]:
    if not text:
        return None
    match = re.search(r"-?\d+(\.\d+)?", text)
    return float(match.group(0)) if match else None


def _run_reasoning_planning(payload: dict) -> dict:
    detected_intent = str(payload.get("detected_intent") or "")
    extracted_entities = payload.get("extracted_entities") or {}
    structured_fields = payload.get("structured_fields") or {}
    attached_regulations = payload.get("attached_regulations") or []

    if not detected_intent:
        return {"error": "Payload must include `detected_intent` (paste input_processing's output here)."}

    # Step 1 -- Mission Decomposition
    decomp_user = (
        f"Mission intent: {detected_intent}\n"
        f"Extracted entities: {json.dumps(extracted_entities, indent=2)}\n\n"
        'Return:\n{ "decomposed_elements": ["string", ...] }'
    )
    text, usage1 = _call_llm(_DECOMPOSITION_SYSTEM, decomp_user)
    parsed = _parse_json(text) if text else None
    decomposed_elements = (
        [e for e in parsed["decomposed_elements"] if isinstance(e, str)]
        if parsed and isinstance(parsed.get("decomposed_elements"), list)
        else None
    )
    decomposition_mock = not decomposed_elements
    if decomposition_mock:
        decomposed_elements = [f'Mock decomposition of intent: "{detected_intent[:80]}"']
        usage1 = None

    # Step 2a -- Domain rules (deterministic)
    ctx = {
        "decomposed_elements": decomposed_elements,
        "attached_regulations": attached_regulations,
        "payload_kg": structured_fields.get("payload_kg") or _parse_leading_number(extracted_entities.get("payload_hint")),
        "altitude_ceiling_m": structured_fields.get("altitude_ceiling"),
        "operating_environment": structured_fields.get("operating_environment"),
        "budget_band": structured_fields.get("budget_band"),
    }
    rule_constraints = _evaluate_domain_rules(ctx)
    known_constraints = rule_constraints + [
        {"name": hint, "value": "", "source": "inferred", "source_label": "Stage 2.1 hint"}
        for hint in (extracted_entities.get("constraint_hints") or [])
    ]

    # Step 2b + 3 -- combined LLM call: constraint inference + KPI derivation
    ck_user = (
        f"Decomposed mission elements: {json.dumps(decomposed_elements, indent=2)}\n"
        f"Constraints already known (do not repeat these): {json.dumps(known_constraints, indent=2)}\n\n"
        'Return:\n{ "identified_constraints": [ { "name": "string", "value": "string", "source": "inferred" } ], '
        '"derived_kpis": [ { "name": "string", "target": "string", "unit": "string" } ] }'
    )
    text2, usage2 = _call_llm(_CONSTRAINT_KPI_SYSTEM, ck_user)
    parsed2 = _parse_json(text2) if text2 else None
    ck_mock = not (parsed2 and isinstance(parsed2.get("identified_constraints"), list) and isinstance(parsed2.get("derived_kpis"), list))

    if ck_mock:
        derived_kpis = []
        for field, (name, unit) in (("payload_hint", ("Payload", "kg")), ("range_hint", ("Range", "km")), ("endurance_hint", ("Endurance", "min"))):
            hint = extracted_entities.get(field)
            if hint:
                derived_kpis.append({"name": name, "target": hint, "unit": unit})
        identified_constraints = known_constraints
        usage2 = None
    else:
        llm_constraints = [
            {"name": c["name"], "value": c["value"], "source": "inferred", "source_label": "LLM inference (Stage 2.2)"}
            for c in parsed2["identified_constraints"]
            if isinstance(c, dict) and isinstance(c.get("name"), str) and isinstance(c.get("value"), str)
        ]
        identified_constraints = known_constraints + llm_constraints
        derived_kpis = [
            {"name": k["name"], "target": k["target"], "unit": k["unit"]}
            for k in parsed2["derived_kpis"]
            if isinstance(k, dict) and all(isinstance(k.get(f), str) for f in ("name", "target", "unit"))
        ]

    # Structured-field KPI overrides always win (payload_kg/range_km/endurance_min).
    for field, (name, unit) in (("payload_kg", ("Payload", "kg")), ("range_km", ("Range", "km")), ("endurance_min", ("Endurance", "min"))):
        value = structured_fields.get(field)
        if not isinstance(value, (int, float)):
            continue
        idx = next((i for i, k in enumerate(derived_kpis) if k["name"].strip().lower() == name.lower()), None)
        kpi = {"name": name, "target": str(value), "unit": unit}
        if idx is not None:
            derived_kpis[idx] = kpi
        else:
            derived_kpis.append(kpi)

    # Step 4 -- Trade-off prioritization (deterministic, no LLM)
    prioritized_tradeoffs = _prioritize_tradeoffs(
        identified_constraints, derived_kpis, extracted_entities.get("constraint_hints") or []
    )

    usage = None
    if usage1 or usage2:
        usage = {
            "input_tokens": (usage1["input_tokens"] if usage1 else 0) + (usage2["input_tokens"] if usage2 else 0),
            "output_tokens": (usage1["output_tokens"] if usage1 else 0) + (usage2["output_tokens"] if usage2 else 0),
        }

    return {
        "decomposed_elements": decomposed_elements,
        "identified_constraints": identified_constraints,
        "derived_kpis": derived_kpis,
        "prioritized_tradeoffs": prioritized_tradeoffs,
        "mock": decomposition_mock or ck_mock,
        "usage": usage,
    }


_CATEGORY_KEYWORDS = {
    "performance": ["range", "endurance", "altitude", "speed"],
    "cost": ["cost", "budget", "price"],
    "payload": ["payload", "capacity"],
    "schedule": ["schedule", "build", "complexity", "timeline", "lead time"],
}
_CATEGORY_LABELS = {
    "performance": "Performance (range, endurance, altitude)",
    "cost": "Cost",
    "payload": "Payload capability",
    "schedule": "Schedule / build complexity",
}
_DEFAULT_WEIGHTS = {"performance": 35, "cost": 30, "payload": 20, "schedule": 15}
_EMPHASIS_RE = re.compile(r"\b(maxim(?:um|ize)|priorit(?:y|ize)|most important|critical|primary)\b", re.IGNORECASE)
_DEPRIORITIZE_RE = re.compile(r"\b(not a concern|doesn'?t matter|not important|not a priority|no constraint on)\b", re.IGNORECASE)


def _is_gate_tier(c: dict) -> bool:
    return c.get("source") == "regulation" or bool(re.search(r"safety", f"{c.get('name', '')} {c.get('value', '')}", re.IGNORECASE))


def _categorize_kpi(kpi: dict) -> Optional[str]:
    name = kpi["name"].lower()
    for category, keywords in _CATEGORY_KEYWORDS.items():
        if any(kw in name for kw in keywords):
            return category
    return None


def _format_kpi_item(kpi: dict) -> str:
    unit = f" {kpi['unit']}" if kpi.get("unit") else ""
    return f"{kpi['name']} (target: {kpi['target']}{unit})"


def _prioritize_tradeoffs(constraints: list[dict], kpis: list[dict], priority_signals: list[str]) -> list[dict]:
    gate_tier = [
        {
            "item": f"{c['name']}: {c['value']}",
            "rationale": (
                "Gate tier -- regulatory compliance constraint, never traded away against anything."
                if c.get("source") == "regulation"
                else "Gate tier -- safety constraint, never traded away against anything."
            ),
        }
        for c in constraints
        if _is_gate_tier(c)
    ]

    weights = dict(_DEFAULT_WEIGHTS)
    overrides: list[dict] = []
    for signal in priority_signals:
        for clause in re.split(r"[,;.]|\bwhile\b|\bbut\b", signal, flags=re.IGNORECASE):
            clause = clause.strip()
            if not clause:
                continue
            lower = clause.lower()
            for category, keywords in _CATEGORY_KEYWORDS.items():
                if not any(kw in lower for kw in keywords):
                    continue
                if _EMPHASIS_RE.search(clause):
                    overrides.append({"category": category, "direction": "emphasize", "signal": signal})
                    weights[category] = 100
                if _DEPRIORITIZE_RE.search(clause):
                    overrides.append({"category": category, "direction": "deprioritize", "signal": signal})
                    weights[category] = -1

    scored = sorted(
        ({"kpi": k, "category": _categorize_kpi(k)} for k in kpis),
        key=lambda s: weights.get(s["category"], 0) if s["category"] else 0,
        reverse=True,
    )

    score_tier = []
    for s in scored:
        kpi, category = s["kpi"], s["category"]
        override = next((o for o in overrides if o["category"] == category), None) if category else None
        if override:
            verb = "prioritized over the other criteria" if override["direction"] == "emphasize" else "deprioritized below the other criteria"
            rationale = f'{_CATEGORY_LABELS[override["category"]]} {verb} -- user signaled: "{override["signal"]}"'
        elif not category:
            rationale = "Uncategorized KPI -- no default weighting bucket matched; ranked last among score-tier items."
        else:
            rationale = f"{_CATEGORY_LABELS[category]} -- {weights[category]}% default weight."
        score_tier.append({"item": _format_kpi_item(kpi), "rationale": rationale})

    return gate_tier + score_tier


# ── Stage 3 -- Output Generation (MissionAgent.md Section 4.3) ──────────

_SUMMARY_SYSTEM = (
    "Write a concise, plain-language summary of this mission for a human "
    "reviewer to confirm before it's saved. 3-5 sentences. State the "
    "mission type, the platform class, the top 2-3 constraints, and the "
    "primary KPI targets. Do not introduce any information not present in "
    "the structured input below -- this is a summary, not a new inference."
)


def _dedupe_constraints(constraints: list[dict]) -> list[dict]:
    """Simplified Section 4.3.1 Step 2 dedup: same name -> keep one entry,
    merge sources. (The full TS version prefers the more restrictive value
    on a true conflict; this keeps the first value and records every
    contributing source, which is the traceability-preserving part.)"""
    by_name: dict[str, dict] = {}
    for c in constraints:
        key = c["name"].strip().lower()
        if key not in by_name:
            by_name[key] = {"name": c["name"], "value": c["value"], "sources": [c.get("source_label", c.get("source", "unknown"))]}
        else:
            label = c.get("source_label", c.get("source", "unknown"))
            if label not in by_name[key]["sources"]:
                by_name[key]["sources"].append(label)
    return list(by_name.values())


def _assemble_mission_specs(payload: dict) -> dict:
    intent_category = payload.get("intent_category")
    decomposed_elements = payload.get("decomposed_elements") or []
    extracted_entities = payload.get("extracted_entities") or {}
    vertical = INTENT_CATEGORY_VERTICAL.get(intent_category)
    if not vertical:
        for cat, vert in INTENT_CATEGORY_VERTICAL.items():
            if any(
                kw in " ".join(decomposed_elements).lower()
                for kw in {
                    "AgriSky": ["crop", "agricultur", "farm"],
                    "GuardSky": ["perimeter", "security", "surveillance"],
                    "InfraSky": ["pipeline", "infrastructure", "inspection"],
                    "GeoSky": ["mapping", "survey", "terrain"],
                }[vert]
            ):
                vertical = vert
                break
    return {
        "domain": INTENT_CATEGORIES.get(intent_category, "other"),
        "vertical": vertical,
        "mission_type": intent_category or "other",
        "decomposed_elements": decomposed_elements,
        "key_operating_parameters": extracted_entities,
    }


def _finalize_kpis(derived_kpis: list[dict], prioritized_tradeoffs: list[dict], constraints: list[dict]) -> list[dict]:
    gate_constraint_names = {c["name"].lower() for c in constraints if _is_gate_tier(c)}
    tradeoff_rank = {t["item"]: i for i, t in enumerate(prioritized_tradeoffs)}
    result = []
    for kpi in derived_kpis:
        item = _format_kpi_item(kpi)
        if kpi["name"].lower() in gate_constraint_names:
            priority = "critical"
        elif item in tradeoff_rank:
            priority = tradeoff_rank[item] + 1
        else:
            priority = "unranked"
        result.append({**kpi, "priority": priority})
    return result


def _compute_confidence_score(
    source_types_used_count: int, derived_kpis: list[dict], validation_flag_count: int
) -> float:
    source_completeness = min(source_types_used_count / 3, 1)
    core_fields = {"payload", "range", "endurance"}
    present = sum(1 for k in derived_kpis if k["name"].strip().lower() in core_fields)
    field_completeness = present / len(core_fields)
    score = 0.4 * source_completeness + 0.4 * field_completeness - 0.05 * validation_flag_count
    return max(0.0, round(score, 2))


def _run_output_generation(payload: dict) -> dict:
    decomposed_elements = payload.get("decomposed_elements")
    identified_constraints = payload.get("identified_constraints")
    derived_kpis = payload.get("derived_kpis")
    prioritized_tradeoffs = payload.get("prioritized_tradeoffs")
    if decomposed_elements is None or identified_constraints is None or derived_kpis is None:
        return {
            "error": "Payload must include reasoning_planning's output (decomposed_elements, "
            "identified_constraints, derived_kpis, prioritized_tradeoffs) plus input_processing's "
            "intent_category/extracted_entities."
        }
    prioritized_tradeoffs = prioritized_tradeoffs or []

    mission_specs = _assemble_mission_specs(payload)
    constraints = _dedupe_constraints(identified_constraints)
    kpis = _finalize_kpis(derived_kpis, prioritized_tradeoffs, identified_constraints)

    summary_user = (
        f"Mission specification: {json.dumps(mission_specs, indent=2)}\n"
        f"Constraints: {json.dumps(constraints, indent=2)}\n"
        f"KPIs: {json.dumps(kpis, indent=2)}\n\n"
        'Return: { "summary": "string" }'
    )
    text, usage = _call_llm(_SUMMARY_SYSTEM, summary_user)
    parsed = _parse_json(text) if text else None
    summary = parsed.get("summary") if parsed and isinstance(parsed.get("summary"), str) else None
    mock = summary is None
    if mock:
        summary = (
            f"[mock summary] {mission_specs.get('mission_type', 'Mission')} "
            f"with {len(constraints)} constraint(s) and {len(kpis)} KPI(s) identified."
        )
        usage = None

    source_types_used_count = payload.get("source_types_used_count")
    if not isinstance(source_types_used_count, int):
        source_types_used_count = len(payload.get("source_types_used") or []) or 1
    validation_flag_count = len(payload.get("validation_flags") or [])
    confidence_score = _compute_confidence_score(source_types_used_count, derived_kpis, validation_flag_count)

    return {
        "mission_specs": mission_specs,
        "constraints": constraints,
        "kpis": kpis,
        "summary": summary,
        "confidence_score": confidence_score,
        "mock": mock,
        "usage": usage,
    }


# ── Stage 4 -- Output Interface (MissionAgent.md Section 4.4) ───────────
#
# No Supabase/event bus here -- this is a stateless GCP function, not The
# Hangar's DB-backed pipeline. Persistence/dashboard/export/event-publish
# are each labeled for what they'd be in the real system vs. what actually
# happens here (nothing stored, no bus, no file generated).


def _run_output_interface(payload: dict) -> dict:
    mission_specs = payload.get("mission_specs")
    if mission_specs is None:
        return {"error": "Payload must include output_generation's result (mission_specs, constraints, kpis, summary, confidence_score)."}

    return {
        "status": "spec_ready",
        "mission_spec": {
            "mission_specs": mission_specs,
            "constraints": payload.get("constraints") or [],
            "kpis": payload.get("kpis") or [],
            "summary": payload.get("summary"),
            "confidence_score": payload.get("confidence_score"),
        },
        "structured_data_api": "this response body -- no separate persistence in this stateless GCP stub",
        "dashboard_view": "not applicable -- no UI here, this is the GCP-side handler",
        "export": {"status": "not generated -- real Hangar export is client-side/on-demand, out of scope here"},
        "event_publish": {
            "event_type": "mission.spec_ready",
            "status": "mock -- no Hangar_events table/consumer in this stateless path",
        },
        "handoff_to": "Bay 02 -- Concept Agent",
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# ── Entry point ───────────────────────────────────────────────────────

_HANDLERS = {
    "input_processing": _run_input_processing,
    "reasoning_planning": _run_reasoning_planning,
    "output_generation": _run_output_generation,
    "output_interface": _run_output_interface,
}


def handle(function_name: str, payload: object) -> dict:
    handler = _HANDLERS.get(function_name)
    if handler is None:
        return {
            "agent_name": AGENT_NAME,
            "function_name": function_name,
            "status": "error",
            "error": f"Unknown function_name '{function_name}' for {AGENT_NAME}. "
            f"Expected one of: {', '.join(_HANDLERS)}.",
        }

    payload_dict = payload if isinstance(payload, dict) else {}
    try:
        result = handler(payload_dict)
    except Exception as exc:  # noqa: BLE001 -- surface any failure as a structured error, never a raw 500
        return {
            "agent_name": AGENT_NAME,
            "function_name": function_name,
            "status": "error",
            "error": f"{type(exc).__name__}: {exc}",
        }

    status = "error" if "error" in result else "ok"
    return {
        "agent_name": AGENT_NAME,
        "function_name": function_name,
        "status": status,
        **result,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
