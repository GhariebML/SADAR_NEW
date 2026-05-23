"""Helpers for encrypting/decrypting database fields."""

from __future__ import annotations

from src.utils.encryption import decrypt_text, encrypt_text


def encrypt_optional(value: str | None, key: bytes | str) -> str | None:
    return None if value is None else encrypt_text(value, key)


def decrypt_optional(value: str | None, key: bytes | str) -> str | None:
    return None if value is None else decrypt_text(value, key)
