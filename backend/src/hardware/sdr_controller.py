"""Controller facade for SDR data acquisition."""

from __future__ import annotations

import numpy as np

from src.signal_processing.signal_generator import generate_iq_tone


class SDRController:
    """Provide live or simulated I/Q samples through one interface."""

    def __init__(self, simulated: bool = True):
        self.simulated = simulated

    def read_iq(self, samples: int = 1024) -> np.ndarray:
        if self.simulated:
            return generate_iq_tone(samples=samples)
        raise RuntimeError("Live SDR mode requires RTL-SDR integration and hardware configuration")
