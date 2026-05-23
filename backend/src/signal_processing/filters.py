"""Basic RF signal filters."""

from __future__ import annotations

import numpy as np
from scipy.signal import butter, sosfilt


def bandpass_filter(samples: np.ndarray, low: float, high: float, sample_rate: float, order: int = 4) -> np.ndarray:
    """Apply a Butterworth band-pass filter to a 1-D signal."""
    if not 0 < low < high < sample_rate / 2:
        raise ValueError("Expected 0 < low < high < Nyquist")
    sos = butter(order, [low, high], btype="bandpass", fs=sample_rate, output="sos")
    return sosfilt(sos, samples)
