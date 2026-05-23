"""High-level I/Q processing pipeline."""

from __future__ import annotations

import numpy as np

from .spectrogram import to_rgb
from .stft import compute_stft_spectrogram


def iq_to_model_image(iq_samples: np.ndarray, size: tuple[int, int] = (224, 224)) -> np.ndarray:
    """Convert I/Q samples to a model-ready RGB spectrogram image."""
    return to_rgb(compute_stft_spectrogram(iq_samples), size=size)
