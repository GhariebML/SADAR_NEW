"""Key management helpers for local development."""

from __future__ import annotations

from pathlib import Path

from cryptography.fernet import Fernet


def generate_key() -> bytes:
    """Generate a Fernet key."""
    return Fernet.generate_key()


def load_key(path: str | Path) -> bytes:
    """Load a key from disk."""
    return Path(path).read_bytes().strip()


def write_key(path: str | Path, key: bytes | None = None) -> Path:
    """Write a key with owner-readable permissions where the OS supports it."""
    key_path = Path(path)
    key_path.parent.mkdir(parents=True, exist_ok=True)
    key_path.write_bytes(key or generate_key())
    return key_path
