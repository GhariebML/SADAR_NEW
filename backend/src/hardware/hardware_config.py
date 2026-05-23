"""Hardware configuration models."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class SDRConfig:
    sample_rate: int = 2_400_000
    center_frequency: float = 2_400_000_000.0
    gain: str | float = "auto"
    device_index: int = 0
