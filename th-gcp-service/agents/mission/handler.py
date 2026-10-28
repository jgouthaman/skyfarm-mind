"""
Real agentic handler for Bay 1 -- Mission Agent.

Ports the four stages of The Hangar's production Mission Agent
(src/lib/the-hangar/{intentExtraction,missionDecomposition,
constraintIdentification,domainRules,tradeoffPrioritization}.ts,
spec: reference/the-hangar/MissionAgent.md) to a single stateless Python
module -- same prompts, same domain-rule table, same deterministic
trade-off/confidence-score logic, but with no Supabase persistence, no
mission ownership, no multi-user state.

Five function_name values:
  - input_processing   -> ParsedMissionInput-shaped result (fixed stage)
  - reasoning_planning  -> MissionReasoningResult-shaped result (fixed stage)
  - output_generation  -> MissionSpec-shaped result (fixed stage)
  - output_interface   -> handoff package for Bay 02 (fixed stage)
  - agentic_run         -> genuinely agentic: Claude itself decides which
                           of the underlying capabilities to call and in
                           what order (Anthropic tool-use loop), rather
                           than running the four stages in a fixed
                           sequence. See "Agentic mode" below.

The four fixed-stage functions chain manually -- the caller supplies
whatever a stage needs in `payload` (typically the previous stage's own
output), and gets that stage's result back. They stay as they were (PR
#65): useful for testing one stage in isolation, and for comparing
against agentic_run's behavior on the same input.

Needs ANTHROPIC_API_KEY in the environment. Without it, every LLM-backed
step -- fixed-stage or agentic -- falls back to a clearly-marked mock
value (mock: true) rather than failing the request.

── Agentic mode (`agentic_run`) ─────────────────────────────────────────

The fixed stages above call the LLM at hardcoded points in a hardcoded
order -- that's an LLM-assisted pipeline, not agentic AI: the model never
decides what to do next, never re-does a step it judges incomplete, never
skips a step it judges unnecessary.

`agentic_run` is different: Claude is given six tools (the same
underlying capabilities as the four fixed stages, just broken into finer
pieces) and one goal -- produce a complete MissionSpec -- and decides
itself which tools to call, in what order, and whether to re-call one if
an earlier result looks thin or wrong. The loop runs until Claude calls
`finalize_mission_spec` (its "I'm done" signal) or a hard iteration cap
is hit. This is the real distinction: the fixed stages encode a human's
decision about the right sequence; agentic_run lets the model make that
decision, call by call, and self-correct within the same run.

Tools given to the agent:
  - extract_intent_and_entities   (Stage 1's LLM call)
  - decompose_mission             (Stage 2 Step 1's LLM call)
  - check_domain_rules            (Stage 2 Step 2a, deterministic)
  - infer_constraints_and_kpis    (Stage 2 Steps 2b+3's LLM call)
  - prioritize_tradeoffs          (Stage 2 Step 4, deterministic)
  - finalize_mission_spec         (Stage 3 assembly + summary LLM call +
                                   confidence score -- also the loop's
                                   termination signal)

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


def _compute_validation_flags(extraction: dict, structured_fields: dict) -> list[str]:
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


def _extract_intent_and_entities(
    raw_text: str, structured_fields: dict, attached_regulations: list[str]
) -> dict:
    """Core of Stage 1. Reused directly by `_run_input_processing` (fixed
    stage) and by the `extract_intent_and_entities` tool (agentic mode)."""
    if not raw_text and not structured_fields:
        return {"error": "Provide `raw_text` and/or `structured_fields` -- nothing usable was given."}

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


def _run_input_processing(payload: dict) -> dict:
    raw_text = str(payload.get("raw_text") or payload.get("raw_text_combined") or "").strip()
    structured_fields = payload.get("structured_fields") or {}
    attached_regulations = payload.get("attached_regulations") or []
    return _extract_intent_and_entities(raw_text, structured_fields, attached_regulations)


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


def _decompose_mission(detected_intent: str, extracted_entities: dict) -> dict:
    """Stage 2 Step 1. Reused by the fixed stage and the `decompose_mission` tool."""
    if not detected_intent:
        return {"error": "`detected_intent` is required (e.g. from extract_intent_and_entities's output)."}
    decomp_user = (
        f"Mission intent: {detected_intent}\n"
        f"Extracted entities: {json.dumps(extracted_entities, indent=2)}\n\n"
        'Return:\n{ "decomposed_elements": ["string", ...] }'
    )
    text, usage = _call_llm(_DECOMPOSITION_SYSTEM, decomp_user)
    parsed = _parse_json(text) if text else None
    decomposed_elements = (
        [e for e in parsed["decomposed_elements"] if isinstance(e, str)]
        if parsed and isinstance(parsed.get("decomposed_elements"), list)
        else None
    )
    mock = not decomposed_elements
    if mock:
        decomposed_elements = [f'Mock decomposition of intent: "{detected_intent[:80]}"']
        usage = None
    return {"decomposed_elements": decomposed_elements, "mock": mock, "usage": usage}


def _check_domain_rules(
    decomposed_elements: list[str],
    attached_regulations: list[str],
    structured_fields: dict,
    constraint_hints: list[str],
) -> dict:
    """Stage 2 Step 2a (deterministic, no LLM). Reused by the fixed stage
    and the `check_domain_rules` tool."""
    ctx = {
        "decomposed_elements": decomposed_elements,
        "attached_regulations": attached_regulations,
        "payload_kg": structured_fields.get("payload_kg"),
        "altitude_ceiling_m": structured_fields.get("altitude_ceiling"),
        "operating_environment": structured_fields.get("operating_environment"),
        "budget_band": structured_fields.get("budget_band"),
    }
    rule_constraints = _evaluate_domain_rules(ctx)
    hint_constraints = [
        {"name": hint, "value": "", "source": "inferred", "source_label": "Stage 2.1 hint"}
        for hint in constraint_hints
    ]
    return {"known_constraints": rule_constraints + hint_constraints}


def _infer_constraints_and_kpis(
    decomposed_elements: list[str], known_constraints: list[dict], structured_fields: dict
) -> dict:
    """Stage 2 Steps 2b+3 (one combined LLM call). Reused by the fixed
    stage and the `infer_constraints_and_kpis` tool."""
    ck_user = (
        f"Decomposed mission elements: {json.dumps(decomposed_elements, indent=2)}\n"
        f"Constraints already known (do not repeat these): {json.dumps(known_constraints, indent=2)}\n\n"
        'Return:\n{ "identified_constraints": [ { "name": "string", "value": "string", "source": "inferred" } ], '
        '"derived_kpis": [ { "name": "string", "target": "string", "unit": "string" } ] }'
    )
    text, usage = _call_llm(_CONSTRAINT_KPI_SYSTEM, ck_user)
    parsed = _parse_json(text) if text else None
    mock = not (parsed and isinstance(parsed.get("identified_constraints"), list) and isinstance(parsed.get("derived_kpis"), list))

    if mock:
        derived_kpis = []
        identified_constraints = known_constraints
        usage = None
    else:
        llm_constraints = [
            {"name": c["name"], "value": c["value"], "source": "inferred", "source_label": "LLM inference (Stage 2.2)"}
            for c in parsed["identified_constraints"]
            if isinstance(c, dict) and isinstance(c.get("name"), str) and isinstance(c.get("value"), str)
        ]
        identified_constraints = known_constraints + llm_constraints
        derived_kpis = [
            {"name": k["name"], "target": k["target"], "unit": k["unit"]}
            for k in parsed["derived_kpis"]
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

    return {"identified_constraints": identified_constraints, "derived_kpis": derived_kpis, "mock": mock, "usage": usage}


def _run_reasoning_planning(payload: dict) -> dict:
    detected_intent = str(payload.get("detected_intent") or "")
    extracted_entities = payload.get("extracted_entities") or {}
    structured_fields = payload.get("structured_fields") or {}
    attached_regulations = payload.get("attached_regulations") or []
    constraint_hints = extracted_entities.get("constraint_hints") or []

    decomp = _decompose_mission(detected_intent, extracted_entities)
    if "error" in decomp:
        return decomp
    decomposed_elements = decomp["decomposed_elements"]

    rules = _check_domain_rules(decomposed_elements, attached_regulations, structured_fields, constraint_hints)
    ck = _infer_constraints_and_kpis(decomposed_elements, rules["known_constraints"], structured_fields)

    prioritized_tradeoffs = _prioritize_tradeoffs(ck["identified_constraints"], ck["derived_kpis"], constraint_hints)

    usage = None
    if decomp["usage"] or ck["usage"]:
        usage = {
            "input_tokens": (decomp["usage"]["input_tokens"] if decomp["usage"] else 0) + (ck["usage"]["input_tokens"] if ck["usage"] else 0),
            "output_tokens": (decomp["usage"]["output_tokens"] if decomp["usage"] else 0) + (ck["usage"]["output_tokens"] if ck["usage"] else 0),
        }

    return {
        "decomposed_elements": decomposed_elements,
        "identified_constraints": ck["identified_constraints"],
        "derived_kpis": ck["derived_kpis"],
        "prioritized_tradeoffs": prioritized_tradeoffs,
        "mock": decomp["mock"] or ck["mock"],
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


def _assemble_mission_specs(
    intent_category: Optional[str], decomposed_elements: list[str], extracted_entities: dict
) -> dict:
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


def _compute_confidence_score(source_types_used_count: int, derived_kpis: list[dict], validation_flag_count: int) -> float:
    source_completeness = min(source_types_used_count / 3, 1)
    core_fields = {"payload", "range", "endurance"}
    present = sum(1 for k in derived_kpis if k["name"].strip().lower() in core_fields)
    field_completeness = present / len(core_fields)
    score = 0.4 * source_completeness + 0.4 * field_completeness - 0.05 * validation_flag_count
    return max(0.0, round(score, 2))


def _generate_summary(mission_specs: dict, constraints: list[dict], kpis: list[dict]) -> tuple[str, bool, Optional[dict]]:
    summary_user = (
        f"Mission specification: {json.dumps(mission_specs, indent=2)}\n"
        f"Constraints: {json.dumps(constraints, indent=2)}\n"
        f"KPIs: {json.dumps(kpis, indent=2)}\n\n"
        'Return: { "summary": "string" }'
    )
    text, usage = _call_llm(_SUMMARY_SYSTEM, summary_user)
    parsed = _parse_json(text) if text else None
    summary = parsed.get("summary") if parsed and isinstance(parsed.get("summary"), str) else None
    if summary is None:
        summary = (
            f"[mock summary] {mission_specs.get('mission_type', 'Mission')} "
            f"with {len(constraints)} constraint(s) and {len(kpis)} KPI(s) identified."
        )
        return summary, True, None
    return summary, False, usage


def _finalize_mission_spec(
    intent_category: Optional[str],
    decomposed_elements: list[str],
    extracted_entities: dict,
    identified_constraints: list[dict],
    derived_kpis: list[dict],
    prioritized_tradeoffs: list[dict],
    source_types_used_count: int,
    validation_flags: list[str],
) -> dict:
    """Stage 3's full assembly. Reused by the fixed stage (via
    `_run_output_generation`) and the `finalize_mission_spec` tool, which
    is also the agentic loop's termination signal."""
    mission_specs = _assemble_mission_specs(intent_category, decomposed_elements, extracted_entities)
    constraints = _dedupe_constraints(identified_constraints)
    kpis = _finalize_kpis(derived_kpis, prioritized_tradeoffs, identified_constraints)
    summary, summary_mock, usage = _generate_summary(mission_specs, constraints, kpis)
    confidence_score = _compute_confidence_score(source_types_used_count, derived_kpis, len(validation_flags))

    return {
        "mission_specs": mission_specs,
        "constraints": constraints,
        "kpis": kpis,
        "summary": summary,
        "confidence_score": confidence_score,
        "mock": summary_mock,
        "usage": usage,
    }


def _run_output_generation(payload: dict) -> dict:
    decomposed_elements = payload.get("decomposed_elements")
    identified_constraints = payload.get("identified_constraints")
    derived_kpis = payload.get("derived_kpis")
    if decomposed_elements is None or identified_constraints is None or derived_kpis is None:
        return {
            "error": "Payload must include reasoning_planning's output (decomposed_elements, "
            "identified_constraints, derived_kpis, prioritized_tradeoffs) plus input_processing's "
            "intent_category/extracted_entities."
        }
    source_types_used_count = payload.get("source_types_used_count")
    if not isinstance(source_types_used_count, int):
        source_types_used_count = len(payload.get("source_types_used") or []) or 1

    return _finalize_mission_spec(
        intent_category=payload.get("intent_category"),
        decomposed_elements=decomposed_elements,
        extracted_entities=payload.get("extracted_entities") or {},
        identified_constraints=identified_constraints,
        derived_kpis=derived_kpis,
        prioritized_tradeoffs=payload.get("prioritized_tradeoffs") or [],
        source_types_used_count=source_types_used_count,
        validation_flags=payload.get("validation_flags") or [],
    )


# ── Stage 4 -- Output Interface (MissionAgent.md Section 4.4) ───────────


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


# ── Agentic mode (`agentic_run`) ─────────────────────────────────────────

_AGENTIC_SYSTEM = (
    "You are Mission Agent for TorqWings' aerospace design platform, working "
    "autonomously to turn a mission brief into a complete MissionSpec. You "
    "have six tools covering intent extraction, decomposition, domain-rule "
    "checking, constraint/KPI inference, trade-off prioritization, and final "
    "assembly. Decide yourself which tools to call and in what order -- you "
    "are not required to call them in any fixed sequence. If an earlier "
    "result looks thin, contradictory, or incomplete (e.g. decomposition "
    "produced only one vague element, or no KPIs were derived for a mission "
    "that clearly implies some), call the relevant tool again with better "
    "input rather than proceeding with a bad result. Do not call a tool "
    "whose prerequisites you don't have yet. When you have enough to produce "
    "a complete, well-supported mission spec, call finalize_mission_spec "
    "exactly once -- that call ends your turn, so make sure you've genuinely "
    "gathered intent, decomposition, constraints, and KPIs first. Work "
    "efficiently: most missions need each tool called once, in roughly the "
    "order they're listed, but you decide based on what you actually see."
)

_AGENTIC_TOOLS = [
    {
        "name": "extract_intent_and_entities",
        "description": "Extract the mission's intent, an intent category, and payload/range/endurance hints from raw mission text. Call this first.",
        "input_schema": {
            "type": "object",
            "properties": {
                "raw_text": {"type": "string", "description": "The mission brief, verbatim."},
                "structured_fields": {"type": "object", "description": "Any already-known fields, e.g. payload_kg, operating_environment. Optional."},
                "attached_regulations": {"type": "array", "items": {"type": "string"}, "description": "Regulation codes already selected, e.g. FAR_107. Optional."},
            },
            "required": ["raw_text"],
        },
    },
    {
        "name": "decompose_mission",
        "description": "Break the mission's intent into discrete functional elements (platform class, operational profile, domain). Needs extract_intent_and_entities's result first.",
        "input_schema": {
            "type": "object",
            "properties": {
                "detected_intent": {"type": "string"},
                "extracted_entities": {"type": "object"},
            },
            "required": ["detected_intent", "extracted_entities"],
        },
    },
    {
        "name": "check_domain_rules",
        "description": "Deterministic lookup against a fixed regulation/payload/environment/keyword rule table -- no inference, just known constraints that directly follow from what's already stated. Call after decompose_mission.",
        "input_schema": {
            "type": "object",
            "properties": {
                "decomposed_elements": {"type": "array", "items": {"type": "string"}},
                "attached_regulations": {"type": "array", "items": {"type": "string"}},
                "structured_fields": {"type": "object"},
                "constraint_hints": {"type": "array", "items": {"type": "string"}, "description": "Constraint hints from extract_intent_and_entities's extracted_entities."},
            },
            "required": ["decomposed_elements"],
        },
    },
    {
        "name": "infer_constraints_and_kpis",
        "description": "Infer additional constraints the rule table couldn't catch, and derive performance/cost/safety KPIs. Call after check_domain_rules, passing its known_constraints.",
        "input_schema": {
            "type": "object",
            "properties": {
                "decomposed_elements": {"type": "array", "items": {"type": "string"}},
                "known_constraints": {"type": "array", "items": {"type": "object"}},
                "structured_fields": {"type": "object"},
            },
            "required": ["decomposed_elements", "known_constraints"],
        },
    },
    {
        "name": "prioritize_tradeoffs",
        "description": "Deterministic gate-tier/score-tier trade-off ranking (safety and regulatory constraints always win; everything else weighted). Call after infer_constraints_and_kpis.",
        "input_schema": {
            "type": "object",
            "properties": {
                "constraints": {"type": "array", "items": {"type": "object"}},
                "kpis": {"type": "array", "items": {"type": "object"}},
                "priority_signals": {"type": "array", "items": {"type": "string"}, "description": "Free-text signals that might indicate an explicit user priority, e.g. constraint_hints."},
            },
            "required": ["constraints", "kpis"],
        },
    },
    {
        "name": "finalize_mission_spec",
        "description": "Assemble everything gathered so far into the final MissionSpec (mission_specs, deduplicated constraints, prioritized KPIs, a summary, and a confidence score). Calling this ends your turn -- only call it once you have intent, decomposition, constraints, and KPIs.",
        "input_schema": {
            "type": "object",
            "properties": {
                "intent_category": {"type": "string"},
                "decomposed_elements": {"type": "array", "items": {"type": "string"}},
                "extracted_entities": {"type": "object"},
                "identified_constraints": {"type": "array", "items": {"type": "object"}},
                "derived_kpis": {"type": "array", "items": {"type": "object"}},
                "prioritized_tradeoffs": {"type": "array", "items": {"type": "object"}},
                "source_types_used_count": {"type": "integer", "description": "How many distinct input sources contributed (defaults to 1 if unsure)."},
                "validation_flags": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["decomposed_elements", "identified_constraints", "derived_kpis"],
        },
    },
]


def _agentic_tool_extract(args: dict) -> dict:
    return _extract_intent_and_entities(
        str(args.get("raw_text") or ""), args.get("structured_fields") or {}, args.get("attached_regulations") or []
    )


def _agentic_tool_decompose(args: dict) -> dict:
    return _decompose_mission(str(args.get("detected_intent") or ""), args.get("extracted_entities") or {})


def _agentic_tool_check_rules(args: dict) -> dict:
    return _check_domain_rules(
        args.get("decomposed_elements") or [],
        args.get("attached_regulations") or [],
        args.get("structured_fields") or {},
        args.get("constraint_hints") or [],
    )


def _agentic_tool_infer(args: dict) -> dict:
    return _infer_constraints_and_kpis(
        args.get("decomposed_elements") or [], args.get("known_constraints") or [], args.get("structured_fields") or {}
    )


def _agentic_tool_prioritize(args: dict) -> dict:
    return {
        "prioritized_tradeoffs": _prioritize_tradeoffs(
            args.get("constraints") or [], args.get("kpis") or [], args.get("priority_signals") or []
        )
    }


def _agentic_tool_finalize(args: dict) -> dict:
    return _finalize_mission_spec(
        intent_category=args.get("intent_category"),
        decomposed_elements=args.get("decomposed_elements") or [],
        extracted_entities=args.get("extracted_entities") or {},
        identified_constraints=args.get("identified_constraints") or [],
        derived_kpis=args.get("derived_kpis") or [],
        prioritized_tradeoffs=args.get("prioritized_tradeoffs") or [],
        source_types_used_count=args.get("source_types_used_count") or 1,
        validation_flags=args.get("validation_flags") or [],
    )


_AGENTIC_TOOL_IMPLS = {
    "extract_intent_and_entities": _agentic_tool_extract,
    "decompose_mission": _agentic_tool_decompose,
    "check_domain_rules": _agentic_tool_check_rules,
    "infer_constraints_and_kpis": _agentic_tool_infer,
    "prioritize_tradeoffs": _agentic_tool_prioritize,
    "finalize_mission_spec": _agentic_tool_finalize,
}

_MAX_AGENTIC_ITERATIONS = 10


def _run_agentic(payload: dict) -> dict:
    raw_text = str(payload.get("raw_text") or "").strip()
    structured_fields = payload.get("structured_fields") or {}
    attached_regulations = payload.get("attached_regulations") or []

    if not raw_text and not structured_fields:
        return {"error": "Provide `raw_text` and/or `structured_fields` -- nothing usable was given."}

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return {
            "mock": True,
            "error": None,
            "trace": [],
            "final_spec": None,
            "message": "ANTHROPIC_API_KEY is not set -- the agentic loop needs real tool-use calls and has no mock mode of its own.",
        }

    import anthropic

    client = anthropic.Anthropic(api_key=api_key)
    user_message = (
        f"Mission brief: {raw_text}\n"
        f"Structured fields: {json.dumps(structured_fields, indent=2)}\n"
        f"Attached regulations: {json.dumps(attached_regulations)}\n\n"
        "Produce a complete MissionSpec using your tools."
    )
    messages: list[dict] = [{"role": "user", "content": user_message}]
    trace: list[dict] = []
    total_usage = {"input_tokens": 0, "output_tokens": 0}

    for iteration in range(_MAX_AGENTIC_ITERATIONS):
        try:
            response = client.messages.create(
                model=_MODEL,
                max_tokens=4096,
                system=_AGENTIC_SYSTEM,
                tools=_AGENTIC_TOOLS,
                messages=messages,
            )
        except Exception as exc:
            return {
                "mock": False,
                "error": f"Agentic loop failed on iteration {iteration + 1}: {type(exc).__name__}: {exc}",
                "trace": trace,
                "final_spec": None,
            }

        total_usage["input_tokens"] += response.usage.input_tokens
        total_usage["output_tokens"] += response.usage.output_tokens
        messages.append({"role": "assistant", "content": response.content})

        tool_uses = [b for b in response.content if b.type == "tool_use"]
        if not tool_uses:
            # The agent stopped talking without finalizing -- not necessarily
            # wrong (it might be asking a clarifying question), but there's
            # no human in this loop to answer it, so this run is done.
            text = next((b.text for b in response.content if b.type == "text"), "")
            return {
                "mock": False,
                "error": "Agent stopped without calling finalize_mission_spec.",
                "agent_message": text,
                "trace": trace,
                "final_spec": None,
                "usage": total_usage,
                "iterations": iteration + 1,
            }

        tool_results = []
        final_spec = None
        for tu in tool_uses:
            impl = _AGENTIC_TOOL_IMPLS.get(tu.name)
            result = impl(tu.input) if impl else {"error": f"Unknown tool '{tu.name}'"}
            trace.append({"tool": tu.name, "args": tu.input, "result": result})
            tool_results.append(
                {"type": "tool_result", "tool_use_id": tu.id, "content": json.dumps(result)}
            )
            if tu.name == "finalize_mission_spec" and "error" not in result:
                final_spec = result

        if final_spec is not None:
            return {
                "mock": False,
                "error": None,
                "final_spec": final_spec,
                "trace": trace,
                "usage": total_usage,
                "iterations": iteration + 1,
                "tool_calls": len(trace),
            }

        messages.append({"role": "user", "content": tool_results})

    return {
        "mock": False,
        "error": f"Agentic loop did not finalize within {_MAX_AGENTIC_ITERATIONS} iterations.",
        "trace": trace,
        "final_spec": None,
        "usage": total_usage,
        "iterations": _MAX_AGENTIC_ITERATIONS,
    }


# ── Entry point ───────────────────────────────────────────────────────

_HANDLERS = {
    "input_processing": _run_input_processing,
    "reasoning_planning": _run_reasoning_planning,
    "output_generation": _run_output_generation,
    "output_interface": _run_output_interface,
    "agentic_run": _run_agentic,
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

    status = "error" if result.get("error") else "ok"
    return {
        "agent_name": AGENT_NAME,
        "function_name": function_name,
        "status": status,
        **result,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
