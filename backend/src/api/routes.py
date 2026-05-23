"""
src/api/routes.py
-----------------
v3.0 — PyTorch Ensemble + Open Set Detection + Smart Alert
"""

import base64
import io
import time
import logging
from datetime import datetime
from typing import Optional, Any

import numpy as np
from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field, field_validator
from PIL import Image

from src.database.crud import (
    add_signal, get_all_signals, get_signals_paginated,
    get_signals_filtered, get_all_alerts, auto_create_alert,
    get_alert_threshold, log_action,
)
from src.api.websocket import broadcast_alert
from src.alerting.gmail_notifier import send_gmail_alert
from src.ai_model.predict import predict_single

logger = logging.getLogger("spectrum.routes")
router = APIRouter()

MODEL_VERSION = "ensemble-v3.0-pytorch"


# ─────────────────────────────────────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

class SignalInput(BaseModel):
    image_base64: Optional[str]         = Field(None)
    spectrogram:  Optional[list[Any]]   = Field(None)
    features:     Optional[list[float]] = Field(None, min_length=1)
    frequency:    Optional[float]       = Field(None, ge=0)
    snr:          Optional[float]       = Field(None)
    source:       str                   = Field("SDR")
    alert_type:   str                   = Field("email")
    location:     str                   = Field("Unknown")
    station:      Optional[str]         = Field(None)
    direction:    Optional[str]         = Field(None)
    strength:     Optional[float]       = Field(None)
    lat:          Optional[float]       = Field(None)
    lng:          Optional[float]       = Field(None)

    @field_validator("alert_type")
    @classmethod
    def validate_alert_type(cls, v):
        allowed = {"email", "whatsapp", "sound"}
        if v not in allowed:
            raise ValueError(f"alert_type must be one of {allowed}")
        return v

    @field_validator("image_base64")
    @classmethod
    def strip_data_url(cls, v):
        if v and "," in v and v.strip().lower().startswith("data:"):
            return v.split(",", 1)[1]
        return v


class PredictionResponse(BaseModel):
    signal_id:         int
    label:             str
    confidence:        float
    threat_score:      int
    threat_level:      str
    is_unknown:        bool
    energy_score:      float
    inference_time_ms: int
    alert_triggered:   bool
    alert_id:          Optional[int]
    timestamp:         str
    model_version:     str


class PaginatedSignals(BaseModel):
    total:   int
    page:    int
    limit:   int
    signals: list[dict]


class StatisticsResponse(BaseModel):
    total_signals:   int
    label_counts:    dict[str, int]
    alert_count:     int
    alert_threshold: float


# ─────────────────────────────────────────────────────────────────────────────
# INFERENCE HELPER
# ─────────────────────────────────────────────────────────────────────────────

def _prepare_image(payload: SignalInput) -> Image.Image:
    provided = [
        payload.image_base64 is not None,
        payload.spectrogram  is not None,
        payload.features     is not None,
    ]
    if sum(provided) != 1:
        raise ValueError("Provide exactly one of: image_base64, spectrogram, features")

    if payload.image_base64 is not None:
        raw = base64.b64decode(payload.image_base64)
        return Image.open(io.BytesIO(raw)).convert("RGB")

    if payload.spectrogram is not None:
        arr = np.asarray(payload.spectrogram, dtype=np.float32)
        if arr.ndim == 2:
            arr = np.stack([arr] * 3, axis=-1)
        arr = np.clip(arr, 0, 255).astype(np.uint8)
        return Image.fromarray(arr).convert("RGB")

    arr = np.asarray(payload.features, dtype=np.float32)
    side = int(np.sqrt(arr.size // 3))
    arr = arr[:side * side * 3].reshape(side, side, 3)
    arr = np.clip(arr, 0, 255).astype(np.uint8)
    return Image.fromarray(arr).convert("RGB")


def _alert_level_to_threat_score(alert: dict) -> int:
    mapping = {
        "DANGER":  95,
        "ALERT":   85,
        "WARNING": 65,
        "CAUTION": 45,
        "WEAK":    25,
        "UNKNOWN": 50,
        "CLEAR":   5,
    }
    return mapping.get(alert.get("level", "CLEAR"), 5)


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


@router.post("/predict", response_model=PredictionResponse, tags=["Inference"])
async def predict(payload: SignalInput, request: Request):

    try:
        image = _prepare_image(payload)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    start = time.perf_counter()
    try:
        result = predict_single(image, return_alert=True)
    except Exception as e:
        logger.error(f"❌ Inference error: {e}")
        raise HTTPException(status_code=500, detail=f"Inference failed: {e}")

    inference_time_ms = int((time.perf_counter() - start) * 1000)

    label      = result["class_name"]
    confidence = result["confidence"]
    is_unknown = result["is_unknown"]
    energy     = result["energy_score"]
    alert      = result["alert"]

    threat_score = _alert_level_to_threat_score(alert)
    threat_level = alert.get("level", "CLEAR").lower()
    should_alert = alert.get("action") in ("IMMEDIATE_ALERT", "WARNING")
    should_email = alert.get("action") == "IMMEDIATE_ALERT"

    logger.info(
        f"🤖 {label} | conf={confidence:.2%} | "
        f"energy={energy:.3f} | unknown={is_unknown} | "
        f"alert={alert.get('icon','')} {alert.get('level','')}"
    )

    signal_id = add_signal(
        label             = label,
        confidence        = confidence,
        frequency         = payload.frequency,
        snr               = payload.snr,
        source            = payload.source,
        inference_time_ms = inference_time_ms,
        model_version     = MODEL_VERSION,
        station           = payload.station,
        direction         = payload.direction,
        strength          = payload.strength,
        lat               = payload.lat,
        lng               = payload.lng,
    )
    if signal_id is None:
        raise HTTPException(status_code=500, detail="Failed to save signal.")

    alert_id:      Optional[int] = None
    alert_triggered              = False

    if should_alert:
        alert_id = auto_create_alert(
            signal_id  = signal_id,
            alert_type = payload.alert_type,
            location   = payload.location,
        )
        alert_triggered = alert_id is not None

        if alert_triggered:
            await broadcast_alert({
                "alert_id":     alert_id,
                "signal_id":    signal_id,
                "label":        label,
                "confidence":   round(confidence, 4),
                "threat_score": threat_score,
                "threat_level": threat_level,
                "is_unknown":   is_unknown,
                "alert_icon":   alert.get("icon", ""),
                "alert_msg":    alert.get("message", ""),
                "location":     payload.location,
                "timestamp":    datetime.now().isoformat(),
            })

            if should_email:
                try:
                    send_gmail_alert({
                        "label":        label,
                        "confidence":   confidence,
                        "threat_score": threat_score,
                        "threat_level": threat_level,
                        "is_unknown":   is_unknown,
                        "frequency":    payload.frequency,
                        "snr":          payload.snr,
                        "station":      payload.station,
                        "source":       payload.source,
                        "timestamp":    datetime.now().isoformat(),
                    })
                    logger.info(f"📧 Email sent ✅")
                except Exception as e:
                    logger.error(f"❌ Email error: {e}")

    log_action(
        action  = "PREDICT",
        details = (
            f"signal_id={signal_id} label={label} "
            f"confidence={confidence:.4f} "
            f"threat_score={threat_score} "
            f"threat_level={threat_level} "
            f"unknown={is_unknown} "
            f"alert={alert_triggered}"
        ),
    )

    return PredictionResponse(
        signal_id         = signal_id,
        label             = label,
        confidence        = round(confidence, 4),
        threat_score      = threat_score,
        threat_level      = threat_level,
        is_unknown        = is_unknown,
        energy_score      = round(energy, 4),
        inference_time_ms = inference_time_ms,
        alert_triggered   = alert_triggered,
        alert_id          = alert_id,
        timestamp         = datetime.now().isoformat(),
        model_version     = MODEL_VERSION,
    )


@router.get("/predictions", response_model=PaginatedSignals, tags=["Signals"])
async def get_predictions(
    label:  Optional[str] = Query(None),
    limit:  int           = Query(100, ge=1, le=1000),
    offset: int           = Query(0,   ge=0),
):
    signals = (get_signals_filtered(label=label, limit=limit)
               if label else get_signals_paginated(limit=limit, offset=offset))

    return PaginatedSignals(
        total   = len(signals),
        page    = (offset // limit) + 1,
        limit   = limit,
        signals = signals,
    )


@router.get("/statistics", response_model=StatisticsResponse, tags=["Analytics"])
async def get_statistics():
    all_signals = get_all_signals()
    all_alerts  = get_all_alerts(decrypt_fields=False)
    threshold   = get_alert_threshold()

    label_counts: dict[str, int] = {}
    for sig in all_signals:
        lbl = sig.get("label", "Unknown")
        label_counts[lbl] = label_counts.get(lbl, 0) + 1

    return StatisticsResponse(
        total_signals   = len(all_signals),
        label_counts    = label_counts,
        alert_count     = len(all_alerts),
        alert_threshold = threshold,
    )


@router.get("/alerts", tags=["Alerts"])
async def get_alerts():
    return get_all_alerts(decrypt_fields=True)