"""Spectrum helper tools for the SADAR AI agent."""

from __future__ import annotations

import numpy as np


def summarize_spectrum(values: list[float]) -> dict[str, float]:
    """Return simple descriptive statistics for a spectrum/vector."""
    arr = np.asarray(values, dtype=float)
    if arr.size == 0:
        return {"count": 0, "mean": 0.0, "std": 0.0, "max": 0.0, "min": 0.0}
    return {
        "count": float(arr.size),
        "mean": float(arr.mean()),
        "std": float(arr.std()),
        "max": float(arr.max()),
        "min": float(arr.min()),
    }
