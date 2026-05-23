"""Alert formatting helpers for SADAR."""

from __future__ import annotations

from typing import Any


def format_alert_payload(assessment: Any) -> dict[str, Any]:
    """Create a standard alert payload from a ThreatAssessment-like object."""
    evidence = getattr(assessment, "evidence", {})
    return {
        "event": "sadar_threat_alert",
        "level": getattr(assessment, "level", "unknown"),
        "score": getattr(assessment, "score", 0.0),
        "summary": getattr(assessment, "summary", ""),
        "label": evidence.get("label"),
        "confidence": evidence.get("confidence"),
        "location": evidence.get("location"),
        "source": evidence.get("source"),
        "timestamp": getattr(assessment, "timestamp", None),
    }
