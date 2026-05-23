"""Short-time Fourier transform helpers."""

from __future__ import annotations

import numpy as np
from scipy import signal


def compute_stft_spectrogram(iq_samples: np.ndarray, nfft: int = 256, hop_length: int = 128) -> np.ndarray:
    """Convert I/Q samples shaped ``(n, 2)`` into a magnitude spectrogram."""
    samples = np.asarray(iq_samples, dtype=np.float32)
    if samples.ndim != 2 or samples.shape[1] != 2:
        raise ValueError("iq_samples must have shape (n_samples, 2)")
    complex_signal = samples[:, 0] + 1j * samples[:, 1]
    _, _, zxx = signal.stft(complex_signal, fs=1.0, nperseg=nfft, noverlap=nfft - hop_length)
    return np.abs(zxx).astype(np.float32)
