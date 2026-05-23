"""Encryption helpers built on Fernet."""

from __future__ import annotations

from cryptography.fernet import Fernet


def encrypt_text(value: str, key: bytes | str) -> str:
    """Encrypt a string and return a URL-safe token."""
    raw_key = key.encode() if isinstance(key, str) else key
    return Fernet(raw_key).encrypt(value.encode("utf-8")).decode("ascii")


def decrypt_text(token: str, key: bytes | str) -> str:
    """Decrypt a token created by ``encrypt_text``."""
    raw_key = key.encode() if isinstance(key, str) else key
    return Fernet(raw_key).decrypt(token.encode("ascii")).decode("utf-8")
