"""
src/api/mock_routes.py  (v2.1)
- ✅ المحطة = Cairo Station (مش SDR-1)
- ✅ ثقة الموديل = الثقة الفعلية (مش ثابتة)
- ✅ Threat Score = محسوب من الثقة الفعلية (مش ثابت)
"""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from src.database.crud import add_signal, auto_create_alert
from src.api.websocket import broadcast_alert
from src.alerting.gmail_notifier import send_gmail_alert

logger      = logging.getLogger("spectrum.mock")
mock_router = APIRouter()

# ✅ إصلاح 1 — اسم المحطة الصح
SDR_NAME   = "Cairo Station"
SDR_SOURCE = "SIM-SDR-1"

THREAT_LEVEL = {"Drone": "danger", "Jamming": "alert"}


def _calc_threat_score(confidence: float, label: str) -> int:
    """
    ✅ إصلاح 2 — Threat Score محسوب من الثقة الفعلية
    مش ثابت على 90 و85
    Drone   → confidence × 100 (لأنه أعلى خطورة)
    Jamming → confidence × 95
    """
    if label == "Drone":
        return min(100, round(confidence * 100))
    elif label == "Jamming":
        return min(100, round(confidence * 95))
    return round(confidence * 80)


class MockSignalInput(BaseModel):
    label:      str
    confidence: float
    frequency:  Optional[float] = None
    snr:        Optional[float] = None
    strength:   Optional[float] = None
    direction:  Optional[str]   = None
    location:   Optional[str]   = "القاهرة"
    lat:        Optional[float] = None
    lng:        Optional[float] = None


@mock_router.post("/mock-signal", tags=["Mock"])
async def mock_signal(payload: MockSignalInput):

    # ── حفظ الإشارة ───────────────────────────────────────────
    signal_id = add_signal(
        label             = payload.label,
        confidence        = payload.confidence,
        frequency         = payload.frequency,
        snr               = payload.snr,
        source            = SDR_SOURCE,
        inference_time_ms = 1,
        model_version     = "mock-v2",
        station           = SDR_NAME,          # ✅ Cairo Station
        direction         = payload.direction,
        strength          = payload.strength,
        lat               = payload.lat,
        lng               = payload.lng,
    )

    alert_id        = None
    alert_triggered = False

    # ── Alert لو Drone أو Jamming وثقة >= 75% ─────────────────
    if payload.label in ("Drone", "Jamming") and payload.confidence >= 0.75:

        alert_id = auto_create_alert(
            signal_id  = signal_id,
            alert_type = "email",
            location   = payload.location or "القاهرة",
        )
        alert_triggered = alert_id is not None

        if alert_triggered:
            # ✅ إصلاح 2 — threat_score محسوب مش ثابت
            threat_score = _calc_threat_score(payload.confidence, payload.label)
            threat_level = THREAT_LEVEL.get(payload.label, "alert")

            # WebSocket broadcast
            await broadcast_alert({
                "alert_id":     alert_id,
                "signal_id":    signal_id,
                "label":        payload.label,
                "confidence":   round(payload.confidence, 4),
                "threat_score": threat_score,
                "threat_level": threat_level,
                "location":     payload.location,
                "station":      SDR_NAME,
                "timestamp":    datetime.now().isoformat(),
                "alert_type":   payload.label,
            })

            # Gmail
            try:
                send_gmail_alert({
                    "label":        payload.label,
                    # ✅ إصلاح 3 — confidence الفعلية مش ثابتة
                    "confidence":   payload.confidence,
                    "threat_score": threat_score,
                    "threat_level": threat_level,
                    "is_unknown":   False,
                    "energy_score": 0.0,
                    "frequency":    payload.frequency,
                    "snr":          payload.snr,
                    "strength":     payload.strength,
                    # ✅ إصلاح 1 — اسم المحطة الصح
                    "station":      SDR_NAME,
                    "direction":    payload.direction,
                    "source":       SDR_SOURCE,
                    "timestamp":    datetime.now().isoformat(),
                })
                logger.info(f"📧 Gmail sent — {payload.label} {payload.confidence:.1%}")
            except Exception as e:
                logger.error(f"❌ Gmail error: {e}")

        logger.info(
            f"🚨 {payload.label} | conf={payload.confidence:.1%} | "
            f"threat={_calc_threat_score(payload.confidence, payload.label)}% | "
            f"alert={'✅' if alert_triggered else '❌'}"
        )

    return {
        "signal_id":       signal_id,
        "label":           payload.label,
        "confidence":      payload.confidence,
        "station":         SDR_NAME,
        "source":          SDR_SOURCE,
        "alert_triggered": alert_triggered,
        "alert_id":        alert_id,
    }