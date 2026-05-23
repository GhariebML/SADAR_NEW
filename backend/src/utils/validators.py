"""Common validation helpers."""

from __future__ import annotations


def require_probability(value: float, name: str = "value") -> float:
    """Validate that a value is a probability in [0, 1]."""
    value = float(value)
    if not 0.0 <= value <= 1.0:
        raise ValueError(f"{name} must be between 0 and 1")
    return value
