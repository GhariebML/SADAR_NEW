"""Key rotation helpers."""

from __future__ import annotations

from pathlib import Path

from .key_manager import generate_key, write_key


def rotate_key(path: str | Path) -> Path:
    """Generate and write a replacement key."""
    return write_key(path, generate_key())
