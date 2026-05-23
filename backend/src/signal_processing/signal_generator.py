"""Synthetic RF signal fixtures for demos and tests."""

from __future__ import annotations

import numpy as np


def generate_iq_tone(samples: int = 1024, frequency: float = 0.05, noise: float = 0.01) -> np.ndarray:
    """Generate a simple complex tone represented as I/Q pairs."""
    t = np.arange(samples, dtype=np.float32)
    i = np.cos(2 * np.pi * frequency * t)
    q = np.sin(2 * np.pi * frequency * t)
    iq = np.stack([i, q], axis=1)
    if noise:
        iq += np.random.default_rng(42).normal(0, noise, iq.shape)
    return iq.astype(np.float32)
