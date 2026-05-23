"""Spectrogram image preparation helpers."""

from __future__ import annotations

import numpy as np
from PIL import Image


def normalize_to_uint8(spectrogram: np.ndarray) -> np.ndarray:
    """Normalize an arbitrary numeric spectrogram to uint8 range 0..255."""
    arr = np.asarray(spectrogram, dtype=np.float32)
    span = float(arr.max(initial=0) - arr.min(initial=0))
    if span <= 0:
        return np.zeros(arr.shape, dtype=np.uint8)
    scaled = (arr - arr.min()) / span
    return np.clip(scaled * 255, 0, 255).astype(np.uint8)


def to_rgb(spectrogram: np.ndarray, size: tuple[int, int] = (224, 224)) -> np.ndarray:
    """Convert a 2-D spectrogram to resized RGB image array."""
    gray = normalize_to_uint8(spectrogram)
    image = Image.fromarray(gray).convert("RGB").resize(size)
    return np.asarray(image, dtype=np.uint8)
