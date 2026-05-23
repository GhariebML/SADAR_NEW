"""Visualization helpers for SADAR reports."""

from __future__ import annotations


def ascii_confidence_bar(confidence: float, width: int = 24) -> str:
    confidence = max(0.0, min(float(confidence), 1.0))
    filled = round(confidence * width)
    return "█" * filled + "░" * (width - filled) + f" {confidence:.1%}"
