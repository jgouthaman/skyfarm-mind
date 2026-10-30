"""
Raman Noise Check — Bay 16 (TorqWings) — Spiral 1 deterministic acoustic engine.

Pure Python standard library. No LLM, no network, no database. Every number here is
computed deterministically from the inputs. LLM-written text (report summary, driver
explanations) and the Noise Fix agent loop live on the TypeScript side.

Public functions (all take a dict, return a JSON-serialisable dict):
    noise_check(payload)     -> full Noise Check result (Tabs 1-2, report, certificate "before")
    evaluate_design(payload) -> fast what-if for sliders and the Noise Fix agent tool (Tabs 3-4)
    lever_ranges(payload)    -> allowed slider / agent ranges for a vehicle
    handle(function, payload)-> dispatcher used by handler.py

Models (Spiral 1 "lean engine", multirotor only):
    Performance : momentum theory + empirical thrust coefficient (CT) -> hover/cruise RPM, power
    Tonal       : Gutin (1936) steady loading + torque, Bessel-function form, harmonics m=1..10
    Unsteady    : compact-dipole fluctuating-thrust tones (rotor-arm / rotor-rotor interaction)
                  -> EMPIRICAL, provisionally calibrated, flagged low confidence
    Broadband   : Brooks-Pope-Marcolini (NASA RP-1218) TBL-TE + tip vortex, per blade segment
    Motor       : empirical electromagnetic whine estimate
    Propagation : spherical spreading + ISO 9613-1 air absorption + simple ground term
    Weighting   : IEC 61672 A-weighting, 1/3-octave bands 50 Hz - 10 kHz

Accuracy: about +/-5 dB until Spiral 2 validation against published measurements.
"""

from __future__ import annotations

import math
import time
from typing import Any

ENGINE_VERSION = "raman-s1-0.1.0"

# --------------------------------------------------------------------------------------
# Provisional calibration constants (Spiral 1). Change ONLY with validation evidence.
# --------------------------------------------------------------------------------------
UNSTEADY_EPS0 = 0.030          # fluctuating thrust fraction at 1st BPF harmonic, nominal clearance
UNSTEADY_DECAY = 1.2           # harmonic roll-off exponent for unsteady loading
NOMINAL_CLEARANCE_RATIO = 0.10 # rotor-plane-to-arm clearance / diameter considered "nominal"
MOTOR_LWA_K = 45.0             # motor LWA (dB) = 10 log10(shaft power W) + K
DEFAULT_FM = 0.60              # rotor figure of merit
DEFAULT_PITCH_RATIO = 0.45     # pitch / diameter
DEFAULT_CHORD_075 = 0.12       # chord at 0.75R as fraction of R
DEFAULT_AOA_DEG = 4.0          # effective blade section angle of attack for BPM
MOTOR_EFF = 0.80               # motor+ESC efficiency for electrical power
UNCERTAINTY_DB = 5.0

G = 9.80665
P_REF = 2e-5
BANDS = [50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250,
         1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000]
DEFAULT_DISTANCES = [1.5, 10.0, 30.0, 60.0, 100.0]


class InputError(ValueError):
    def __init__(self, errors: list[dict]):
        super().__init__("; ".join(f"{e['field']}: {e['message']}" for e in errors))
        self.errors = errors


# ======================================================================================
# Utilities
# ======================================================================================

def _db(x: float) -> float:
    return 10.0 * math.log10(max(x, 1e-30))


def _energy(L: float) -> float:
    return 10.0 ** (L / 10.0)


def _sum_db(levels) -> float:
    return _db(sum(_energy(L) for L in levels))


def _clamp(x, lo, hi):
    return max(lo, min(hi, x))


def bessel_j(n: int, x: float, steps: int = 256) -> float:
    """J_n(x) via Bessel's integral (trapezoid rule; exponentially accurate for periodic integrand)."""
    if x == 0.0:
        return 1.0 if n == 0 else 0.0
    h = math.pi / steps
    s = 0.5 * (math.cos(0.0) + math.cos(n * math.pi))
    for k in range(1, steps):
        t = k * h
        s += math.cos(n * t - x * math.sin(t))
    return s * h / math.pi


def a_weight(f: float) -> float:
    f2 = f * f
    ra = (12194.0 ** 2 * f2 * f2) / (
        (f2 + 20.6 ** 2) * math.sqrt((f2 + 107.7 ** 2) * (f2 + 737.9 ** 2)) * (f2 + 12194.0 ** 2))
    return 20.0 * math.log10(ra) + 2.0


def band_of(f: float) -> int:
    """Index of the 1/3-octave band containing frequency f (nearest centre on log scale), or -1."""
    if f < BANDS[0] / 2 ** (1 / 6) or f > BANDS[-1] * 2 ** (1 / 6):
        return -1
    return min(range(len(BANDS)), key=lambda i: abs(math.log(f / BANDS[i])))


def air_absorption_db_per_m(f: float, temp_c: float, rh_pct: float, pa_kpa: float = 101.325) -> float:
    """ISO 9613-1 pure-tone atmospheric absorption coefficient (dB/m)."""
    T = temp_c + 273.15
    T0, T01, pr = 293.15, 273.16, 101.325
    pa = pa_kpa
    C = -6.8346 * (T01 / T) ** 1.261 + 4.6151
    psat_pr = 10.0 ** C
    h = rh_pct * psat_pr * (pr / pa)
    frO = (pa / pr) * (24.0 + 4.04e4 * h * (0.02 + h) / (0.391 + h))
    frN = (pa / pr) * (T / T0) ** -0.5 * (9.0 + 280.0 * h * math.exp(-4.170 * ((T / T0) ** (-1 / 3) - 1.0)))
    f2 = f * f
    alpha = 8.686 * f2 * (
        1.84e-11 * (pr / pa) * (T / T0) ** 0.5
        + (T / T0) ** -2.5 * (
            0.01275 * math.exp(-2239.1 / T) / (frO + f2 / frO)
            + 0.1068 * math.exp(-3352.0 / T) / (frN + f2 / frN)))
    return alpha


# ======================================================================================
# Input handling
# ======================================================================================

def _num(p: dict, key: str, errors: list, required=True, lo=None, hi=None):
    v = p.get(key)
    if v is None or v == "":
        if required:
            errors.append({"field": key, "message": "is required"})
        return None
    try:
        v = float(v)
    except (TypeError, ValueError):
        errors.append({"field": key, "message": "must be a number"})
        return None
    if (lo is not None and v < lo) or (hi is not None and v > hi):
        errors.append({"field": key, "message": f"must be between {lo} and {hi}"})
        return None
    return v


def resolve_inputs(p: dict) -> dict:
    """Validate the payload and return resolved SI inputs with provenance tags."""
    errors: list[dict] = []
    vtype = (p.get("vehicle_type") or "multirotor").lower()
    if vtype != "multirotor":
        errors.append({"field": "vehicle_type",
                       "message": "Spiral 1 supports multirotor only; VTOL and fixed-wing come in Spiral 4"})

    mass = _num(p, "take_off_mass_kg", errors, lo=0.05, hi=150)
    n_rot = _num(p, "rotor_count", errors, lo=3, hi=16)
    dia_raw = _num(p, "prop_diameter", errors, lo=0.05, hi=120)
    blades = _num(p, "blade_count", errors, lo=2, hi=6)
    kv = _num(p, "motor_kv", errors, lo=20, hi=5000)
    volt = _num(p, "battery_voltage", errors, required=False, lo=3, hi=120)
    cells = _num(p, "battery_cells", errors, required=False, lo=1, hi=28)
    vcr_raw = _num(p, "cruise_speed", errors, lo=0, hi=200)
    if volt is None and cells is None and not any(e["field"] in ("battery_voltage", "battery_cells") for e in errors):
        errors.append({"field": "battery_voltage", "message": "give battery_voltage or battery_cells"})
    if errors:
        raise InputError(errors)

    prov: dict[str, str] = {}
    assumptions: list[str] = []

    dunit = (p.get("prop_diameter_unit") or "in").lower()
    D = dia_raw * 0.0254 if dunit in ("in", "inch", "inches") else dia_raw
    if not 0.05 <= D <= 3.0:
        raise InputError([{"field": "prop_diameter", "message": "resolved diameter must be 0.05-3 m (check unit)"}])
    vunit = (p.get("cruise_speed_unit") or "m/s").lower()
    Vc = vcr_raw / 3.6 if vunit in ("km/h", "kmh", "kph") else vcr_raw
    if volt is None:
        volt = cells * 3.7
        prov["battery_voltage"] = "derived"
        assumptions.append(f"Battery voltage taken as {cells:.0f} cells x 3.7 V = {volt:.1f} V")
    else:
        prov["battery_voltage"] = "provided"
    for k in ("take_off_mass_kg", "rotor_count", "prop_diameter", "blade_count", "motor_kv", "cruise_speed"):
        prov[k] = "provided"

    def opt(key, default, lo, hi, label, unit=""):
        v = p.get(key)
        if v not in (None, ""):
            try:
                v = float(v)
                if lo <= v <= hi:
                    prov[key] = "provided"
                    return v
            except (TypeError, ValueError):
                pass
        prov[key] = "assumed"
        if label:
            assumptions.append(f"{label} assumed {default}{unit}")
        return default

    pitch_in = p.get("prop_pitch_in")
    if pitch_in not in (None, ""):
        pitch_ratio = _clamp(float(pitch_in) * 0.0254 / D, 0.2, 1.2)
        prov["prop_pitch_in"] = "provided"
    else:
        pitch_ratio = DEFAULT_PITCH_RATIO
        prov["prop_pitch_in"] = "assumed"
        assumptions.append(f"Propeller pitch assumed {pitch_ratio:.2f} x diameter")

    temp_c = opt("temperature_c", 30.0, -30, 55, "Air temperature", " C")
    rh = opt("humidity_pct", 70.0, 5, 100, "Relative humidity", " %")
    fm = opt("figure_of_merit", DEFAULT_FM, 0.3, 0.85, "Rotor figure of merit", "")
    chord_frac = opt("chord_075_over_r", DEFAULT_CHORD_075, 0.04, 0.35, "Blade chord at 75% radius (fraction of radius)", "")
    clearance = opt("arm_clearance_ratio", NOMINAL_CLEARANCE_RATIO, 0.01, 1.0, "Rotor-to-arm clearance / diameter", "")
    spacing = opt("rotor_spacing_m", 0.0, 0.0, 10.0, "", "")
    if prov["rotor_spacing_m"] == "assumed":
        spacing = None
        assumptions.append("Rotor spacing not given; rotor-rotor overlap checks skipped")
    altitude = opt("altitude_agl_m", 30.0, 2, 500, "Operating altitude", " m AGL")
    pole_pairs = opt("motor_pole_pairs", 7.0, 1, 30, "Motor pole pairs", "")
    drag_area = p.get("drag_area_m2")
    if drag_area not in (None, ""):
        drag_area = float(drag_area)
        prov["drag_area_m2"] = "provided"
    else:
        drag_area = 0.03 * mass ** (2 / 3)
        prov["drag_area_m2"] = "assumed"
        assumptions.append(f"Body drag area assumed {drag_area:.3f} m2 from take-off mass")
    hover_rpm = p.get("hover_rpm")
    hover_rpm = float(hover_rpm) if hover_rpm not in (None, "") else None
    prov["hover_rpm"] = "provided" if hover_rpm else "derived"

    target = p.get("target_dba")
    target = float(target) if target not in (None, "") else None
    prov["target_dba"] = "provided" if target is not None else "none"
    target_dist = float(p.get("target_distance_m") or 10.0)
    distances = p.get("receiver_distances_m") or DEFAULT_DISTANCES
    distances = sorted({float(d) for d in distances if 0.5 <= float(d) <= 2000})
    ground = (p.get("ground_type") or "soft").lower()
    if ground not in ("soft", "hard", "none"):
        ground = "soft"

    return {
        "mass": mass, "n_rot": int(round(n_rot)), "D": D, "R": D / 2, "B": int(round(blades)),
        "kv": kv, "volt": volt, "Vc": Vc, "pitch_ratio": pitch_ratio, "temp_c": temp_c, "rh": rh,
        "fm": fm, "chord_frac": chord_frac, "clearance": clearance, "spacing": spacing,
        "altitude": altitude, "pole_pairs": pole_pairs, "drag_area": drag_area,
        "hover_rpm": hover_rpm, "target": target, "target_dist": target_dist,
        "distances": distances, "ground": ground,
        "provenance": prov, "assumptions": assumptions,
        "environment": p.get("environment"),
    }


# ======================================================================================
# Performance (momentum theory + empirical CT)
# ======================================================================================

def _air(temp_c):
    T = temp_c + 273.15
    return 101325.0 / (287.05 * T), 331.3 * math.sqrt(1 + temp_c / 273.15), 1.46e-5 * (T / 288.15) ** 1.7


def thrust_coefficient(pitch_ratio: float, blades: int) -> float:
    """Static CT (T = CT rho n^2 D^4, n in rev/s). Empirical fit to small-propeller data."""
    ct2 = _clamp(0.24 * pitch_ratio, 0.06, 0.16)
    return ct2 * (blades / 2.0) ** 0.75


def performance(x: dict, rpm_override: float | None = None) -> dict:
    rho, c, nu = _air(x["temp_c"])
    D, R, B, n_rot = x["D"], x["R"], x["B"], x["n_rot"]
    A = math.pi * R * R
    W = x["mass"] * G
    T_req = W / n_rot
    CT = thrust_coefficient(x["pitch_ratio"], B)
    rpm_given = rpm_override or x.get("hover_rpm")
    implied_pitch_ratio = None
    if rpm_given:
        # Hover RPM given: thrust still equals weight, so the blade pitch must change.
        n = rpm_given / 60.0
        T = T_req
        CT = T_req / (rho * n * n * D ** 4)
        implied_pitch_ratio = CT / ((B / 2.0) ** 0.75) / 0.24
    else:
        n = math.sqrt(T_req / (CT * rho * D ** 4))
        T = T_req
    rpm = n * 60.0
    omega = 2 * math.pi * n
    vi = math.sqrt(T / (2 * rho * A))
    P = T * vi / x["fm"]
    Q = P / omega
    rpm_max = x["kv"] * x["volt"] * 0.85
    T_max = CT * rho * (rpm_max / 60.0) ** 2 * D ** 4
    thrust_to_weight = T_max * n_rot / W

    # cruise
    rho_v2 = 0.5 * rho * x["Vc"] ** 2
    Dp = rho_v2 * x["drag_area"]
    T_c = math.hypot(W, Dp) / n_rot
    n_c = math.sqrt(T_c / (CT * rho * D ** 4))
    omega_c = 2 * math.pi * n_c
    vi_c = vi
    for _ in range(30):  # Glauert induced velocity in forward flight
        vi_c = T_c / (2 * rho * A * math.sqrt(x["Vc"] ** 2 + vi_c ** 2) + 1e-9)
    P_c = T_c * vi_c / x["fm"] + Dp * x["Vc"] / n_rot
    Q_c = P_c / omega_c

    return {
        "rho": rho, "c": c, "nu": nu, "CT": CT, "implied_pitch_ratio": implied_pitch_ratio, "thrust_per_rotor_n": T, "thrust_required_n": T_req,
        "rpm": rpm, "omega": omega, "vi": vi, "power_per_rotor_w": P, "torque_nm": Q,
        "tip_speed": omega * R, "tip_mach": omega * R / c, "bpf_hz": B * n,
        "disk_loading": T_req / A, "rpm_max": rpm_max, "thrust_to_weight": thrust_to_weight,
        "hover_power_total_w": P * n_rot / MOTOR_EFF,
        "cruise": {"thrust_per_rotor_n": T_c, "rpm": n_c * 60, "omega": omega_c,
                   "tilt_deg": math.degrees(math.atan2(Dp, W)), "power_per_rotor_w": P_c,
                   "torque_nm": Q_c, "tip_speed": omega_c * R,
                   "advancing_tip_mach": (omega_c * R + x["Vc"]) / c, "bpf_hz": B * n_c},
    }


# ======================================================================================
# Acoustic source models
# ======================================================================================

def gutin_tones(T, Q, omega, R, B, c, r, theta, v_fwd=0.0, harmonics=10):
    """Steady loading tones (Gutin). Returns [(freq_hz, spl_db)] at distance r, angle theta (rad from thrust axis)."""
    Re = 0.8 * R
    out = []
    for m in range(1, harmonics + 1):
        mB = m * B
        f = mB * omega / (2 * math.pi)
        x = mB * (omega * Re + v_fwd) / c * math.sin(theta)
        load = abs(-T * math.cos(theta) + Q * c / (omega * Re * Re))
        p = mB * omega / (2 * math.sqrt(2) * math.pi * c * r) * load * abs(bessel_j(mB, x))
        out.append((f, 20 * math.log10(max(p, 1e-12) / P_REF)))
    return out


def unsteady_tones(T, omega, B, c, r, theta, clearance_ratio, harmonics=15):
    """Fluctuating-thrust (interaction) tones as a compact axial dipole. EMPIRICAL - low confidence."""
    eps0 = UNSTEADY_EPS0 * (NOMINAL_CLEARANCE_RATIO / clearance_ratio) ** 0.5
    eps0 = _clamp(eps0, 0.002, 0.08)
    out = []
    for m in range(1, harmonics + 1):
        w = m * B * omega
        # blade-loading harmonic order is m*B; loading harmonics decay with that order
        F = T * eps0 * (m * B / 2.0) ** (-UNSTEADY_DECAY)
        p = w * F * abs(math.cos(theta)) / (4 * math.sqrt(2) * math.pi * c * r)
        out.append((w / (2 * math.pi), 20 * math.log10(max(p, 1e-12) / P_REF)))
    return out


# ---- BPM spectral shape functions (NASA RP-1218) -------------------------------------

def _A_min(a):
    if a < 0.204:
        return math.sqrt(max(67.552 - 886.788 * a * a, 0)) - 8.219
    if a <= 0.244:
        return -32.665 * a + 3.981
    return -142.795 * a ** 3 + 103.656 * a ** 2 - 57.757 * a + 6.006


def _A_max(a):
    if a < 0.13:
        return math.sqrt(max(67.552 - 886.788 * a * a, 0)) - 8.219
    if a <= 0.321:
        return -15.901 * a + 1.098
    return -4.669 * a ** 3 + 3.491 * a ** 2 - 16.699 * a + 1.149


def _A(st_ratio, Rc):
    a = abs(math.log10(st_ratio))
    if Rc < 9.52e4:
        a0 = 0.57
    elif Rc <= 8.57e5:
        a0 = -9.57e-13 * (Rc - 8.57e5) ** 2 + 1.13
    else:
        a0 = 1.13
    AR = (-20 - _A_min(a0)) / (_A_max(a0) - _A_min(a0))
    return _A_min(a) + AR * (_A_max(a) - _A_min(a))


def _B_min(b):
    if b < 0.13:
        return math.sqrt(max(16.888 - 886.788 * b * b, 0)) - 4.109
    if b <= 0.145:
        return -83.607 * b + 8.138
    return -817.81 * b ** 3 + 355.21 * b ** 2 - 135.024 * b + 10.619


def _B_max(b):
    if b < 0.10:
        return math.sqrt(max(16.888 - 886.788 * b * b, 0)) - 4.109
    if b <= 0.187:
        return -31.33 * b + 1.854
    return -80.541 * b ** 3 + 44.174 * b ** 2 - 39.381 * b + 2.344


def _B(st_ratio, Rc):
    b = abs(math.log10(st_ratio))
    if Rc < 9.52e4:
        b0 = 0.30
    elif Rc <= 8.57e5:
        b0 = -4.48e-13 * (Rc - 8.57e5) ** 2 + 0.56
    else:
        b0 = 0.56
    BR = (-20 - _B_min(b0)) / (_B_max(b0) - _B_min(b0))
    return _B_min(b) + BR * (_B_max(b) - _B_min(b))


def bpm_segment_spectrum(U, chord, span, r, c, nu, alpha_deg=DEFAULT_AOA_DEG):
    """BPM TBL-TE (untripped) + returns band levels list (dB) for one segment, directivity Dh=1."""
    M = U / c
    Rc = max(U * chord / nu, 1e4)
    lr = math.log10(Rc)
    d0 = chord * 10 ** (3.0187 - 1.5397 * lr + 0.1059 * lr * lr)            # untripped delta*_0
    dp = d0 * 10 ** (-0.0432 * alpha_deg + 0.00113 * alpha_deg ** 2)
    if alpha_deg <= 7.5:
        ds = d0 * 10 ** (0.0679 * alpha_deg)
    else:
        ds = d0 * 0.0162 * 10 ** (0.3066 * alpha_deg)
    St1 = 0.02 * M ** -0.6
    if alpha_deg < 1.33:
        St2 = St1
    elif alpha_deg <= 12.5:
        St2 = St1 * 10 ** (0.0054 * (alpha_deg - 1.33) ** 2)
    else:
        St2 = St1 * 4.72
    if Rc < 2.47e5:
        K1 = -4.31 * lr + 156.3
    elif Rc <= 8.0e5:
        K1 = -9.0 * lr + 181.6
    else:
        K1 = 128.5
    Rdp = U * dp / nu
    dK1 = alpha_deg * (1.43 * math.log10(Rdp) - 5.29) if Rdp <= 5000 else 0.0
    gam = 27.094 * M + 3.31
    gam0 = 23.43 * M + 4.651
    beta = 72.65 * M + 10.74
    beta0 = -34.19 * M - 13.82
    if alpha_deg < gam0 - gam:
        K2 = K1 - 1000
    elif alpha_deg <= gam0 + gam:
        K2 = K1 + math.sqrt(max(beta ** 2 - (beta / gam) ** 2 * (alpha_deg - gam0) ** 2, 0)) + beta0
    else:
        K2 = K1 - 12
    geo = M ** 5 * span / (r * r)   # Dh = 1
    out = []
    for f in BANDS:
        Stp, Sts = f * dp / U, f * ds / U
        Lp = _db(dp * geo) + _A(Stp / St1, Rc) + (K1 - 3) + dK1
        Ls = _db(ds * geo) + _A(Sts / St1, Rc) + (K1 - 3)
        La = _db(ds * geo) + _B(Sts / St2, Rc) + K2
        out.append(_sum_db([Lp, Ls, La]))
    return out


def bpm_tip_spectrum(U, chord, r, c, alpha_tip_deg=DEFAULT_AOA_DEG):
    """BPM tip vortex noise (rounded tip), Dh = 1."""
    M = U / c
    l = 0.008 * alpha_tip_deg * chord
    Mmax = M * (1 + 0.036 * alpha_tip_deg)
    Umax = Mmax * c
    out = []
    for f in BANDS:
        St = f * l / Umax
        out.append(_db(M * M * Mmax ** 3 * l * l / (r * r)) - 30.5 * (math.log10(max(St, 1e-6)) + 0.3) ** 2 + 126)
    return out


def broadband_rotor(R, B, omega, chord_075, c, nu, r, v_fwd=0.0, n_seg=8):
    """Incoherent sum of BPM TBL-TE over segments and blades, plus tip vortex. Per-rotor band SPL."""
    edges = [0.2 * R + i * (0.95 * R - 0.2 * R) / n_seg for i in range(n_seg + 1)]
    band_e = [0.0] * len(BANDS)
    for i in range(n_seg):
        rm = 0.5 * (edges[i] + edges[i + 1])
        span = edges[i + 1] - edges[i]
        chord = chord_075 * (1.15 - 0.2 * rm / R)            # mild taper, = chord_075 near 0.75R
        U = math.sqrt((omega * rm) ** 2 + 0.5 * v_fwd ** 2)
        for k, L in enumerate(bpm_segment_spectrum(U, chord, span, r, c, nu)):
            band_e[k] += B * _energy(L)
    Ut = math.sqrt((omega * 0.95 * R) ** 2 + 0.5 * v_fwd ** 2)
    for k, L in enumerate(bpm_tip_spectrum(Ut, chord_075 * 0.9, r, c)):
        band_e[k] += B * _energy(L)
    return [_db(e) for e in band_e]


def motor_spectrum(shaft_power_w, rpm, pole_pairs, r):
    """Empirical motor whine: LWA = 10log10(P) + K, spread over electrical harmonics 1..3."""
    lwa = _db(max(shaft_power_w, 0.1)) + MOTOR_LWA_K
    lp_total = lwa - 20 * math.log10(r) - 11.0
    fe = rpm / 60.0 * pole_pairs
    band_e = [0.0] * len(BANDS)
    for h, wgt in ((1, 0.5), (2, 0.3), (3, 0.2)):
        k = band_of(fe * h)
        if k >= 0:
            # lp_total is A-weighted-ish target; store unweighted by removing A-weight at that band
            band_e[k] += wgt * _energy(lp_total - a_weight(BANDS[k]))
    return [_db(e) if e > 0 else -100.0 for e in band_e]


# ======================================================================================
# Field assembly
# ======================================================================================

THETA_GRID = [math.radians(d) for d in range(95, 180, 10)]  # observer below/beside rotor


def _ground_db(kind):
    return {"hard": 3.0, "soft": 1.5, "none": 0.0}[kind]


def field_at(x: dict, perf: dict, r: float, state: str = "hover") -> dict:
    """A-weighted level at distance r (max over directivity grid) with source breakdown and spectrum."""
    c, nu = perf["c"], perf["nu"]
    if state == "hover":
        T, Q, om, v = perf["thrust_per_rotor_n"], perf["torque_nm"], perf["omega"], 0.0
        shaft = perf["power_per_rotor_w"]
        rpm = perf["rpm"]
    else:
        cr = perf["cruise"]
        T, Q, om, v = cr["thrust_per_rotor_n"], cr["torque_nm"], cr["omega"], x["Vc"]
        shaft = cr["power_per_rotor_w"]
        rpm = cr["rpm"]
    R, B, n = x["R"], x["B"], x["n_rot"]
    chord = x["chord_frac"] * R
    nrot_db = 10 * math.log10(n)
    g = _ground_db(x["ground"])

    bb = broadband_rotor(R, B, om, chord, c, nu, r, v)
    mot = motor_spectrum(shaft, rpm, x["pole_pairs"], r)
    absorb = [air_absorption_db_per_m(f, x["temp_c"], x["rh"]) * r for f in BANDS]

    def a_of(f):
        return a_weight(f)

    bb_A = _sum_db([bb[k] + nrot_db + g - absorb[k] + a_of(BANDS[k]) for k in range(len(BANDS))])
    mot_A = _sum_db([mot[k] + nrot_db + g - absorb[k] + a_of(BANDS[k]) for k in range(len(BANDS))])

    best = None
    for th in THETA_GRID:
        st = gutin_tones(T, Q, om, R, B, c, r, th, v)
        us = unsteady_tones(T, om, B, c, r, th, x["clearance"])
        def tone_A(tones):
            vals = []
            for f, L in tones:
                if 20 <= f <= 12000:
                    vals.append(L + nrot_db + g - air_absorption_db_per_m(f, x["temp_c"], x["rh"]) * r + a_of(f))
            return _sum_db(vals) if vals else -100.0
        st_A, us_A = tone_A(st), tone_A(us)
        tot = _sum_db([st_A, us_A, bb_A, mot_A])
        if best is None or tot > best["LA"]:
            # Unsteady-loading tones at nominal clearance are ordinary rotor hum (inflow turbulence,
            # wake ingestion); only the excess caused by tighter-than-nominal clearance is "interaction".
            frac_int = max(0.0, 1.0 - min(1.0, x["clearance"] / NOMINAL_CLEARANCE_RATIO))
            us_e = _energy(us_A)
            tonal_A = _db(_energy(st_A) + (1 - frac_int) * us_e)
            inter_A = _db(frac_int * us_e) if frac_int > 0 else -100.0
            best = {"LA": tot, "theta_deg": round(math.degrees(th)), "tonal": tonal_A, "interaction": inter_A,
                    "st": st, "us": us}

    # unweighted 1/3-octave spectrum at worst angle (for chart + tonal prominence)
    band_e = [_energy(bb[k] + nrot_db + g - absorb[k]) + _energy(mot[k] + nrot_db + g - absorb[k])
              for k in range(len(BANDS))]
    tones_out = []
    for kind, tones in (("tonal", best["st"]), ("interaction", best["us"])):
        for f, L in tones:
            k = band_of(f)
            Lr = L + nrot_db + g - air_absorption_db_per_m(f, x["temp_c"], x["rh"]) * r
            if k >= 0:
                band_e[k] += _energy(Lr)
            if kind == "tonal":
                tones_out.append({"freq_hz": round(f, 1), "spl_db": round(Lr, 1)})
    spectrum = [{"band_hz": BANDS[k], "spl_db": round(_db(band_e[k]), 1),
                 "spl_dba": round(_db(band_e[k]) + a_weight(BANDS[k]), 1)} for k in range(len(BANDS))]

    parts = {"tonal": best["tonal"], "interaction": best["interaction"], "broadband": bb_A, "motor": mot_A}
    tot_e = sum(_energy(v) for v in parts.values())
    breakdown = {k: round(100 * _energy(v) / tot_e, 1) for k, v in parts.items()}
    return {"LA": best["LA"], "theta_deg": best["theta_deg"], "breakdown_pct": breakdown,
            "parts_dba": {k: round(v, 1) for k, v in parts.items()}, "spectrum": spectrum,
            "tones": tones_out[:6]}


BACKGROUND_DBA = {"rural": 35.0, "suburban": 45.0, "urban": 55.0, "near_people": 45.0}


def _background_band(k, environment):
    """Pink-ish background band level (unweighted) giving the environment's overall dBA."""
    la = BACKGROUND_DBA.get((environment or "suburban").lower().replace(" ", "_"), 45.0)
    # equal A-weighted energy per band
    return la - 10 * math.log10(len(BANDS)) - a_weight(BANDS[k])


def tonal_prominence(spectrum, bpf, environment=None):
    """ISO 1996-2 style 1/3-octave tone test; adjacent bands floored at environment background."""
    k = band_of(bpf)
    if k <= 0 or k >= len(spectrum) - 1:
        return None, False
    L = spectrum[k]["spl_db"]
    lo = max(spectrum[k - 1]["spl_db"], _background_band(k - 1, environment))
    hi = max(spectrum[k + 1]["spl_db"], _background_band(k + 1, environment))
    adj = 0.5 * (lo + hi)
    prom = L - adj
    f = BANDS[k]
    thr = 15.0 if f <= 125 else (8.0 if f <= 400 else 5.0)   # ISO 1996-2 1/3-octave method
    return round(prom, 1), prom >= thr


# ======================================================================================
# Verdict, drivers, confidence
# ======================================================================================

def verdict_for(level, target, tonal_high):
    """PASS <= target (WARN if tonal is prominent); WARN within uncertainty above target; FAIL beyond."""
    if target is None:
        return "INFO"
    if level > target + UNCERTAINTY_DB:
        return "FAIL"
    if level > target:
        return "WARN"
    return "WARN" if tonal_high else "PASS"


def drivers_for(x, perf, hover_field, prom_high):
    d = []
    br = hover_field["breakdown_pct"]
    if br["tonal"] >= 50:
        d.append({"code": "TONAL_DOMINANT", "weight": br["tonal"],
                  "message": f"Rotor hum at the blade-passing frequency (~{perf['bpf_hz']:.0f} Hz) is the main sound."})
    if perf["tip_mach"] >= 0.40:
        d.append({"code": "HIGH_TIP_SPEED", "weight": 60 + 100 * (perf["tip_mach"] - 0.4),
                  "message": f"Propeller tips are moving fast ({perf['tip_speed']:.0f} m/s, tip Mach {perf['tip_mach']:.2f})."})
    if br["interaction"] >= 25:
        d.append({"code": "INTERACTION", "weight": br["interaction"],
                  "message": "Blades pass close to the arms or other rotors, adding pulsing tones."})
    if br["broadband"] >= 40:
        d.append({"code": "BROADBAND", "weight": br["broadband"],
                  "message": "Turbulent airflow over the blade edges creates a broad hiss."})
    if perf["disk_loading"] >= 150:
        d.append({"code": "HIGH_DISK_LOADING", "weight": 40 + perf["disk_loading"] / 10,
                  "message": f"Small rotors carry a lot of weight (disk loading {perf['disk_loading']:.0f} N/m2), so they spin fast."})
    if br["motor"] >= 15:
        d.append({"code": "MOTOR", "weight": br["motor"], "message": "Motor electrical whine is noticeable."})
    if prom_high:
        d.append({"code": "TONAL_PROMINENCE", "weight": 30,
                  "message": "The hum stands out clearly from the background, which people find more annoying."})
    d.sort(key=lambda z: -z["weight"])
    for z in d:
        z["weight"] = round(z["weight"], 1)
    return d[:3]


def confidence_for(x):
    prov = x["provenance"]
    score = 0.70
    for k in ("prop_pitch_in", "chord_075_over_r", "arm_clearance_ratio", "figure_of_merit", "drag_area_m2"):
        if prov.get(k) == "assumed":
            score -= 0.04
    if prov.get("hover_rpm") == "provided":
        score += 0.05
    return round(_clamp(score, 0.30, 0.75), 2)


# ======================================================================================
# Public functions
# ======================================================================================

def _levels_table(x, perf):
    rows = []
    for r in x["distances"]:
        h = field_at(x, perf, r, "hover")
        c = field_at(x, perf, r, "cruise")
        rows.append({"distance_m": r, "hover_dba": round(h["LA"], 1), "cruise_dba": round(c["LA"], 1)})
    return rows


def noise_check(payload: dict) -> dict:
    t0 = time.perf_counter()
    x = resolve_inputs(payload)
    perf = performance(x)
    warnings = []
    if perf["thrust_to_weight"] < 1.0:
        warnings.append("Motor/battery cannot reach hover RPM (thrust-to-weight below 1). Check KV, voltage or propeller.")
    elif perf["thrust_to_weight"] < 1.6:
        warnings.append(f"Low thrust margin (thrust-to-weight {perf['thrust_to_weight']:.2f}); hover RPM is near motor limit.")
    if perf["tip_mach"] > 0.6:
        warnings.append("Tip Mach above 0.6: tonal model accuracy reduces at high tip speed.")
    if x["spacing"] and x["D"] > 0.98 * x["spacing"]:
        warnings.append("Propeller diameter exceeds rotor spacing: rotors would overlap.")

    td = x["target_dist"]
    hover_t = field_at(x, perf, td, "hover")
    cruise_t = field_at(x, perf, td, "cruise")
    prom, prom_high = tonal_prominence(hover_t["spectrum"], perf["bpf_hz"], x["environment"])
    hover_level = hover_t["LA"]
    v_h = verdict_for(hover_level, x["target"], prom_high)
    v_c = verdict_for(cruise_t["LA"], x["target"], False)
    order = {"FAIL": 3, "WARN": 2, "PASS": 1, "INFO": 0}
    verdict = max([v_h, v_c], key=lambda v: order[v])

    # sound power from 10 m hover (free field, worst direction -> conservative)
    f10 = field_at({**x, "ground": "none", "rh": x["rh"]}, perf, 10.0, "hover")
    lwa = f10["LA"] + 20 * math.log10(10.0) + 11.0

    # flyover SEL at operating altitude (exact for spherical spreading at constant speed)
    h = x["altitude"]
    sel = None
    if x["Vc"] > 0.5:
        la_h = field_at(x, perf, h, "cruise")["LA"]
        sel = round(la_h + 10 * math.log10(math.pi * h / x["Vc"]), 1)

    if x["target"] is not None:
        delta = hover_level - x["target"]
        headline = (f"{hover_level:.0f} dBA at {td:g} m in hover, "
                    + (f"{delta:.0f} dB over target" if delta > 0 else f"{-delta:.0f} dB under target"))
    else:
        headline = f"{hover_level:.0f} dBA at {td:g} m in hover (no target given)"

    drivers = drivers_for(x, perf, hover_t, prom_high)
    excluded = ["Engine / exhaust noise (electric only in Spiral 1)", "VTOL transition and fixed-wing modes",
                "Laminar vortex-shedding tones", "Blade-vortex interaction in fast descent"]

    return {
        "status": "ok",
        "engine_version": ENGINE_VERSION,
        "source_was_mock": False,
        "computed_ms": round((time.perf_counter() - t0) * 1000, 1),
        "verdict": verdict,
        "verdict_hover": v_h,
        "verdict_cruise": v_c,
        "headline": headline,
        "target_dba": x["target"],
        "target_distance_m": td,
        "hover": {"lamax_dba": round(hover_level, 1), "laeq_dba": round(hover_level, 1),
                  "worst_angle_deg": hover_t["theta_deg"], "breakdown_pct": hover_t["breakdown_pct"],
                  "parts_dba": hover_t["parts_dba"], "spectrum": hover_t["spectrum"], "tones": hover_t["tones"],
                  "tonal_prominence_db": prom, "tonal_prominent": prom_high},
        "cruise": {"lamax_dba": round(cruise_t["LA"], 1), "breakdown_pct": cruise_t["breakdown_pct"],
                   "parts_dba": cruise_t["parts_dba"], "flyover_sel_dba": sel, "altitude_m": h},
        "sound_power_lwa_db": round(lwa, 1),
        "levels_by_distance": _levels_table(x, perf),
        "performance": {
            "hover_rpm": round(perf["rpm"]), "cruise_rpm": round(perf["cruise"]["rpm"]),
            "tip_speed_ms": round(perf["tip_speed"], 1), "tip_mach": round(perf["tip_mach"], 3),
            "advancing_tip_mach_cruise": round(perf["cruise"]["advancing_tip_mach"], 3),
            "bpf_hz": round(perf["bpf_hz"], 1), "disk_loading_n_m2": round(perf["disk_loading"], 1),
            "thrust_to_weight": round(perf["thrust_to_weight"], 2), "rpm_max_est": round(perf["rpm_max"]),
            "hover_power_w": round(perf["hover_power_total_w"]), "cruise_tilt_deg": round(perf["cruise"]["tilt_deg"], 1),
        },
        "drivers": drivers,
        "warnings": warnings,
        "inputs_resolved": {
            "take_off_mass_kg": x["mass"], "rotor_count": x["n_rot"], "prop_diameter_m": round(x["D"], 4),
            "blade_count": x["B"], "motor_kv": x["kv"], "battery_voltage": round(x["volt"], 2),
            "cruise_speed_ms": round(x["Vc"], 2), "pitch_ratio": round(x["pitch_ratio"], 3),
            "arm_clearance_ratio": x["clearance"], "rotor_spacing_m": x["spacing"],
            "altitude_agl_m": x["altitude"], "temperature_c": x["temp_c"], "humidity_pct": x["rh"],
            "ground_type": x["ground"], "environment": x["environment"],
        },
        "provenance": x["provenance"],
        "assumptions": x["assumptions"],
        "excluded_sources": excluded,
        "confidence_score": confidence_for(x),
        "accuracy_note": "Early-stage noise estimate, about +/-5 dB. Not a measured or certified value.",
        "models": ["momentum theory + empirical CT", "Gutin steady loading", "empirical unsteady loading (low confidence)",
                   "BPM TBL-TE + tip vortex", "empirical motor", "ISO 9613-1 absorption", "IEC 61672 A-weighting"],
    }


def _prop_mass_g(D_m, B):
    D_in = D_m / 0.0254
    return 0.14 * D_in * D_in * (B / 2.0)


def evaluate_design(payload: dict) -> dict:
    """
    What-if evaluation for Tab 4 sliders and the Noise Fix agent tool.
    payload = {"inputs": <same as noise_check>, "changes": {"prop_diameter_in", "blade_count",
               "hover_rpm" | "tip_speed_ms", "rotor_spacing_m", "arm_clearance_ratio"}}
    Trade-offs are recomputed for the whole combined design every call.
    """
    t0 = time.perf_counter()
    base_in = dict(payload.get("inputs") or {})
    ch = payload.get("changes") or {}
    xb = resolve_inputs(base_in)
    pb = performance(xb)

    mod_in = dict(base_in)
    if ch.get("prop_diameter_in") not in (None, ""):
        mod_in["prop_diameter"] = float(ch["prop_diameter_in"])
        mod_in["prop_diameter_unit"] = "in"
        # keep pitch ratio constant when diameter changes
        mod_in["prop_pitch_in"] = xb["pitch_ratio"] * float(ch["prop_diameter_in"])
    if ch.get("blade_count") not in (None, ""):
        mod_in["blade_count"] = int(ch["blade_count"])
    for k in ("rotor_spacing_m", "arm_clearance_ratio"):
        if ch.get(k) not in (None, ""):
            mod_in[k] = float(ch[k])
    mod_in.pop("hover_rpm", None) if any(k in ch for k in ("prop_diameter_in", "blade_count")) else None
    xm_pre = resolve_inputs(mod_in)
    dmass_g = xb["n_rot"] * (_prop_mass_g(xm_pre["D"], xm_pre["B"]) - _prop_mass_g(xb["D"], xb["B"]))
    mod_in["take_off_mass_kg"] = xb["mass"] + dmass_g / 1000.0
    xm = resolve_inputs(mod_in)

    rpm_override = None
    if ch.get("hover_rpm") not in (None, ""):
        rpm_override = float(ch["hover_rpm"])
    elif ch.get("tip_speed_ms") not in (None, ""):
        rpm_override = float(ch["tip_speed_ms"]) / (math.pi * xm["D"]) * 60.0
    pm = performance(xm, rpm_override=rpm_override)

    warnings = []
    ipr = pm.get("implied_pitch_ratio")
    if ipr is not None and ipr > 1.0:
        warnings.append(f"Not enough thrust to hover at this RPM without an impractical blade pitch (pitch/diameter {ipr:.2f}).")
    elif ipr is not None and ipr < 0.2:
        warnings.append(f"RPM is higher than needed; blade pitch would be unusually flat (pitch/diameter {ipr:.2f}).")
    if pm["thrust_to_weight"] < 1.0:
        warnings.append("Motor/battery cannot reach the RPM needed: thrust-to-weight below 1.")
    elif pm["thrust_to_weight"] < 1.6:
        warnings.append(f"Low thrust margin (thrust-to-weight {pm['thrust_to_weight']:.2f}).")
    if xm["spacing"] and xm["D"] > 0.98 * xm["spacing"]:
        warnings.append("Propellers would overlap at this diameter and rotor spacing.")
    if pm["tip_mach"] > 0.6:
        warnings.append("Tip Mach above 0.6.")

    td = xb["target_dist"]
    Lb = field_at(xb, pb, td, "hover")["LA"]
    fm_ = field_at(xm, pm, td, "hover")
    Lm = fm_["LA"]
    Pb, Pm = pb["hover_power_total_w"], pm["hover_power_total_w"]
    eff_b = xb["mass"] * 1000 / Pb
    eff_m = xm["mass"] * 1000 / Pm
    prom, prom_high = tonal_prominence(fm_["spectrum"], pm["bpf_hz"], xb["environment"])
    target = xb["target"]
    return {
        "status": "ok",
        "engine_version": ENGINE_VERSION,
        "source_was_mock": False,
        "computed_ms": round((time.perf_counter() - t0) * 1000, 1),
        "baseline_dba": round(Lb, 1),
        "predicted_dba": round(Lm, 1),
        "delta_db": round(Lm - Lb, 1),
        "verdict": verdict_for(Lm, target, prom_high),
        "target_dba": target,
        "target_distance_m": td,
        "breakdown_pct": fm_["breakdown_pct"],
        "design": {"prop_diameter_in": round(xm["D"] / 0.0254, 2), "blade_count": xm["B"],
                   "hover_rpm": round(pm["rpm"]), "tip_speed_ms": round(pm["tip_speed"], 1),
                   "tip_mach": round(pm["tip_mach"], 3), "rotor_spacing_m": xm["spacing"],
                   "arm_clearance_ratio": xm["clearance"], "take_off_mass_kg": round(xm["mass"], 3)},
        "tradeoffs": {
            "added_mass_g": round(dmass_g, 1),
            "hover_power_w": round(Pm), "hover_power_change_pct": round(100 * (Pm / Pb - 1), 1),
            "flight_time_change_pct": round(100 * (Pb / Pm - 1), 1),
            "efficiency_g_per_w": round(eff_m, 2), "efficiency_change_pct": round(100 * (eff_m / eff_b - 1), 1),
            "thrust_to_weight": round(pm["thrust_to_weight"], 2),
        },
        "warnings": warnings,
        "implied_pitch_ratio": round(ipr, 2) if ipr is not None else None,
        "feasible": not any(w.startswith(("Not enough thrust", "Motor/battery", "Propellers would overlap")) for w in warnings),
    }


def lever_ranges(payload: dict) -> dict:
    x = resolve_inputs(payload)
    p = performance(x)
    d_in = x["D"] / 0.0254
    d_max = d_in * 1.35
    if x["spacing"]:
        d_max = min(d_max, 0.95 * x["spacing"] / 0.0254)
    return {
        "status": "ok",
        "levers": {
            "prop_diameter_in": {"min": round(d_in * 0.8, 1), "max": round(max(d_max, d_in), 1), "step": 0.5,
                                 "current": round(d_in, 1)},
            "blade_count": {"min": 2, "max": 6, "step": 1, "current": x["B"]},
            "hover_rpm": {"min": round(p["rpm"] * 0.6), "max": round(p["rpm_max"]), "step": 50,
                          "current": round(p["rpm"])},
            "rotor_spacing_m": {"min": round(x["D"] * 1.02, 3), "max": round(max(x["D"] * 2.5, (x["spacing"] or 0)), 3),
                                "step": 0.005, "current": x["spacing"]},
            "arm_clearance_ratio": {"min": 0.05, "max": 0.5, "step": 0.01, "current": x["clearance"]},
        },
    }


FUNCTIONS = {
    "noise_check": noise_check,
    "evaluate_design": evaluate_design,
    "lever_ranges": lever_ranges,
}


def handle(function: str, payload: dict) -> dict:
    fn = FUNCTIONS.get(function)
    if fn is None:
        return {"status": "error", "error": "unknown_function", "message": f"Unknown function '{function}'",
                "available": sorted(FUNCTIONS)}
    try:
        return fn(payload or {})
    except InputError as e:
        return {"status": "error", "error": "invalid_input", "fields": e.errors, "message": str(e)}
