"""Lightweight database record models used by tests and documentation."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class SignalRecord:
    id: int | None
    label: str
    confidence: float
    frequency: float | None = None
    snr: float | None = None
    source: str = "SDR"
    inference_time_ms: int = 0
    model_version: str = "unknown"
    timestamp: str | None = None


@dataclass(slots=True)
class AlertRecord:
    id: int | None
    signal_id: int
    alert_type: str
    status: str = "created"
    location: str = "Unknown"
    timestamp: str | None = None
