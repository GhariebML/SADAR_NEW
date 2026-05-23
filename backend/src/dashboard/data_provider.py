"""
data_provider.py
----------------
Centralized cached API data layer for SADAR Dashboard.
"""
from __future__ import annotations

import streamlit as st
import requests
import os
import numpy as np
from concurrent.futures import ThreadPoolExecutor, as_completed

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000") + "/api/v1"

_session = requests.Session()
_session.headers.update({"Connection": "keep-alive"})


# ════════════════════════════════════════════════════════════
# 🗺️ STATIONS & SIMULATION (من live_map.py)
# ════════════════════════════════════════════════════════════

SDR_STATIONS = {
    "SIM-SDR-1": {"lat": 30.0444, "lon": 31.2357, "name": "Cairo Station"},
    "SIM-SDR-2": {"lat": 31.2001, "lon": 29.9187, "name": "Alexandria Station"},
    "SIM-SDR-3": {"lat": 30.0131, "lon": 31.2089, "name": "Giza Station"},
    "SDR-01":    {"lat": 30.0444, "lon": 31.2357, "name": "Main Station"},
    "SDR":       {"lat": 30.0444, "lon": 31.2357, "name": "Default Station"},
}


def _get_station(source: str) -> dict:
    """يحدد المحطة بناءً على مصدر الإشارة"""
    for key, station in SDR_STATIONS.items():
        if key.lower() in source.lower():
            return station
    return SDR_STATIONS["SDR"]


def _simulate_signal_source(station_lat, station_lon, frequency_mhz, signal_id, label):
    """يحاكي مصدر الإشارة والاتجاه"""
    rng = np.random.default_rng(seed=int(signal_id) % 1000)
    angle = (frequency_mhz * 7.3) % 360 if frequency_mhz else rng.uniform(0, 360)
    distance = rng.uniform(0.1, 0.5) if label == "Drone" else rng.uniform(0.3, 1.2)
    rad = np.radians(angle)
    return station_lat + distance * np.cos(rad), station_lon + distance * np.sin(rad), angle


def _compass(angle: float) -> str:
    """يحول الزاوية لاتجاه بوصلة"""
    return ["N","NE","E","SE","S","SW","W","NW"][int((angle+22.5)//45) % 8]


# ════════════════════════════════════════════════════════════
# 🛠️ HELPERS
# ════════════════════════════════════════════════════════════

def _fetch(url: str, timeout: float = 5.0) -> dict | list:
    try:
        return _session.get(url, timeout=timeout).json()
    except Exception:
        return {}


def _normalize_signal(sig: dict) -> dict:
    """
    ✅ يوحّد اسم التردد: frequency → frequency_mhz
    """
    if "frequency" in sig and "frequency_mhz" not in sig:
        sig["frequency_mhz"] = sig["frequency"]
    return sig


def _enrich_signal(sig: dict) -> dict:
    """
    ✅ يضيف station, direction, strength للإشارة
    — بيستخدم نفس منطق live_map.py
    """
    sig = _normalize_signal(sig)
    
    source = str(sig.get("source", "SDR"))
    station = _get_station(source)
    freq = sig.get("frequency_mhz") or sig.get("frequency")
    signal_id = sig.get("id", 1)
    label = sig.get("label", "Normal")
    conf = float(sig.get("confidence", 0))
    
    # محاكاة الاتجاه (نفس live_map.py)
    _, _, angle = _simulate_signal_source(
        station["lat"], station["lon"], freq, signal_id, label
    )
    
    # ✅ إضافة الحقول المفقودة
    sig["station"] = station["name"]
    sig["direction"] = f"{angle:.0f}° ({_compass(angle)})"
    sig["strength"] = conf * 100  # أو من SNR لو موجود
    
    return sig


# ════════════════════════════════════════════════════════════
# 📊 DATA FETCHERS
# ════════════════════════════════════════════════════════════

@st.cache_data(ttl=3, show_spinner=False)
def get_all_data(limit: int = 20) -> dict:
    """
    Fetch all API data in parallel — TTL=3s عشان يلحق مع المحاكاة.
    """
    urls = {
        "statistics":  f"{API_BASE_URL}/statistics",
        "alerts":      f"{API_BASE_URL}/alerts",
        "predictions": f"{API_BASE_URL}/predictions?limit={limit}",
        "health":      f"{API_BASE_URL}/health",
    }

    results: dict = {}
    with ThreadPoolExecutor(max_workers=4) as executor:
        future_to_key = {executor.submit(_fetch, url): key for key, url in urls.items()}
        for future in as_completed(future_to_key):
            key = future_to_key[future]
            try:
                results[key] = future.result()
            except Exception:
                results[key] = {}

    stats      = results.get("statistics", {})
    alerts_raw = results.get("alerts",     [])
    preds_raw  = results.get("predictions",{})
    health_raw = results.get("health",     {})

    if isinstance(preds_raw, dict):
        signals = [_enrich_signal(s) for s in preds_raw.get("signals", [])]
    elif isinstance(preds_raw, list):
        signals = [_enrich_signal(s) for s in preds_raw]
    else:
        signals = []

    return {
        "api_ok":        health_raw.get("status") == "ok",
        "total_signals": stats.get("total_signals", 0),
        "alert_count":   stats.get("alert_count",   0),
        "label_counts":  stats.get("label_counts",  {}),
        "threshold":     stats.get("alert_threshold", 0.75),
        "alerts":        alerts_raw if isinstance(alerts_raw, list) else [],
        "signals":       signals,
        "stats":         stats,
    }


@st.cache_data(ttl=3, show_spinner=False)
def get_predictions_filtered(limit: int = 50, label: str = "All") -> list:
    """
    ✅ limit=50 بدل 200 — بيجيب آخر 50 (الأحدث)
    ✅ TTL=3s — بيتحدث كل 3 ثواني
    ✅ _enrich_signal — يضيف station, direction, strength
    """
    try:
        url = f"{API_BASE_URL}/predictions?limit={limit}"
        if label != "All":
            url += f"&label={label}"
        resp = _session.get(url, timeout=5.0).json()
        if isinstance(resp, dict):
            return [_enrich_signal(s) for s in resp.get("signals", [])]
        return []
    except Exception:
        return []